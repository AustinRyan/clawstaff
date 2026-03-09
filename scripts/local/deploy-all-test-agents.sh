#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# ClawStaff — Deploy All 6 Test Agents
#
# Generates workspaces, deploys to ~/clawstaff/agents/, and
# registers each with the OpenClaw Gateway.
#
# Prerequisites:
#   - Gateway running (openclaw gateway start)
#   - Anthropic API key configured
#
# Usage:
#   ./scripts/local/deploy-all-test-agents.sh
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CLAWSTAFF_HOME="$HOME/clawstaff"
AGENTS_DIR="${CLAWSTAFF_HOME}/agents"
DASHBOARD_URL="http://127.0.0.1:18789"

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

# ─── Pre-flight ──────────────────────────────────────────────

header "Pre-flight Checks"

if ! openclaw health &>/dev/null; then
  fail "Gateway not healthy. Run: openclaw gateway start"
  exit 1
fi
success "Gateway healthy"

mkdir -p "$AGENTS_DIR"

# ─── Agent configs ───────────────────────────────────────────

CONFIGS_DIR=$(mktemp -d)
trap "rm -rf ${CONFIGS_DIR}" EXIT

cat > "${CONFIGS_DIR}/testmaya.json" <<'EOF'
{
  "businessName": "Test Bistro",
  "ownerName": "Maria Gonzalez",
  "vertical": "restaurant",
  "agentName": "TestMaya",
  "communicationStyle": "warm",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Tue-Sun 11am-10pm",
  "businessKnowledge": {
    "description": "Farm-to-table Italian bistro in Georgetown, DC. Known for house-made pasta and seasonal tasting menus. Seats 65 inside, 20 on the patio.",
    "services": "Dine-in, private events up to 30 guests, weekend brunch",
    "faqs": [
      { "q": "Do you take reservations?", "a": "Yes! Book online at our website or call 202-555-0188." },
      { "q": "Is there parking?", "a": "Free valet parking on Friday and Saturday evenings. Street parking available other times." },
      { "q": "Do you accommodate allergies?", "a": "Absolutely. Let your server know and our chef will adapt any dish. Full allergen menu available on request." }
    ]
  },
  "escalationRules": {
    "immediate": ["1-2 star reviews", "Customer mentions food safety or illness", "Refund requests", "Media inquiries"],
    "dailySummary": ["3 star reviews", "Reservation changes", "General feedback", "Catering inquiries"]
  },
  "customRules": [
    "Never offer discounts or free meals without owner approval",
    "Always mention our Wednesday wine night when relevant",
    "If someone asks about private events, ask for guest count and preferred date before quoting"
  ]
}
EOF

cat > "${CONFIGS_DIR}/testcole.json" <<'EOF'
{
  "businessName": "Test Realty Group",
  "ownerName": "Daniel Carter",
  "vertical": "realtor",
  "agentName": "TestCole",
  "communicationStyle": "professional",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Mon-Sat 8am-7pm",
  "businessKnowledge": {
    "description": "Boutique real estate team specializing in residential properties in Montgomery County, MD. 12 years experience, 30+ transactions per year.",
    "services": "Buyer representation, seller representation, market analysis, investment property consulting",
    "faqs": [
      { "q": "What areas do you cover?", "a": "Montgomery County — Bethesda, Silver Spring, Rockville, Chevy Chase, Potomac, and surrounding areas." },
      { "q": "Do you work with first-time buyers?", "a": "Absolutely. We partner with First Federal Lending for streamlined pre-approval." },
      { "q": "What's your commission?", "a": "I'd be happy to discuss our fee structure during a consultation. Want me to set one up?" }
    ]
  },
  "escalationRules": {
    "immediate": ["Leads with budget over $1M", "Commercial property inquiries", "Legal questions", "Complaints"],
    "dailySummary": ["New leads", "Cold leads", "Showing schedule for tomorrow"]
  },
  "customRules": [
    "Always mention our free market analysis for sellers",
    "For first-time buyers, mention our partnership with First Federal Lending",
    "Never discuss properties in the Westfield development — we have a conflict of interest"
  ]
}
EOF

cat > "${CONFIGS_DIR}/testalex.json" <<'EOF'
{
  "businessName": "Test Fitness Studio",
  "ownerName": "Priya Sharma",
  "vertical": "fitness",
  "agentName": "TestAlex",
  "communicationStyle": "casual",
  "channels": ["webchat"],
  "timezone": "America/Chicago",
  "businessHours": "Mon-Fri 5am-9pm, Sat-Sun 7am-5pm",
  "businessKnowledge": {
    "description": "Boutique fitness studio in Lincoln Park, Chicago. Strength, yoga, HIIT, and spin classes. 150 active members. Friendly, community-driven atmosphere.",
    "services": "Group classes, personal training, 6-week transformation challenges, open gym hours",
    "faqs": [
      { "q": "Do I need to be in shape to start?", "a": "Not at all! Our classes are designed for all fitness levels. Coaches modify every exercise." },
      { "q": "How much is a membership?", "a": "Unlimited classes start at $149/mo. Come try a free class first and we'll find the right plan!" },
      { "q": "Do you offer trial classes?", "a": "Yes! Your first class is completely free, no commitment needed." }
    ]
  },
  "escalationRules": {
    "immediate": ["Refund or billing disputes", "Injury reports", "Complaints about trainers", "Membership cancellations"],
    "dailySummary": ["New inquiries and trial bookings", "Members re-engaged", "Class attendance", "Inactive members (14+ days)"]
  },
  "customRules": [
    "Always mention our first-class-free policy for new inquiries",
    "For personal training questions, refer to Coach Marcus or Coach Leah",
    "Never discuss member body weight or appearance"
  ]
}
EOF

