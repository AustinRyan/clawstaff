#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Provision a New Agent on the VPS
#
# Takes a locally-generated workspace (from onboard.ts / generate-workspace.ts)
# and deploys it as an isolated OpenClaw agent with Gateway routing.
#
# Usage:
#   ./provision-agent.sh <agent_name> <workspace_path> <client_id>
#
# Example:
#   ./provision-agent.sh maya ./workspaces/maya client_abc123
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="/opt/clawstaff"
AGENTS_DIR="${BASE_DIR}/agents"
LOG_DIR="${BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/provisioning.log"
GATEWAY_CONFIG="${BASE_DIR}/gateway/openclaw.json"

# ─── Argument validation ────────────────────────────────────

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <agent_name> <workspace_path> <client_id>"
  echo ""
  echo "  agent_name      Lowercase name for the agent (e.g. maya, cole)"
  echo "  workspace_path  Path to the generated workspace directory"
  echo "  client_id       Unique client identifier for billing/tracking"
  exit 1
fi

AGENT_NAME="$1"
WORKSPACE_PATH="$2"
CLIENT_ID="$3"
AGENT_DIR="${AGENTS_DIR}/${AGENT_NAME}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# ─── Helpers ────────────────────────────────────────────────

log() {
  local msg="[${TIMESTAMP}] [provision] ${AGENT_NAME}: $1"
  echo "$msg"
  # Log dir may not exist yet during pre-flight checks — write if possible
  if [[ -d "${LOG_DIR}" ]]; then
    echo "$msg" >> "${LOG_FILE}"
  fi
}

fail() {
  log "FAILED — $1"
  exit 1
}

# ─── Pre-flight checks ─────────────────────────────────────

# Ensure the workspace source exists
[[ -d "${WORKSPACE_PATH}" ]] || fail "Workspace path '${WORKSPACE_PATH}' does not exist"

# Ensure SOUL.md is present (minimum viable workspace)
[[ -f "${WORKSPACE_PATH}/SOUL.md" ]] || fail "No SOUL.md found in workspace — run onboard.ts first"

# Prevent overwriting an existing agent
[[ ! -d "${AGENT_DIR}" ]] || fail "Agent directory '${AGENT_DIR}' already exists. Teardown first or choose a different name."

# Ensure base directories exist
mkdir -p "${AGENTS_DIR}" "${LOG_DIR}"

log "Starting provisioning (client_id=${CLIENT_ID})"

# ─── Step 1: Create isolated agent directory ────────────────

log "Creating agent directory at ${AGENT_DIR}"
mkdir -p "${AGENT_DIR}"

# ─── Step 2: Copy workspace files into the agent directory ──

log "Copying workspace files from ${WORKSPACE_PATH}"
cp -r "${WORKSPACE_PATH}/"* "${AGENT_DIR}/"

# ─── Step 3: Set up the agent's memory directory ────────────

# OpenClaw expects a memory/ directory for daily logs + long-term memory.
# Initialize with an empty MEMORY.md so the agent has a clean slate.
log "Initializing memory directory"
mkdir -p "${AGENT_DIR}/memory"

if [[ ! -f "${AGENT_DIR}/MEMORY.md" ]]; then
  cat > "${AGENT_DIR}/MEMORY.md" <<'MEMEOF'
# Agent Memory

_Initialized by ClawStaff provisioning. This file accumulates long-term knowledge._
MEMEOF
fi

# Create SESSION-STATE.md and RECENT_CONTEXT.md if they don't exist
touch "${AGENT_DIR}/SESSION-STATE.md"
touch "${AGENT_DIR}/RECENT_CONTEXT.md"

# ─── Step 4: Generate openclaw.json for this agent ──────────

# Each agent gets its own openclaw.json that the Gateway references.
# This configures model routing, channel connections, and tool permissions.
log "Generating agent openclaw.json"

cat > "${AGENT_DIR}/openclaw.json" <<CFGEOF
{
  "agent_name": "${AGENT_NAME}",
  "client_id": "${CLIENT_ID}",
  "workspace": "${AGENT_DIR}",
  "model": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 4096
  },
  "memory": {
    "path": "${AGENT_DIR}/memory",
    "search_enabled": true
  },
  "heartbeat": {
    "enabled": true,
    "interval_minutes": 30
  },
  "channels": [],
  "tools": {
    "allowlist": []
  },
  "provisioned_at": "${TIMESTAMP}"
}
CFGEOF

# ─── Step 5: Install the skill stack for this agent's vertical ──

# The vertical is stored in the onboard config JSON. Read it to determine
# which clawhub skills to install.
log "Installing skill stack"

ONBOARD_CONFIG="${AGENT_DIR}/onboard-config.json"

if [[ -f "${ONBOARD_CONFIG}" ]]; then
  # Extract the vertical from the saved onboarding config
  VERTICAL=$(python3 -c "import json,sys; print(json.load(open('${ONBOARD_CONFIG}'))['vertical'])" 2>/dev/null || echo "")
else
  VERTICAL=""
fi

