#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Test First Agent (Local)
#
# Generates test workspaces for all 6 verticals using
# generate-workspace.ts, deploys TestMaya via OpenClaw agents,
# and sends test messages to validate behavior.
#
# Prerequisites:
#   - Run setup-local.sh first
#   - Gateway must be running (openclaw gateway start)
#   - Anthropic API key configured in ~/.openclaw/openclaw.json
#
# Usage:
#   chmod +x scripts/local/test-first-agent.sh
#   ./scripts/local/test-first-agent.sh
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CLAWSTAFF_HOME="$HOME/clawstaff"
AGENTS_DIR="${CLAWSTAFF_HOME}/agents"
DASHBOARD_URL="http://127.0.0.1:18789"

# ─── Colors ──────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; }
header()  { echo -e "\n${BOLD}${CYAN}── $1 ──${NC}\n"; }

PASS_COUNT=0
FAIL_COUNT=0

# ─── Pre-flight checks ──────────────────────────────────────

header "Pre-flight Checks"

# Check Gateway is running
if openclaw health &>/dev/null; then
  success "Gateway is healthy"
else
  # Try starting it
  warn "Gateway not responding — attempting to start..."
  openclaw gateway start 2>&1 || true
  sleep 4
  if openclaw health &>/dev/null; then
    success "Gateway started"
  else
    fail "Gateway is not running. Run setup-local.sh first."
    exit 1
  fi
fi

# Check generate-workspace.ts exists
if [[ ! -f "${PROJECT_DIR}/scripts/generate-workspace.ts" ]]; then
  fail "generate-workspace.ts not found at ${PROJECT_DIR}/scripts/"
  exit 1
fi
success "generate-workspace.ts found"

# ─── Step 1: Generate test workspaces for all 6 verticals ───

header "Step 1: Generate Test Workspaces"

TEST_CONFIGS_DIR=$(mktemp -d)
trap "rm -rf ${TEST_CONFIGS_DIR}" EXIT

# TestMaya — Restaurant
cat > "${TEST_CONFIGS_DIR}/testmaya.json" <<'EOF'
{
  "businessName": "Test Restaurant (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "restaurant",
  "agentName": "TestMaya",
  "communicationStyle": "warm",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Mon-Sun 9am-10pm",
  "businessKnowledge": {
    "description": "Test restaurant for ClawStaff QA. Family-style Italian dining.",
    "services": "Dine-in, takeout, catering up to 40 guests",
    "faqs": [
      { "q": "Do you take reservations?", "a": "Yes! Call us or book through our website." },
      { "q": "Is there parking?", "a": "Free parking lot behind the building." },
      { "q": "Do you have outdoor seating?", "a": "Yes, weather permitting, on our patio." }
    ]
  },
  "escalationRules": {
    "immediate": ["1-2 star reviews", "Customer mentions food safety or illness", "Media inquiries"],
    "dailySummary": ["3 star reviews", "Reservation changes", "General feedback"]
  },
  "customRules": ["Never offer discounts without owner approval", "Always mention our Tuesday pasta special"]
}
EOF

# TestCole — Realtor
cat > "${TEST_CONFIGS_DIR}/testcole.json" <<'EOF'
{
  "businessName": "Test Realty (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "realtor",
  "agentName": "TestCole",
  "communicationStyle": "professional",
  "channels": ["webchat"],
  "timezone": "America/Chicago",
  "businessHours": "Mon-Sat 8am-7pm",
  "businessKnowledge": {
    "description": "Test real estate agency for ClawStaff QA.",
    "services": "Residential sales, buyer representation, market analysis",
    "faqs": [
      { "q": "What areas do you cover?", "a": "We serve the greater metro area." },
      { "q": "Do you work with first-time buyers?", "a": "Absolutely, we specialize in helping first-time buyers." }
    ]
  }
}
EOF

# TestAlex — Fitness
cat > "${TEST_CONFIGS_DIR}/testalex.json" <<'EOF'
{
  "businessName": "Test Fitness Studio (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "fitness",
  "agentName": "TestAlex",
  "communicationStyle": "casual",
  "channels": ["webchat"],
  "timezone": "America/Los_Angeles",
  "businessHours": "Mon-Fri 5am-9pm, Sat-Sun 7am-5pm",
  "businessKnowledge": {
    "description": "Test fitness studio for ClawStaff QA.",
    "services": "Group classes, personal training, open gym",
    "faqs": [
      { "q": "Do you offer trial classes?", "a": "Yes! Your first class is free." },
      { "q": "What classes do you have?", "a": "Yoga, HIIT, spin, strength, and pilates." }
    ]
  }
}
EOF

# TestSophia — Medical
cat > "${TEST_CONFIGS_DIR}/testsophia.json" <<'EOF'
{
  "businessName": "Test Dental Office (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "medical",
  "agentName": "TestSophia",
  "communicationStyle": "professional",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Mon-Fri 8am-5pm",
  "businessKnowledge": {
    "description": "Test dental practice for ClawStaff QA.",
    "services": "General dentistry, cleanings, cosmetic, emergency",
    "faqs": [
      { "q": "Do you accept insurance?", "a": "We accept most major dental insurance plans." },
      { "q": "What about emergencies?", "a": "Call our office for same-day emergency appointments." }
    ]
  }
}
EOF