cat > "${CONFIGS_DIR}/testsophia.json" <<'EOF'
{
  "businessName": "Test Dental Care",
  "ownerName": "Dr. Karen Liu",
  "vertical": "medical",
  "agentName": "TestSophia",
  "communicationStyle": "professional",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Mon-Fri 8am-5pm",
  "businessKnowledge": {
    "description": "Family dental practice in Bethesda, MD. Dr. Liu and two hygienists. Open since 2018. Emphasis on gentle, anxiety-free dentistry.",
    "services": "Cleanings, fillings, crowns, whitening, Invisalign, emergency dental care",
    "faqs": [
      { "q": "What insurance do you accept?", "a": "We accept most major dental insurance plans. Call our office at 301-555-0456 to verify your specific plan." },
      { "q": "Do you see children?", "a": "Yes! We see patients of all ages, including children. Dr. Liu is great with kids." },
      { "q": "What if I'm anxious about dental work?", "a": "Dr. Liu specializes in gentle, anxiety-free dentistry. We'll go at your pace." }
    ]
  },
  "escalationRules": {
    "immediate": ["Insurance or billing questions", "Urgent medical concerns", "Messages mentioning pain or emergency", "Complaints about providers", "Requests for medical records"],
    "dailySummary": ["Appointment confirmations", "No-show list", "New patient inquiries", "Rebooking activity"]
  },
  "customRules": [
    "Always remind patients to bring insurance card and photo ID",
    "New patient appointments get 15 extra minutes for paperwork",
    "If patient mentions dental anxiety, reassure them about Dr. Liu's gentle approach"
  ]
}
EOF

cat > "${CONFIGS_DIR}/testjake.json" <<'EOF'
{
  "businessName": "Test HVAC Pro",
  "ownerName": "Mike Torres",
  "vertical": "home-services",
  "agentName": "TestJake",
  "communicationStyle": "direct",
  "channels": ["webchat"],
  "timezone": "America/Denver",
  "businessHours": "Mon-Fri 7am-6pm, Sat 8am-2pm",
  "businessKnowledge": {
    "description": "Full-service HVAC and plumbing company in Denver, CO. Licensed and insured, 15 years experience. Serves the greater Denver metro area.",
    "services": "HVAC install/repair, furnace maintenance, plumbing repair, water heater installation, drain cleaning, emergency service",
    "faqs": [
      { "q": "Do you offer free estimates?", "a": "Yes, free in-home estimates for all installation projects. Diagnostic fees for repair calls are waived if you proceed with the repair." },
      { "q": "Do you offer financing?", "a": "Yes! We partner with GreenSky for flexible financing on installations over $1,000." },
      { "q": "What's your service area?", "a": "Greater Denver metro — Denver, Lakewood, Aurora, Arvada, Westminster, and surrounding areas." }
    ]
  },
  "escalationRules": {
    "immediate": ["Emergency service requests", "Customer complaints", "Warranty claims", "1-2 star reviews"],
    "dailySummary": ["New leads", "Estimate follow-ups", "Reviews received", "Seasonal campaign messages"]
  },
  "customRules": [
    "Emergency HVAC and plumbing calls get escalated immediately, even on weekends",
    "Mention our 10% senior discount when the customer mentions they're over 65",
    "For AC installations, mention our GreenSky financing partnership"
  ]
}
EOF

cat > "${CONFIGS_DIR}/testzoe.json" <<'EOF'
{
  "businessName": "Test Style Shop",
  "ownerName": "Jen Park",
  "vertical": "ecommerce",
  "agentName": "TestZoe",
  "communicationStyle": "warm",
  "channels": ["webchat"],
  "timezone": "America/New_York",
  "businessHours": "Mon-Fri 9am-6pm",
  "businessKnowledge": {
    "description": "DTC fashion accessories brand on Shopify. Handcrafted jewelry and leather goods. Based in Brooklyn, NY. ~200 orders/month.",
    "services": "Online retail, custom engraving on select items, gift wrapping available",
    "faqs": [
      { "q": "How long does shipping take?", "a": "Standard shipping is 5-7 business days. Expedited (2-3 days) available at checkout. Free shipping on orders over $75." },
      { "q": "What's your return policy?", "a": "30-day returns on unused items in original packaging. Custom/engraved items are final sale. We cover return shipping for defective products." },
      { "q": "Can I get custom engraving?", "a": "Yes! Most jewelry and leather items can be engraved. Add your text in the personalization field at checkout." }
    ]
  },
  "escalationRules": {
    "immediate": ["Refund requests over $100", "Product defect or safety reports", "Customers with 2+ unresolved contacts", "Angry or threatening customers", "Wholesale inquiries"],
    "dailySummary": ["Tickets handled", "Carts recovered", "Reviews collected", "Common support themes"]
  },
  "customRules": [
    "Never offer discounts or coupon codes without owner approval",
    "For orders over $150, mention free shipping upgrade to expedited",
    "If customer asks about wholesale, collect business name and email, then escalate to Jen"
  ]
}
EOF