# Map verticals to their required clawhub skill slugs.
# These match the skill stacks defined in PROJECT_BRIEF.md per vertical template.
install_skills() {
  local skills=("$@")
  for skill in "${skills[@]}"; do
    log "  Installing skill: ${skill}"
    if ! clawhub install "${skill}" --workspace "${AGENT_DIR}" 2>&1; then
      log "  WARNING: Failed to install skill '${skill}' — continuing"
    fi
  done
}

case "${VERTICAL}" in
  restaurant)
    install_skills \
      "google-reviews" "yelp-monitor" "facebook-reviews" \
      "whatsapp" "gog" "summarize" "agent-browser"
    ;;
  realtor)
    install_skills \
      "whatsapp" "gog" "crm-memory" "tavily" "summarize"
    ;;
  fitness)
    install_skills \
      "whatsapp" "gog" "summarize" "cron-scheduler"
    ;;
  medical)
    install_skills \
      "whatsapp" "gog" "summarize" "cron-scheduler"
    ;;
  home-services)
    install_skills \
      "whatsapp" "gog" "google-reviews" "summarize" "tavily"
    ;;
  ecommerce)
    install_skills \
      "whatsapp" "gog" "agent-browser" "summarize" "shopify"
    ;;
  *)
    log "WARNING: Unknown or missing vertical '${VERTICAL}' — skipping skill installation"
    log "  Install skills manually: clawhub install <slug> --workspace ${AGENT_DIR}"
    ;;
esac

# ─── Step 6: Register agent route in the Gateway config ─────

# The Gateway's master openclaw.json maintains a routes array that maps
# channels/contacts to agent workspaces. We append this agent's route.
log "Registering agent route in Gateway config"

if [[ -f "${GATEWAY_CONFIG}" ]]; then
  # Use python3 to safely modify JSON (available on Ubuntu VPS)
  python3 <<PYEOF
import json, sys

config_path = "${GATEWAY_CONFIG}"
with open(config_path, "r") as f:
    config = json.load(f)

# Ensure routes array exists
if "routes" not in config:
    config["routes"] = []

# Check for duplicate
existing = [r for r in config["routes"] if r.get("agent_name") == "${AGENT_NAME}"]
if existing:
    print("Route already exists for ${AGENT_NAME} — skipping")
    sys.exit(0)

# Add the new route
config["routes"].append({
    "agent_name": "${AGENT_NAME}",
    "client_id": "${CLIENT_ID}",
    "workspace": "${AGENT_DIR}",
    "config": "${AGENT_DIR}/openclaw.json",
    "active": True
})

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)

print("Route registered for ${AGENT_NAME}")
PYEOF
else
  log "WARNING: Gateway config not found at ${GATEWAY_CONFIG}"
  log "  Create it manually or run: openclaw gateway init"
fi

# ─── Step 7: Restart/reload the Gateway ─────────────────────

# The Gateway runs as a systemd service. Reload picks up new routes
# without dropping existing connections.
log "Reloading Gateway to pick up new route"

if systemctl is-active --quiet openclaw-gateway 2>/dev/null; then
  # Prefer reload (graceful) over restart (drops connections)
  if systemctl reload openclaw-gateway 2>/dev/null; then
    log "Gateway reloaded successfully"
  else
    log "Reload not supported — restarting Gateway"
    systemctl restart openclaw-gateway
    log "Gateway restarted"
  fi
else
  log "WARNING: openclaw-gateway service is not running"
  log "  Start it with: systemctl start openclaw-gateway"
fi

# ─── Step 8: Health check ───────────────────────────────────

log "Running health check"

# Give the Gateway a moment to initialize the new route
sleep 2

if "${SCRIPT_DIR}/health-check.sh" "${AGENT_NAME}" 2>/dev/null; then
  log "Health check PASSED"
else
  log "WARNING: Health check failed — the agent may need manual verification"
  log "  Run: ${SCRIPT_DIR}/health-check.sh ${AGENT_NAME}"
fi

# ─── Step 9: Set file permissions ───────────────────────────

# Lock down the agent directory so only the openclaw user can access it.
# This provides isolation between agents on the same VPS.
log "Setting file permissions"

if id "openclaw" &>/dev/null; then
  chown -R openclaw:openclaw "${AGENT_DIR}"
  chmod -R 750 "${AGENT_DIR}"
else
  log "WARNING: 'openclaw' user not found — skipping permission setup"
  log "  Create it with: useradd -r -s /bin/false openclaw"
fi

# ─── Done ───────────────────────────────────────────────────

log "Provisioning complete"
echo ""
echo "  Agent:      ${AGENT_NAME}"
echo "  Client:     ${CLIENT_ID}"
echo "  Directory:  ${AGENT_DIR}"
echo "  Vertical:   ${VERTICAL:-unknown}"
echo "  Config:     ${AGENT_DIR}/openclaw.json"
echo ""
echo "  Next steps:"
echo "    1. Add channel credentials to ${AGENT_DIR}/openclaw.json"
echo "    2. Verify: ${SCRIPT_DIR}/health-check.sh ${AGENT_NAME}"
echo "    3. Monitor: tail -f ${LOG_FILE}"
echo ""