# TestJake — Home Services
cat > "${TEST_CONFIGS_DIR}/testjake.json" <<'EOF'
{
  "businessName": "Test HVAC & Plumbing (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "home-services",
  "agentName": "TestJake",
  "communicationStyle": "direct",
  "channels": ["webchat"],
  "timezone": "America/Denver",
  "businessHours": "Mon-Fri 7am-6pm, Sat 8am-2pm",
  "businessKnowledge": {
    "description": "Test home services company for ClawStaff QA.",
    "services": "HVAC install/repair, plumbing, water heaters, drain cleaning",
    "faqs": [
      { "q": "Do you offer free estimates?", "a": "Yes, free estimates for all jobs." },
      { "q": "Are you licensed?", "a": "Fully licensed and insured." }
    ]
  }
}
EOF

# TestZoe — E-Commerce
cat > "${TEST_CONFIGS_DIR}/testzoe.json" <<'EOF'
{
  "businessName": "Test Shop (ClawStaff QA)",
  "ownerName": "Test Owner",
  "vertical": "ecommerce",
  "agentName": "TestZoe",
  "communicationStyle": "casual",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "24/7",
  "businessKnowledge": {
    "description": "Test e-commerce store for ClawStaff QA.",
    "services": "Online retail, shipping, returns, customer support",
    "faqs": [
      { "q": "What is your return policy?", "a": "30-day returns, no questions asked." },
      { "q": "How long does shipping take?", "a": "Standard shipping is 3-5 business days." }
    ]
  }
}
EOF

# Generate all 6 workspaces
AGENTS=("testmaya" "testcole" "testalex" "testsophia" "testjake" "testzoe")
AGENT_DISPLAY_NAMES=("TestMaya" "TestCole" "TestAlex" "TestSophia" "TestJake" "TestZoe")

cd "$PROJECT_DIR"

for i in "${!AGENTS[@]}"; do
  agent="${AGENTS[$i]}"
  display="${AGENT_DISPLAY_NAMES[$i]}"
  config="${TEST_CONFIGS_DIR}/${agent}.json"

  info "Generating workspace for ${display}..."

  if npx tsx scripts/generate-workspace.ts "$config" 2>&1; then
    success "Generated: ${display} -> workspaces/${display}/"
  else
    fail "Failed to generate workspace for ${display}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

# ─── Step 2: Deploy TestMaya only ────────────────────────────

header "Step 2: Deploy TestMaya"

TESTMAYA_SRC="${PROJECT_DIR}/workspaces/TestMaya"
TESTMAYA_DEST="${AGENTS_DIR}/testmaya"

if [[ ! -d "$TESTMAYA_SRC" ]]; then
  fail "TestMaya workspace not found at ${TESTMAYA_SRC}"
  exit 1
fi

# Clean up any previous test deployment
if [[ -d "$TESTMAYA_DEST" ]]; then
  warn "Previous TestMaya deployment found — removing"
  rm -rf "$TESTMAYA_DEST"
fi

info "Copying workspace to ${TESTMAYA_DEST}..."
mkdir -p "$TESTMAYA_DEST"
cp -r "${TESTMAYA_SRC}/"* "$TESTMAYA_DEST/"

# Initialize memory directory
mkdir -p "${TESTMAYA_DEST}/memory"
touch "${TESTMAYA_DEST}/SESSION-STATE.md"
touch "${TESTMAYA_DEST}/RECENT_CONTEXT.md"
if [[ ! -f "${TESTMAYA_DEST}/MEMORY.md" ]]; then
  printf "# Agent Memory\n\n_Initialized by ClawStaff test setup._\n" > "${TESTMAYA_DEST}/MEMORY.md"
fi

success "TestMaya workspace deployed"

# ─── Step 3: Register TestMaya with the OpenClaw Gateway ─────

info "Registering TestMaya agent with the Gateway..."

# Remove existing testmaya agent if present (clean slate)
if openclaw agents list 2>&1 | grep -q "testmaya"; then
  warn "Removing existing testmaya agent registration..."
  openclaw agents delete testmaya 2>&1 || true
fi

