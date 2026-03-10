# ClawStaff E2E Test Runbook

## Prerequisites

Before running the E2E test suite, ensure:

1. **OpenClaw Gateway running:** `openclaw gateway status` → should show "running"
2. **All 6 test agents deployed:** `openclaw agents list` → should show testmaya, testcole, testalex, testsophia, testjake, testzoe
3. **Next.js dev server running:** `npx next dev` on port 3000
4. **Environment variables set** in `.env.local`:
   - `MOLTBOOK_API_KEY=moltbook_sk_...`
   - `AGENT_DATA_PATH=~/clawstaff/agents`

## Quick Start

```bash
# Run all tests
npx tsx scripts/test-e2e.ts

# Run a specific test
npx tsx scripts/test-e2e.ts --test 2

# Skip a test (e.g. skip Scout)
npx tsx scripts/test-e2e.ts --skip 5
```

## Test Descriptions

### Test 1: Agent Deployment Pipeline

Validates that the onboarding → deployment → messaging pipeline works end-to-end.

**What it checks:**
- Workspace files generated correctly (SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md, AGENTS.md)
- Agent deployed to `~/clawstaff/agents/testmaya/`
- Gateway recognizes the agent
- Agent responds to a test message with business knowledge
- Memory directory exists

**Pass criteria:** Agent responds with restaurant-relevant content within 2 minutes.

### Test 2: Agent Core Functionality (6 verticals)

Sends 18 test messages (3 per vertical) and grades responses against SOUL.md behavioral rules.

**What it checks per vertical:**

| Vertical | Tests |
|----------|-------|
| Restaurant (TestMaya) | Customer inquiry, escalation trigger, business knowledge |
| Real Estate (TestCole) | Lead qualifying, showing scheduling, market prediction deferral |
| Fitness (TestAlex) | Membership inquiry, discouraged member tone, coach referral |
| Medical (TestSophia) | Appointment scheduling, insurance escalation, urgent pain flagging |
| Home Services (TestJake) | No-quote pricing, estimate pushback, emergency escalation |
| E-Commerce (TestZoe) | Order status, return policy, repeat complaint escalation |

**Pass criteria:** Each response graded PASS/PARTIAL/FAIL via regex pattern matching. PASS = all expected patterns present, no forbidden patterns.

### Test 3: Dashboard Data Flow

Verifies that real agent data flows from OpenClaw sessions to the Next.js dashboard.

**What it checks:**
- `GET /api/agent/testmaya/stats` returns real data (not demo)
- Identity has correct vertical ("restaurant")
- Message counts > 0
- Task labels are restaurant-specific (reviewsHandled, reservationsManaged)
- `GET /api/agent/testmaya/messages` returns real conversations

**Pass criteria:** `isDemo: false`, correct vertical labels, message data present.

### Test 4: Moltbook

Verifies live Moltbook integration.

**What it checks:**
- `GET /api/moltbook` returns `isDemo: false` with real profile data
- Agent profile URL accessible on moltbook.com
- Feed insights populated from real Moltbook feed

**Pass criteria:** Live data from Moltbook API, profile URL responds.

### Test 5: Scout Discovery (Mock Pipeline)

Runs the Scout prospecting pipeline with mock data to verify the discovery → scoring → drafting flow.

**What it checks:**
- `runDailyPipeline("restaurant", { city: "Tampa", state: "FL" })` executes successfully
- 10+ businesses discovered and scored
- Qualified prospects (score 60+) identified
- Draft reports written to `~/clawstaff/scout/drafts/`

**Pass criteria:** Pipeline completes, 10+ prospects, drafts on disk. Note: uses MockGoogleMapsScraper — no real API calls.

## Reading Results

Results are saved to `docs/test-results/YYYY-MM-DD.md` with:
- Summary table (test name, status, duration)
- Per-test details (steps, responses, grades)
- SOUL.md tuning notes for non-PASS results

Issues are tracked in `docs/known-issues.md`.

## Troubleshooting

**"Missing agents"** → Run `./scripts/local/deploy-all-test-agents.sh`

**Session lock errors** → `rm ~/.openclaw/agents/*/sessions/*.lock`

**Gateway not responding** → `openclaw gateway restart`

**Dev server not running** → Start with `npx next dev` in a separate terminal

**Moltbook auth failure** → Check `MOLTBOOK_API_KEY` in `.env.local`. Agent must be claimed (visit claim URL).

**Slow responses (>30s)** → Check Anthropic API key in `~/.openclaw/openclaw.json`. Model should be `anthropic/claude-sonnet-4-5`.
