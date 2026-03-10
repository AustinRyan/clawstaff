#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# ClawStaff Setup Script
# From git clone to talking to an AI agent in under 5 minutes.
#
# Usage:
#   bash scripts/setup.sh          # Interactive setup
#   bash scripts/setup.sh --help   # Show usage
#   npm run setup                  # Same thing via package.json
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'
ACCENT='\033[38;5;208m'  # #ff6b35 approximation (orange)

# ─── Helpers ──────────────────────────────────────────────────
info()    { printf "${CYAN}[info]${RESET}  %s\n" "$1"; }
success() { printf "${GREEN}[  ok]${RESET}  %s\n" "$1"; }
warn()    { printf "${YELLOW}[warn]${RESET}  %s\n" "$1"; }
fail()    { printf "${RED}[fail]${RESET}  %s\n" "$1"; }
step()    { printf "\n${ACCENT}${BOLD}── Step %s ──${RESET}\n" "$1"; }
ask()     { printf "${BOLD}%s${RESET}" "$1"; }

# Resolve the project root (one level up from scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"

CLAWSTAFF_HOME="$HOME/clawstaff"

# ─── Help ─────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<USAGE
${ACCENT}ClawStaff Setup${RESET}

  The complete first-run setup for ClawStaff. Handles Node.js
  verification, dependency installation, API key configuration,
  OpenClaw installation, gateway startup, and sample agent
  deployment.

${BOLD}Usage:${RESET}
  bash scripts/setup.sh       Interactive setup
  bash scripts/setup.sh -h    Show this help
  npm run setup                Run via package.json

${BOLD}What it does:${RESET}
  1. Verify Node.js 22+
  2. Install npm dependencies
  3. Configure API keys (.env.local)
  4. Install/verify OpenClaw
  5. Run OpenClaw onboarding (if needed)
  6. Create local directory structure
  7. Start the OpenClaw Gateway
  8. Deploy a sample restaurant agent
  9. Print next steps

${BOLD}Requirements:${RESET}
  - Node.js 22+ (https://nodejs.org)
  - A terminal with interactive input
  - An Anthropic API key (recommended) or other LLM provider key

USAGE
  exit 0
fi

# ─── Banner ───────────────────────────────────────────────────
clear 2>/dev/null || true
cat <<'BANNER'


     ██████╗██╗      █████╗ ██╗    ██╗███████╗████████╗ █████╗ ███████╗███████╗
    ██╔════╝██║     ██╔══██╗██║    ██║██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔════╝
    ██║     ██║     ███████║██║ █╗ ██║███████╗   ██║   ███████║█████╗  █████╗
    ██║     ██║     ██╔══██║██║███╗██║╚════██║   ██║   ██╔══██║██╔══╝  ██╔══╝
    ╚██████╗███████╗██║  ██║╚███╔███╔╝███████║   ██║   ██║  ██║██║     ██║
     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝

BANNER

printf "    ${ACCENT}AI Agent Staffing Framework${RESET}  ${DIM}built on OpenClaw${RESET}\n"
printf "    ${DIM}────────────────────────────────────────────────────────────${RESET}\n"
printf "    ${DIM}From clone to conversation in under 5 minutes.${RESET}\n\n"

# ─── 1. Check Node.js ────────────────────────────────────────
step "1/9 — Node.js"

if ! command -v node &>/dev/null; then
  fail "Node.js is not installed."
  printf "\n"
  printf "  Install Node.js 22+ using one of:\n"
  printf "    ${CYAN}nvm install 22${RESET}\n"
  printf "    ${CYAN}brew install node@22${RESET}\n"
  printf "    ${CYAN}https://nodejs.org${RESET}\n"
  printf "\n"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if (( NODE_MAJOR < 22 )); then
  fail "Node.js $NODE_VERSION found — version 22+ is required."
  printf "\n"
  printf "  Upgrade with:\n"
  printf "    ${CYAN}nvm install 22 && nvm use 22${RESET}\n"
  printf "    ${CYAN}brew upgrade node${RESET}\n"
  printf "\n"
  exit 1
fi

success "Node.js $NODE_VERSION"

# ─── 2. Install Dependencies ─────────────────────────────────
step "2/9 — Dependencies"

cd "$PROJECT_ROOT"

if [[ -d "node_modules" ]]; then
  success "node_modules already exists — skipping install"
else
  info "Installing npm dependencies..."
  if npm install --loglevel=error; then
    success "Dependencies installed"
  else
    fail "npm install failed. Check the output above."
    exit 1
  fi
fi

# ─── 3. API Key Configuration ────────────────────────────────
step "3/9 — API Keys"

# Helper: set a key in .env.local (append if missing, update if present)
set_env_var() {
  local key="$1"
  local value="$2"
  local file="$ENV_FILE"

  # Create the file if it doesn't exist
  touch "$file"

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # Key already exists — update in place
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    # Append the key
    echo "${key}=${value}" >> "$file"
  fi
}

# Helper: check if a key is already set (non-placeholder) in .env.local
has_env_var() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    local val
    val=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
    # Consider it "set" if it exists and isn't a placeholder
    if [[ -n "$val" && "$val" != *"..."* && "$val" != "sk_test_..." && "$val" != "pk_test_..." && "$val" != "whsec_..." && "$val" != "price_..." && "$val" != "moltbook_sk_..." ]]; then
      return 0
    fi
  fi
  return 1
}

