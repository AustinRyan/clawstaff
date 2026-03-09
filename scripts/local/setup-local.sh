#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Local Development Setup
#
# Sets up OpenClaw + ClawStaff infrastructure on macOS for
# local development. Run this BEFORE test-first-agent.sh.
#
# Usage:
#   chmod +x scripts/local/setup-local.sh
#   ./scripts/local/setup-local.sh
# ─────────────────────────────────────────────────────────────

CLAWSTAFF_HOME="$HOME/clawstaff"
GATEWAY_URL="ws://127.0.0.1:18789"
DASHBOARD_URL="http://127.0.0.1:18789"
REQUIRED_NODE_MAJOR=22

# ─── Colors ──────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ─── Step 1: Check Node.js version ──────────────────────────

info "Checking Node.js version (requires ${REQUIRED_NODE_MAJOR}+)..."

if ! command -v node &>/dev/null; then
  echo ""
  fail "Node.js is not installed.

  Install Node.js ${REQUIRED_NODE_MAJOR}+ using nvm:

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    source ~/.zshrc
    nvm install ${REQUIRED_NODE_MAJOR}
    nvm use ${REQUIRED_NODE_MAJOR}

  Then re-run this script."
fi

NODE_VERSION=$(node -v | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)

if [[ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]]; then
  echo ""
  fail "Node.js v${NODE_VERSION} found, but v${REQUIRED_NODE_MAJOR}+ is required.

  Upgrade using nvm:

    nvm install ${REQUIRED_NODE_MAJOR}
    nvm use ${REQUIRED_NODE_MAJOR}
    nvm alias default ${REQUIRED_NODE_MAJOR}

  Then re-run this script."
fi

success "Node.js v${NODE_VERSION}"

# ─── Step 2: Install OpenClaw globally ───────────────────────

info "Checking for OpenClaw..."

if command -v openclaw &>/dev/null; then
  OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  success "OpenClaw already installed (${OPENCLAW_VERSION})"
else
  info "Installing OpenClaw globally via npm..."
  npm install -g openclaw

  if ! command -v openclaw &>/dev/null; then
    fail "OpenClaw installation failed. Try manually: npm install -g openclaw"
  fi

  OPENCLAW_VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  success "OpenClaw installed (${OPENCLAW_VERSION})"
fi

# ─── Step 3: Run OpenClaw Onboarding / Configure ─────────────

info "Checking OpenClaw configuration..."

OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"

if [[ -f "$OPENCLAW_CONFIG" ]]; then
  success "OpenClaw already configured at ${OPENCLAW_CONFIG}"
  warn "To reconfigure, run: openclaw configure"