# Clear any stale session locks
rm -f ~/.openclaw/agents/testmaya/sessions/*.lock 2>/dev/null || true

# Register the agent with its workspace
openclaw agents add testmaya \
  --workspace "$TESTMAYA_DEST" \
  --model "anthropic/claude-sonnet-4-5" \
  --non-interactive 2>&1

success "TestMaya registered with Gateway"

# Set per-agent model to Anthropic
python3 <<'PYEOF'
import json

import os
config_path = os.path.expanduser("~/.openclaw/openclaw.json")
with open(config_path, "r") as f:
    config = json.load(f)

for agent in config.get("agents", {}).get("list", []):
    if agent.get("id") == "testmaya":
        agent["model"] = {"primary": "anthropic/claude-sonnet-4-5"}
        break

with open(config_path, "w") as f:
    json.dump(config, f, indent=2)
PYEOF

# Restart Gateway to pick up changes
info "Restarting Gateway..."
openclaw gateway restart 2>&1 || true
sleep 4

success "Gateway restarted with TestMaya"

# ─── Step 4: Send test messages ──────────────────────────────

header "Step 3: Test Messages"

echo ""
echo -e "${CYAN}Sending test messages to TestMaya via OpenClaw CLI...${NC}"
echo ""

# Test 1: Normal reservation inquiry
TEST1_MSG="Hi, do you have availability for 4 people this Friday at 7pm?"
TEST1_PASS=false

info "Test 1: Reservation Inquiry"
echo -e "  ${BOLD}Sending:${NC} ${TEST1_MSG}"
echo ""

TEST1_RESPONSE=$(openclaw agent \
  --agent testmaya \
  --message "$TEST1_MSG" \
  --timeout 120 \
  2>&1) || true

if [[ -n "$TEST1_RESPONSE" && "$TEST1_RESPONSE" != *"aborted"* && "$TEST1_RESPONSE" != *"Error:"* ]]; then
  echo -e "  ${BOLD}Response:${NC}"
  echo "$TEST1_RESPONSE" | sed 's/^/    /'
  echo ""

  if echo "$TEST1_RESPONSE" | grep -qiE "(reserv|availab|book|friday|party|table|seat|4 (people|guests)|7.?pm)"; then
    success "Test 1 PASSED -- Agent responded to reservation inquiry"
    TEST1_PASS=true
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    fail "Test 1 FAILED -- Response doesn't address the reservation request"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
else
  fail "Test 1 FAILED -- No valid response received"
  echo "  Response: ${TEST1_RESPONSE}"
  echo ""
  echo "  Debug:"
  echo "    openclaw health"
  echo "    openclaw models status --agent testmaya"
  echo "    tail -f ~/.openclaw/logs/gateway.log"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

sleep 2

# Test 2: Escalation trigger (food poisoning = food safety concern)
TEST2_MSG="I got food poisoning last time I was here"
TEST2_PASS=false

info "Test 2: Escalation Trigger (Food Safety)"
echo -e "  ${BOLD}Sending:${NC} ${TEST2_MSG}"
echo ""

TEST2_RESPONSE=$(openclaw agent \
  --agent testmaya \
  --message "$TEST2_MSG" \
  --timeout 120 \
  2>&1) || true

if [[ -n "$TEST2_RESPONSE" && "$TEST2_RESPONSE" != *"aborted"* && "$TEST2_RESPONSE" != *"Error:"* ]]; then
  echo -e "  ${BOLD}Response:${NC}"
  echo "$TEST2_RESPONSE" | sed 's/^/    /'
  echo ""

  # Per SOUL.md: food safety/illness should trigger escalation + serious response
  if echo "$TEST2_RESPONSE" | grep -qiE "(sorry|concern|seriously|apolog|understand|team|follow.?up|look into|reach out|safe|escalat|owner)"; then
    success "Test 2 PASSED -- Agent acknowledged food safety concern appropriately"
    TEST2_PASS=true
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    fail "Test 2 FAILED -- Response doesn't show appropriate handling of food safety concern"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
else
  fail "Test 2 FAILED -- No valid response received"
  echo "  Response: ${TEST2_RESPONSE}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ─── Results ─────────────────────────────────────────────────

header "Test Results"

echo ""
echo -e "  Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "  Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""

if [[ $FAIL_COUNT -eq 0 && $PASS_COUNT -gt 0 ]]; then
  echo -e "  ${GREEN}${BOLD}ALL TESTS PASSED${NC}"
  echo ""
  echo "  TestMaya is responding correctly!"
  echo ""
  echo "  Open the Dashboard in your browser to chat live:"
  echo "    ${DASHBOARD_URL}"
  echo ""
  echo "  Or use the terminal UI:"
  echo "    openclaw tui"
  echo ""
  echo "  Or send messages via CLI:"
  echo "    openclaw agent --agent testmaya --message \"your message\""
  echo ""
  echo "  Other test agents generated (not yet deployed):"
  echo "    workspaces/TestCole    (realtor)"
  echo "    workspaces/TestAlex   (fitness)"
  echo "    workspaces/TestSophia (medical)"
  echo "    workspaces/TestJake   (home-services)"
  echo "    workspaces/TestZoe    (ecommerce)"
  echo ""
elif [[ $PASS_COUNT -gt 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}PARTIAL PASS${NC}"
  echo ""
  echo "  Some tests failed. Check the output above for details."
  echo "  See docs/TROUBLESHOOTING.md for debugging steps."
  echo ""
else
  echo -e "  ${RED}${BOLD}ALL TESTS FAILED${NC}"
  echo ""
  echo "  Troubleshooting steps:"
  echo "    1. Is the Gateway running?    openclaw health"
  echo "    2. Is the API key valid?      openclaw models status --agent testmaya"
  echo "    3. Check Gateway logs:        openclaw logs"
  echo "    4. Run diagnostics:           openclaw doctor"
  echo "    5. See docs/TROUBLESHOOTING.md"
  echo ""
fi

exit $FAIL_COUNT