# ── LLM Provider (Anthropic) ──
printf "\n"
info "ClawStaff agents need an LLM provider. Anthropic (Claude) is recommended."

if has_env_var "ANTHROPIC_API_KEY"; then
  EXISTING_KEY=$(grep "^ANTHROPIC_API_KEY=" "$ENV_FILE" | cut -d= -f2-)
  MASKED="${EXISTING_KEY:0:8}...${EXISTING_KEY: -4}"
  success "ANTHROPIC_API_KEY already configured ($MASKED)"
else
  printf "\n"
  ask "  Enter your Anthropic API key (starts with sk-ant-): "
  read -r ANTHROPIC_KEY

  if [[ -n "$ANTHROPIC_KEY" ]]; then
    set_env_var "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY"
    success "ANTHROPIC_API_KEY saved"
  else
    warn "Skipped — agents won't work without an LLM provider key."
    warn "You can add it later to .env.local: ANTHROPIC_API_KEY=sk-ant-..."
  fi
fi

# ── Moltbook (optional) ──
printf "\n"
info "Moltbook is the social reputation network for AI agents. (Optional)"

if has_env_var "MOLTBOOK_API_KEY"; then
  success "MOLTBOOK_API_KEY already configured"
else
  ask "  Do you have a Moltbook API key? [y/N]: "
  read -r HAS_MOLTBOOK

  if [[ "$HAS_MOLTBOOK" =~ ^[Yy] ]]; then
    ask "  Enter your Moltbook API key (starts with moltbook_sk_): "
    read -r MOLTBOOK_KEY

    if [[ -n "$MOLTBOOK_KEY" ]]; then
      set_env_var "MOLTBOOK_API_KEY" "$MOLTBOOK_KEY"
      success "MOLTBOOK_API_KEY saved"
    else
      warn "Skipped — dashboard will use mock Moltbook data."
    fi
  else
    info "Skipped — the dashboard will show mock Moltbook data."
  fi
fi

# ── Scout / Google Places (optional) ──
printf "\n"
info "Scout uses Google Places API to discover local prospects. (Optional)"

if has_env_var "GOOGLE_PLACES_API_KEY"; then
  success "GOOGLE_PLACES_API_KEY already configured"
else
  ask "  Do you want to enable Scout (prospect discovery)? [y/N]: "
  read -r HAS_SCOUT

  if [[ "$HAS_SCOUT" =~ ^[Yy] ]]; then
    ask "  Enter your Google Places API key: "
    read -r PLACES_KEY

    if [[ -n "$PLACES_KEY" ]]; then
      set_env_var "GOOGLE_PLACES_API_KEY" "$PLACES_KEY"
      success "GOOGLE_PLACES_API_KEY saved"
    else
      warn "Skipped — Scout features will be disabled."
    fi
  else
    info "Skipped — you can enable Scout later in .env.local."
  fi