else
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  OpenClaw Onboarding Wizard${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  The wizard will walk you through initial setup:"
  echo ""
  echo "  - Gateway mode    — Choose 'local'"
  echo "  - Gateway port    — Accept default 18789"
  echo "  - Model provider  — Choose 'anthropic' (recommended)"
  echo "  - API Key         — Your Anthropic API key (sk-ant-...)"
  echo "     Get one at: https://console.anthropic.com/settings/keys"
  echo ""
  echo "  After the wizard, you can also configure the Anthropic"
  echo "  provider in ~/.openclaw/openclaw.json under models.providers."
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  read -rp "Press Enter to start the onboarding wizard..."

  openclaw onboard

  if [[ ! -f "$OPENCLAW_CONFIG" ]]; then
    fail "Onboarding did not create ${OPENCLAW_CONFIG}. Check for errors above."
  fi

  success "OpenClaw configured"
fi

# ─── Step 4: Ensure Anthropic provider is configured ─────────

info "Checking model provider configuration..."

if python3 -c "
import json, sys
with open('$OPENCLAW_CONFIG') as f:
    config = json.load(f)
providers = config.get('models', {}).get('providers', {})
if 'anthropic' in providers and providers['anthropic'].get('apiKey'):
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
  success "Anthropic provider configured"
else
  warn "Anthropic provider not found in config."
  echo ""
  echo "  Add it to ~/.openclaw/openclaw.json under models.providers:"
  echo ""
  echo '  "models": {'
  echo '    "providers": {'
  echo '      "anthropic": {'
  echo '        "baseUrl": "https://api.anthropic.com",'
  echo '        "apiKey": "sk-ant-YOUR-KEY-HERE",'
  echo '        "models": [{'
  echo '          "id": "claude-sonnet-4-5",'
  echo '          "name": "Claude Sonnet 4.5",'
  echo '          "reasoning": false,'
  echo '          "input": ["text"],'
  echo '          "cost": {"input": 3, "output": 15, "cacheRead": 0.3, "cacheWrite": 3.75},'
  echo '          "contextWindow": 200000,'
  echo '          "maxTokens": 8192'
  echo '        }]'
  echo '      }'
  echo '    }'
  echo '  }'
  echo ""
  echo "  Or run: openclaw configure"
  echo ""
fi

# ─── Step 5: Create ClawStaff directory structure ────────────

info "Creating ClawStaff directory structure at ${CLAWSTAFF_HOME}..."

mkdir -p "${CLAWSTAFF_HOME}/agents"
mkdir -p "${CLAWSTAFF_HOME}/backups"
mkdir -p "${CLAWSTAFF_HOME}/logs"

if [[ ! -f "${CLAWSTAFF_HOME}/clients.json" ]]; then
  python3 -c "
import json, datetime
data = {
    'clients': [],
    'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'version': '1.0'
}
with open('${CLAWSTAFF_HOME}/clients.json', 'w') as f:
    json.dump(data, f, indent=2)
"
  success "Created ${CLAWSTAFF_HOME}/clients.json"
else
  success "clients.json already exists"
fi

success "Directory structure ready:"
echo "    ${CLAWSTAFF_HOME}/"
echo "    ${CLAWSTAFF_HOME}/agents/"
echo "    ${CLAWSTAFF_HOME}/backups/"
echo "    ${CLAWSTAFF_HOME}/logs/"
echo "    ${CLAWSTAFF_HOME}/clients.json"

# ─── Step 6: Check available skills ──────────────────────────

info "Checking available skills..."

# OpenClaw bundles skills directly — list what's available
if openclaw skills list 2>/dev/null | head -5; then
  success "Skills system available (skills are bundled with OpenClaw)"
else
  warn "Could not list skills. Check: openclaw skills list"
fi

# ─── Step 7: Install + start the Gateway service ─────────────

info "Setting up Gateway service..."

# Install as a LaunchAgent (macOS) so it persists across reboots
if ! openclaw gateway status 2>&1 | grep -q "Service file:"; then
  info "Installing Gateway as LaunchAgent..."
  openclaw gateway install 2>&1
  success "Gateway service installed"
else
  success "Gateway service already installed"
fi

# Start/restart the Gateway
info "Starting Gateway..."
if lsof -i :18789 &>/dev/null; then
  openclaw gateway restart 2>&1 || true
  success "Gateway restarted"
else
  openclaw gateway start 2>&1 || true
  success "Gateway started"
fi

# ─── Step 8: Health check ────────────────────────────────────

sleep 3
info "Running health check..."

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if openclaw health 2>&1; then
  echo ""
  echo -e "  ${GREEN}Gateway is running on ${GATEWAY_URL}${NC}"
  echo -e "  ${GREEN}Dashboard: ${DASHBOARD_URL}${NC}"
  echo ""
  echo -e "  ${GREEN}Setup complete! Next step:${NC}"
  echo "    ./scripts/local/test-first-agent.sh"
  echo ""
else
  echo ""
  echo -e "  ${YELLOW}Gateway health check inconclusive.${NC}"
  echo ""
  echo "  Try:"
  echo "    openclaw gateway status"
  echo "    openclaw doctor"
  echo "    See docs/TROUBLESHOOTING.md"
  echo ""
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