# ─── Generate + Deploy each agent ────────────────────────────

AGENTS=("testmaya" "testcole" "testalex" "testsophia" "testjake" "testzoe")
DISPLAY=("TestMaya" "TestCole" "TestAlex" "TestSophia" "TestJake" "TestZoe")
VERTICALS=("restaurant" "realtor" "fitness" "medical" "home-services" "ecommerce")

cd "$PROJECT_DIR"

header "Generating Workspaces"

for i in "${!AGENTS[@]}"; do
  agent="${AGENTS[$i]}"
  display="${DISPLAY[$i]}"
  config="${CONFIGS_DIR}/${agent}.json"

  info "Generating ${display} (${VERTICALS[$i]})..."
  if npx tsx scripts/generate-workspace.ts "$config" 2>&1 | tail -1; then
    success "${display} workspace generated"
  else
    fail "Failed to generate ${display}"
  fi
done

header "Deploying Agents"

for i in "${!AGENTS[@]}"; do
  agent="${AGENTS[$i]}"
  display="${DISPLAY[$i]}"
  src="${PROJECT_DIR}/workspaces/${display}"
  dest="${AGENTS_DIR}/${agent}"

  if [[ ! -d "$src" ]]; then
    fail "${display}: workspace not found at ${src}"
    continue
  fi

  # Clean previous deployment
  if [[ -d "$dest" ]]; then
    rm -rf "$dest"
  fi

  # Copy workspace
  mkdir -p "$dest"
  cp -r "${src}/"* "$dest/"
  mkdir -p "${dest}/memory"
  touch "${dest}/SESSION-STATE.md" "${dest}/RECENT_CONTEXT.md"
  if [[ ! -f "${dest}/MEMORY.md" ]]; then
    printf "# Agent Memory\n\n_Initialized by ClawStaff deployment._\n" > "${dest}/MEMORY.md"
  fi

  # Remove old agent registration + stale locks
  if openclaw agents list 2>&1 | grep -q "${agent}"; then
    openclaw agents delete "${agent}" 2>/dev/null || true
  fi
  rm -f ~/.openclaw/agents/"${agent}"/sessions/*.lock 2>/dev/null || true

  # Register with Gateway
  openclaw agents add "${agent}" \
    --workspace "$dest" \
    --model "anthropic/claude-sonnet-4-6" \
    --non-interactive 2>&1 | grep -v "Doctor warnings" | grep -v "telegram" | grep -v "─" | grep -v "│" | grep -v "├" | grep -v "◇" || true

  # Set per-agent model
  python3 -c "
import json
config_path = '$HOME/.openclaw/openclaw.json'
with open(config_path, 'r') as f:
    config = json.load(f)
for a in config.get('agents', {}).get('list', []):
    if a.get('id') == '${agent}':
        a['model'] = {'primary': 'anthropic/claude-sonnet-4-6'}
        break
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)
"

  success "${display} deployed -> ~/clawstaff/agents/${agent}/"
done

# ─── Restart Gateway ─────────────────────────────────────────

header "Restarting Gateway"

openclaw gateway restart 2>&1 | grep -v "Doctor warnings" | grep -v "telegram" | grep -v "─" | grep -v "│" | grep -v "├" | grep -v "◇" || true
sleep 5

# Verify all agents registered
AGENT_LIST=$(openclaw agents list 2>&1)
echo ""
for i in "${!AGENTS[@]}"; do
  agent="${AGENTS[$i]}"
  display="${DISPLAY[$i]}"
  if echo "$AGENT_LIST" | grep -q "${agent}"; then
    success "${display} registered"
  else
    fail "${display} NOT registered"
  fi
done

# ─── Print access info ───────────────────────────────────────

header "Agent Access"

echo ""
echo -e "  ${BOLD}All 6 agents are deployed and accessible via:${NC}"
echo ""
echo -e "  ${CYAN}Dashboard:${NC} ${DASHBOARD_URL}"
echo ""
echo -e "  ${CYAN}CLI (send messages to any agent):${NC}"
for i in "${!AGENTS[@]}"; do
  echo "    openclaw agent --agent ${AGENTS[$i]} --message \"Hello\""
done
echo ""
echo -e "  ${CYAN}Interactive TUI:${NC}"
echo "    openclaw tui"
echo ""
echo -e "  ${BOLD}Run the vertical test suite:${NC}"
echo "    npx tsx scripts/local/test-all-verticals.ts"
echo ""
