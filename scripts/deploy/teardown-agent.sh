#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Teardown an Agent
#
# Safely removes an agent from the VPS:
#   1. Archives the agent's memory and config to /opt/clawstaff/backups/
#   2. Removes the agent's route from the Gateway config
#   3. Reloads the Gateway
#   4. Deletes the agent directory
#
# Usage:
#   ./teardown-agent.sh <agent_name>
#   ./teardown-agent.sh <agent_name> --no-backup   # skip backup (dangerous)
#
# Example:
#   ./teardown-agent.sh maya
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="/opt/clawstaff"
AGENTS_DIR="${BASE_DIR}/agents"
LOG_DIR="${BASE_DIR}/logs"
LOG_FILE="${LOG_DIR}/provisioning.log"
GATEWAY_CONFIG="${BASE_DIR}/gateway/openclaw.json"

# ─── Argument validation ────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <agent_name> [--no-backup]"
  exit 1
fi

AGENT_NAME="$1"
SKIP_BACKUP="${2:-}"
AGENT_DIR="${AGENTS_DIR}/${AGENT_NAME}"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

log() {
  local msg="[${TIMESTAMP}] [teardown] ${AGENT_NAME}: $1"
  echo "$msg"
  mkdir -p "${LOG_DIR}"
  echo "$msg" >> "${LOG_FILE}"
}

# ─── Pre-flight checks ─────────────────────────────────────

[[ -d "${AGENT_DIR}" ]] || { echo "ERROR: Agent directory '${AGENT_DIR}' not found"; exit 1; }

log "Starting teardown"

# ─── Step 1: Archive memory and config before deletion ──────

# Always backup unless explicitly told not to. Client memory is valuable
# and may be needed if the client re-subscribes or for dispute resolution.
if [[ "${SKIP_BACKUP}" != "--no-backup" ]]; then
  log "Backing up agent before teardown"
  "${SCRIPT_DIR}/backup-agent.sh" "${AGENT_NAME}"
  log "Backup complete"
else
  log "WARNING: Skipping backup (--no-backup flag set)"
fi

# ─── Step 2: Remove route from Gateway config ──────────────

log "Removing agent route from Gateway config"

if [[ -f "${GATEWAY_CONFIG}" ]]; then
  python3 <<PYEOF
import json

config_path = "${GATEWAY_CONFIG}"
with open(config_path, "r") as f:
    config = json.load(f)

if "routes" in config:
    before = len(config["routes"])
    config["routes"] = [r for r in config["routes"] if r.get("agent_name") != "${AGENT_NAME}"]
    after = len(config["routes"])
    if before != after:
        print("Removed route for ${AGENT_NAME}")
    else:
        print("No route found for ${AGENT_NAME} — nothing to remove")

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
PYEOF
else
  log "WARNING: Gateway config not found at ${GATEWAY_CONFIG}"
fi

# ─── Step 3: Reload the Gateway ────────────────────────────

log "Reloading Gateway"

if systemctl is-active --quiet openclaw-gateway 2>/dev/null; then
  systemctl reload openclaw-gateway 2>/dev/null || systemctl restart openclaw-gateway
  log "Gateway reloaded"
else
  log "Gateway is not running — no reload needed"
fi

# ─── Step 4: Delete the agent directory ─────────────────────

log "Removing agent directory: ${AGENT_DIR}"
rm -rf "${AGENT_DIR}"

# ─── Done ───────────────────────────────────────────────────

log "Teardown complete for ${AGENT_NAME}"
echo ""
echo "  Agent '${AGENT_NAME}' has been removed."
if [[ "${SKIP_BACKUP}" != "--no-backup" ]]; then
  echo "  Backup saved to: ${BASE_DIR}/backups/${AGENT_NAME}/"
fi
echo ""