fi

# ── Defaults ──
printf "\n"
info "Setting defaults..."

set_env_var "AGENT_DATA_PATH" "$CLAWSTAFF_HOME/agents"
set_env_var "OPENCLAW_GATEWAY_URL" "ws://127.0.0.1:18789"
set_env_var "NEXT_PUBLIC_APP_URL" "http://localhost:3000"
set_env_var "NEXT_PUBLIC_DEMO_MODE" "false"

success ".env.local configured at $ENV_FILE"

# ─── 4. OpenClaw Installation ────────────────────────────────
step "4/9 — OpenClaw CLI"

if command -v openclaw &>/dev/null; then
  OC_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  success "OpenClaw is installed ($OC_VERSION)"
else
  warn "OpenClaw CLI not found."
  printf "\n"
  ask "  Install OpenClaw globally via npm? [Y/n]: "
  read -r INSTALL_OC

  if [[ ! "$INSTALL_OC" =~ ^[Nn] ]]; then
    info "Installing openclaw..."
    if npm install -g openclaw 2>/dev/null; then
      OC_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
      success "OpenClaw installed ($OC_VERSION)"
    else
      fail "Could not install OpenClaw globally."
      warn "Try: sudo npm install -g openclaw"
      warn "Or install manually: https://github.com/openclaw/openclaw"
      warn "Continuing setup — you can install OpenClaw later."
    fi
  else
    warn "Skipped — you'll need OpenClaw to deploy and talk to agents."
    warn "Install later: npm install -g openclaw"
  fi
fi

# ─── 5. OpenClaw Onboarding ──────────────────────────────────
step "5/9 — OpenClaw Configuration"

OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"

if [[ -f "$OPENCLAW_CONFIG" ]]; then
  success "OpenClaw already configured ($OPENCLAW_CONFIG)"
else
  if command -v openclaw &>/dev/null; then
    info "OpenClaw needs initial configuration (LLM provider, etc.)."
    printf "\n"
    ask "  Run OpenClaw onboarding now? [Y/n]: "
    read -r RUN_ONBOARD

    if [[ ! "$RUN_ONBOARD" =~ ^[Nn] ]]; then
      printf "\n"
      info "Starting OpenClaw onboarding — follow the interactive prompts below."
      printf "  ${DIM}─────────────────────────────────────────────${RESET}\n"
      printf "\n"

      # Run interactively — inherits stdin/stdout
      if openclaw onboard; then
        printf "\n"
        success "OpenClaw onboarding complete"
      else
        printf "\n"
        warn "Onboarding exited with an error. You can re-run it later:"
        warn "  openclaw onboard"
      fi
    else
      warn "Skipped — run 'openclaw onboard' before deploying agents."
    fi
  else
    warn "OpenClaw not installed — skipping onboarding."
  fi
fi

# ─── 6. Directory Structure ──────────────────────────────────
step "6/9 — Local Directories"

DIRS=(
  "$CLAWSTAFF_HOME"
  "$CLAWSTAFF_HOME/agents"
  "$CLAWSTAFF_HOME/backups"
  "$CLAWSTAFF_HOME/logs"
  "$CLAWSTAFF_HOME/scout"
  "$CLAWSTAFF_HOME/scout/drafts"
)

ALL_EXIST=true
for dir in "${DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    ALL_EXIST=false
    mkdir -p "$dir"
  fi
done

if $ALL_EXIST; then
  success "Directory structure already exists at $CLAWSTAFF_HOME"
else
  success "Created directory structure:"
  for dir in "${DIRS[@]}"; do
    printf "  ${DIM}%s${RESET}\n" "$dir"
  done
fi

# ─── 7. Start OpenClaw Gateway ───────────────────────────────
step "7/9 — OpenClaw Gateway"

