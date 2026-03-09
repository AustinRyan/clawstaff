#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# connect-whatsapp.sh — Route a WhatsApp number to an agent
#
# Usage:
#   ./scripts/local/connect-whatsapp.sh <agent_name> [phone_number]
#
# Examples:
#   ./scripts/local/connect-whatsapp.sh testmaya              # uses your number from allowFrom
#   ./scripts/local/connect-whatsapp.sh testmaya +14107397341
#   ./scripts/local/connect-whatsapp.sh testcole +15551234567
#
# What it does:
#   1. Validates the agent exists in OpenClaw
#   2. Adds a peer-specific WhatsApp binding in openclaw.json
#   3. Ensures the phone is in allowFrom
#   4. Restarts the Gateway to pick up config changes
#   5. Verifies WhatsApp channel is connected
#   6. Confirms routing with openclaw agents bindings
# ─────────────────────────────────────────────────────────

set -euo pipefail

CONFIG="$HOME/.openclaw/openclaw.json"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
err()  { echo -e "  ${RED}✗${NC} $1"; }
step() { echo -e "\n${BOLD}$1${NC}"; }

# ── Args ──
AGENT_NAME="${1:-}"
PHONE="${2:-}"

if [[ -z "$AGENT_NAME" ]]; then
  echo -e "${BOLD}Usage:${NC} $0 <agent_name> [phone_number]"
  echo ""
  echo "  agent_name   Agent ID (e.g., testmaya, testcole)"
  echo "  phone_number E.164 format (e.g., +14107397341)"
  echo "               If omitted, uses first number from allowFrom"
  exit 1
fi

# ── Preflight ──
step "1. Checking prerequisites"

if ! command -v openclaw &>/dev/null; then
  err "openclaw not found. Install: npm i -g openclaw"
  exit 1
fi
log "OpenClaw CLI available"

if [[ ! -f "$CONFIG" ]]; then
  err "Config not found: $CONFIG"
  exit 1
fi
log "Config found: $CONFIG"

# Check agent exists
if ! openclaw agents list 2>&1 | grep -qi "^\- $AGENT_NAME"; then
  err "Agent '$AGENT_NAME' not found. Run: openclaw agents list"
  exit 1
fi
log "Agent '$AGENT_NAME' registered"

# Resolve phone number
if [[ -z "$PHONE" ]]; then
  # Extract first number from allowFrom
  PHONE=$(python3 -c "
import json
with open('$CONFIG') as f:
    c = json.load(f)
af = c.get('channels',{}).get('whatsapp',{}).get('allowFrom',[])
if af:
    n = af[0]
    if not n.startswith('+'):
        n = '+' + n
    print(n)
" 2>/dev/null || true)

  if [[ -z "$PHONE" ]]; then
    err "No phone number provided and none found in allowFrom."
    echo "  Usage: $0 $AGENT_NAME +1XXXXXXXXXX"
    exit 1
  fi
  warn "No phone specified — using $PHONE from allowFrom"
fi

# Normalize to E.164
if [[ ! "$PHONE" =~ ^\+ ]]; then
  PHONE="+$PHONE"
fi
log "Phone: $PHONE"

# ── Check WhatsApp linked ──
step "2. Checking WhatsApp connection"

WA_STATUS=$(openclaw channels status --probe 2>&1 | grep -i whatsapp || true)
if echo "$WA_STATUS" | grep -qi "connected"; then
  log "WhatsApp connected"
elif echo "$WA_STATUS" | grep -qi "linked"; then
  warn "WhatsApp linked but may not be connected. Gateway restart may fix."
else
  err "WhatsApp not linked. Run: openclaw channels login --channel whatsapp"
  exit 1
fi

# ── Update config ──
step "3. Updating openclaw.json"

# Use python3 for safe JSON manipulation
python3 << PYEOF
import json, sys, copy

config_path = "$CONFIG"
agent_name = "$AGENT_NAME"
phone = "$PHONE"
phone_bare = phone.lstrip("+")

with open(config_path) as f:
    config = json.load(f)

# Ensure allowFrom includes this phone number
wa = config.setdefault("channels", {}).setdefault("whatsapp", {})
allow_from = wa.setdefault("allowFrom", [])

# Check both formats (+1... and 1...)
if phone not in allow_from and phone_bare not in allow_from:
    allow_from.append(phone_bare)
    print(f"  ✓ Added {phone_bare} to allowFrom")
else:
    print(f"  ✓ Phone already in allowFrom")

# Update bindings
bindings = config.setdefault("bindings", [])

# Check if a peer binding for this phone already exists
new_binding = {
    "agentId": agent_name,
    "match": {
        "channel": "whatsapp",
        "peer": {"kind": "direct", "id": phone}
    }
}

existing_idx = None
for i, b in enumerate(bindings):
    match = b.get("match", {})
    peer = match.get("peer", {})
    if (match.get("channel") == "whatsapp"
        and peer.get("kind") == "direct"
        and peer.get("id") in (phone, phone_bare)):
        existing_idx = i
        break

if existing_idx is not None:
    old_agent = bindings[existing_idx].get("agentId", "?")
    if old_agent == agent_name:
        print(f"  ✓ Binding already exists: {phone} → {agent_name}")
    else:
        bindings[existing_idx] = new_binding
        print(f"  ✓ Updated binding: {phone} → {agent_name} (was: {old_agent})")
else:
    # Insert peer binding at the beginning (highest priority)
    bindings.insert(0, new_binding)
    print(f"  ✓ Added peer binding: {phone} → {agent_name}")

# Ensure there's still a fallback binding
has_fallback = any(
    b.get("match", {}).get("channel") == "whatsapp"
    and "peer" not in b.get("match", {})
    for b in bindings
)
if not has_fallback:
    bindings.append({
        "agentId": "main",
        "match": {"channel": "whatsapp", "accountId": "default"}
    })
    print("  ✓ Added fallback binding: whatsapp → main")

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
    f.write("\n")

print("  ✓ Config saved")
PYEOF

# ── Restart Gateway ──
step "4. Restarting Gateway"

openclaw gateway restart 2>&1 | grep -v "Doctor warnings" | grep -v "channels.telegram" | grep -v "──" | grep -v "│" | grep -v "◇" | grep -v "├" | head -5
sleep 3
log "Gateway restarted"

# ── Verify ──
step "5. Verifying routing"

echo ""
openclaw agents bindings 2>&1 | grep -v "Doctor warnings" | grep -v "channels.telegram" | grep -v "──" | grep -v "│" | grep -v "◇" | grep -v "├"

# ── Connection test ──
step "6. Connection test"

WA_CHECK=$(openclaw channels status --probe 2>&1 | grep -i whatsapp || true)
if echo "$WA_CHECK" | grep -qi "connected"; then
  log "WhatsApp connected and routing to '$AGENT_NAME'"
else
  warn "WhatsApp may need a moment to reconnect after restart"
  echo "  Check with: openclaw channels status --probe"
fi

echo ""
echo -e "${BOLD}Done!${NC} Send a WhatsApp message from $PHONE to test."
echo -e "Monitor: ${CYAN}openclaw channels logs --channel whatsapp --follow${NC}"
echo ""
echo "To verify the message hit the dashboard:"
echo -e "  ${CYAN}curl -s http://localhost:3000/api/agent/$AGENT_NAME/messages | python3 -m json.tool | head -20${NC}"
echo ""