if ! command -v openclaw &>/dev/null; then
  warn "OpenClaw not installed — skipping gateway startup."
else
  # Check if gateway is already running by looking for the process
  GATEWAY_RUNNING=false
  if pgrep -f "openclaw.*gateway" &>/dev/null || \
     (command -v lsof &>/dev/null && lsof -i :18789 &>/dev/null 2>&1); then
    GATEWAY_RUNNING=true
  fi

  if $GATEWAY_RUNNING; then
    success "Gateway is already running on ws://127.0.0.1:18789"
  else
    info "Starting OpenClaw Gateway..."
    if openclaw gateway start 2>/dev/null; then
      # Give it a moment to bind the port
      sleep 2

      # Verify it's running
      if pgrep -f "openclaw.*gateway" &>/dev/null || \
         (command -v lsof &>/dev/null && lsof -i :18789 &>/dev/null 2>&1); then
        success "Gateway started on ws://127.0.0.1:18789"
      else
        warn "Gateway process started but could not verify it's listening."
        warn "Check manually: openclaw gateway status"
      fi
    else
      warn "Could not start the gateway. Try manually:"
      warn "  openclaw gateway start"
    fi
  fi
fi

# ─── 8. Deploy Sample Agent ──────────────────────────────────
step "8/9 — Sample Agent"

SAMPLE_AGENT_DIR="$CLAWSTAFF_HOME/agents/maya"
SAMPLE_CONFIG_FILE=$(mktemp /tmp/clawstaff-sample-config.XXXXXX.json)

if [[ -d "$SAMPLE_AGENT_DIR" && -f "$SAMPLE_AGENT_DIR/SOUL.md" ]]; then
  success "Sample agent 'maya' already exists at $SAMPLE_AGENT_DIR"
else
  info "Generating a sample restaurant agent (Maya)..."

  # Write a sample config for the workspace generator
  cat > "$SAMPLE_CONFIG_FILE" <<'CONFIG'
{
  "businessName": "Sample Restaurant",
  "ownerName": "Owner",
  "vertical": "restaurant",
  "agentName": "Maya",
  "communicationStyle": "warm",
  "channels": ["webchat"],
  "timezone": "America/Chicago",
  "businessHours": "11am-10pm",
  "businessKnowledge": {
    "description": "A welcoming neighborhood restaurant with seasonal American cuisine, craft cocktails, and weekend brunch.",
    "services": "Dine-in, takeout, catering, private events, weekend brunch",
    "faqs": [
      { "q": "What are your hours?", "a": "We're open Tuesday through Sunday, 11am to 10pm. Closed Mondays." },
      { "q": "Do you take reservations?", "a": "Yes! You can book through our website or just call us." },
      { "q": "Do you have vegetarian options?", "a": "Absolutely — about a third of our menu is vegetarian or can be made vegetarian." }
    ]
  },
  "escalationRules": {
    "immediate": ["Allergic reaction", "Food safety complaint", "Large party (10+)"],
    "dailySummary": ["Negative review", "Catering inquiry", "Special dietary request"]
  }
}
CONFIG

  # Run the workspace generator
  GENERATOR="$PROJECT_ROOT/scripts/generate-workspace.ts"

  if [[ -f "$GENERATOR" ]] && command -v npx &>/dev/null; then
    # Generate workspace to a temp location, then move it
    TEMP_WORKSPACE=$(mktemp -d /tmp/clawstaff-workspace.XXXXXX)

    if npx tsx "$GENERATOR" "$SAMPLE_CONFIG_FILE" --output "$TEMP_WORKSPACE" 2>/dev/null; then
      # Move generated workspace to the agents directory
      mkdir -p "$SAMPLE_AGENT_DIR"
      cp -R "$TEMP_WORKSPACE"/* "$SAMPLE_AGENT_DIR"/ 2>/dev/null || true

      # Verify we got a SOUL.md
      if [[ -f "$SAMPLE_AGENT_DIR/SOUL.md" ]]; then
        success "Agent workspace generated at $SAMPLE_AGENT_DIR"
      else
        # Generator might output to a subdirectory
        GENERATED_SUB=$(find "$TEMP_WORKSPACE" -name "SOUL.md" -maxdepth 3 2>/dev/null | head -1)
        if [[ -n "$GENERATED_SUB" ]]; then
          GENERATED_DIR=$(dirname "$GENERATED_SUB")
          cp -R "$GENERATED_DIR"/* "$SAMPLE_AGENT_DIR"/
          success "Agent workspace generated at $SAMPLE_AGENT_DIR"
        else
          warn "Workspace generator ran but SOUL.md not found."
          warn "You can generate an agent manually: npm run generate"
        fi
      fi

      rm -rf "$TEMP_WORKSPACE"
    else
      warn "Workspace generator failed."
      warn "You can generate an agent manually: npm run generate"
      rm -rf "$TEMP_WORKSPACE"
    fi
  else
    warn "Workspace generator or npx not available."
    warn "Generate an agent manually after setup: npm run generate"
  fi

  # Clean up temp config
  rm -f "$SAMPLE_CONFIG_FILE"

  # Register the agent with OpenClaw
  if [[ -d "$SAMPLE_AGENT_DIR" ]] && command -v openclaw &>/dev/null; then
    info "Registering agent 'maya' with OpenClaw..."

    if openclaw agents add --name maya --path "$SAMPLE_AGENT_DIR" 2>/dev/null; then
      success "Agent 'maya' registered with OpenClaw"
    else
      # Might already be registered
      if openclaw agents list 2>/dev/null | grep -q "maya"; then
        success "Agent 'maya' is already registered with OpenClaw"
      else
        warn "Could not register agent with OpenClaw."
        warn "Register manually: openclaw agents add --name maya --path $SAMPLE_AGENT_DIR"
      fi
    fi
  fi
fi

# ─── 9. Done ─────────────────────────────────────────────────
step "9/9 — Ready"

printf "\n"
printf "  ${GREEN}${BOLD}ClawStaff setup is complete.${RESET}\n"
printf "\n"
printf "  ${BOLD}What was configured:${RESET}\n"
printf "    ${GREEN}+${RESET} Node.js $NODE_VERSION verified\n"
printf "    ${GREEN}+${RESET} npm dependencies installed\n"
printf "    ${GREEN}+${RESET} API keys saved to .env.local\n"

if command -v openclaw &>/dev/null; then
  printf "    ${GREEN}+${RESET} OpenClaw CLI ready\n"
fi

printf "    ${GREEN}+${RESET} Directory structure at ~/clawstaff/\n"

if [[ -f "$SAMPLE_AGENT_DIR/SOUL.md" ]]; then
  printf "    ${GREEN}+${RESET} Sample agent Maya deployed\n"
fi

printf "\n"
printf "  ${ACCENT}${BOLD}Talk to your agent:${RESET}\n"
printf "    ${CYAN}openclaw agent --agent maya --message \"Hello!\"${RESET}\n"
printf "\n"
printf "  ${ACCENT}${BOLD}Start the dashboard:${RESET}\n"
printf "    ${CYAN}npm run dev${RESET}\n"
printf "    Then open ${BOLD}http://localhost:3000${RESET}\n"
printf "\n"
printf "  ${ACCENT}${BOLD}Create more agents:${RESET}\n"
printf "    ${CYAN}npm run onboard${RESET}\n"
printf "\n"
printf "  ${ACCENT}${BOLD}Generate a workspace from config:${RESET}\n"
printf "    ${CYAN}npm run generate -- config.json${RESET}\n"
printf "\n"
printf "  ${DIM}────────────────────────────────────────────────────────────${RESET}\n"
printf "  ${DIM}Docs:     docs/ directory${RESET}\n"
printf "  ${DIM}Support:  https://github.com/clawstaff/clawstaff/issues${RESET}\n"
printf "  ${DIM}────────────────────────────────────────────────────────────${RESET}\n"
printf "\n"
