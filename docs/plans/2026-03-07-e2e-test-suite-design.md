# E2E Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create `/scripts/test-e2e.ts` and `/docs/e2e-test-runbook.md` — a comprehensive end-to-end test suite that validates the full ClawStaff system locally before VPS deployment.

**Architecture:** Single orchestrator script (`test-e2e.ts`) runs 6 test groups sequentially, each returning structured results. Reuses the existing `test-all-verticals.ts` pattern (sendMessage + gradeResponse + regex matching). Results logged to `docs/test-results/YYYY-MM-DD.md` and issues to `docs/known-issues.md`.

**Tech Stack:** TypeScript (tsx), OpenClaw CLI, curl for API routes, Moltbook API, Scout discovery pipeline, Stripe CLI

---

### Task 1: Create the runbook (`docs/e2e-test-runbook.md`)

**Files:**
- Create: `docs/e2e-test-runbook.md`

**Step 1: Write the runbook**

Document prerequisites, how to run each test, expected outcomes, and troubleshooting. Cover:
- Prerequisites (OpenClaw gateway, dev server, Stripe CLI, env vars)
- 6 test descriptions with pass criteria
- CLI flags (--test N, --skip N)
- How to read results
- Common failure modes

**Step 2: Commit**

```bash
git add docs/e2e-test-runbook.md
git commit -m "docs: add E2E test runbook"
```

---

### Task 2: Create the E2E test script — scaffolding + preflight

**Files:**
- Create: `scripts/test-e2e.ts`

**Step 1: Write the script scaffolding**

Structure:
- CLI arg parsing (--test N, --skip N)
- preflight() — check Gateway health, dev server, env vars
- Stub functions for test1 through test6
- Result types (TestGroupResult, TestStepResult)
- Report generator (markdown output)
- Main runner

Key patterns reused from `scripts/local/test-all-verticals.ts`:
- `sendMessage()` — execSync with openclaw CLI
- `gradeResponse()` — regex matching with PASS/PARTIAL/FAIL
- `clearSessionLocks()` — rm stale locks before tests
- `generateReport()` — markdown output to docs/test-results/

**Step 2: Commit**

```bash
git add scripts/test-e2e.ts
git commit -m "feat: scaffold E2E test suite with preflight checks"
```

---

### Task 3: Test 1 — Agent Deployment Pipeline

**Step 1: Implement test1_deployment()**

Steps to validate:
1. Check workspace files exist in `workspaces/TestMaya/` (SOUL.md, USER.md, HEARTBEAT.md, TOOLS.md, AGENTS.md)
2. Check agent deployed to `~/clawstaff/agents/testmaya/` (SOUL.md exists)
3. Verify Gateway recognizes agent (`openclaw agents list` includes testmaya)
4. Send a test message via `openclaw agent --agent testmaya --message "Hello, what do you do?"`
5. Grade response (should mention reviews, reservations, restaurant, Test Bistro)
6. Check if memory directory exists

Grade: PASS if all steps succeed. PARTIAL if message works but memory missing. FAIL if agent not recognized or no response.

**Step 2: Commit**

---

### Task 4: Test 2 — Agent Core Functionality (all 6 verticals)

**Step 1: Implement test2_verticals()**

Reuse the exact test definitions from `scripts/local/test-all-verticals.ts`:
- 18 tests, 3 per vertical
- Same sendMessage/gradeResponse/clearSessionLocks pattern
- Same regex expectations

Additional tests per the user's spec:
- Restaurant: customer inquiry, escalation trigger ("I want a refund"), heartbeat check
- Real Estate: lead inquiry, showing request, market prediction deferral, 24hr follow-up check
- Fitness: membership inquiry, discouraged member, inactive re-engagement
- Medical: appointment request, insurance escalation, urgent pain
- Home Services: pricing (no quote), emergency handling
- E-Commerce: order status, angry repeat complaint escalation

The existing 18 tests already cover most of these. Add the "24hr no-response follow-up draft" and "heartbeat daily summary" checks as memory file existence checks (not message tests).

**Step 2: Commit**

---

### Task 5: Test 3 — Dashboard Data Flow

**Step 1: Implement test3_dashboard()**

Steps:
1. Verify dev server is running on localhost:3000 (curl health check)
2. Send 2-3 messages to testmaya via OpenClaw CLI (creates session data)
3. Wait 5 seconds for filesystem writes
4. Hit `GET http://localhost:3000/api/agent/testmaya/stats` — verify JSON shape:
   - `isDemo` should be `false` (real data exists)
   - `identity.agentName` should be "TestMaya" or similar
   - `identity.vertical` should be "restaurant"
   - `stats.totalMessages` should be > 0
   - `taskBreakdown` should have restaurant-specific labels
5. Hit `GET http://localhost:3000/api/agent/testmaya/messages` — verify:
   - `conversations` array has at least 1 entry
   - First conversation has messages with user + assistant roles
6. Verify task labels match restaurant vertical (reviewsHandled, reservationsManaged, etc.)

Grade: PASS if real data with correct vertical labels. PARTIAL if data present but wrong labels. FAIL if isDemo or no data.

**Step 2: Commit**

---

### Task 6: Test 4 — Moltbook

**Step 1: Implement test4_moltbook()**

Steps:
1. Hit `GET http://localhost:3000/api/moltbook?agentId=testmaya` — verify:
   - `isDemo` is `false`
   - `profile.agentId` is present
   - `profile.name` is "testmaya"
   - `insights` array has entries (from real feed)
2. Verify Moltbook profile URL responds:
   - `curl https://www.moltbook.com/u/testmaya` — should return 200
3. Check that at least 1 post exists (from our earlier registration)
   - Search via `GET https://www.moltbook.com/api/v1/search?q=ClawStaff+testmaya`

Note: Posting is rate-limited (1 per 30 min) so we verify existing post rather than creating new.

Grade: PASS if live data + profile accessible. PARTIAL if API works but no posts. FAIL if isDemo or API errors.

**Step 2: Commit**

---

### Task 7: Test 5 — Scout Discovery (mock pipeline)

**Step 1: Implement test5_scout()**

Steps:
1. Import `runDailyPipeline` from `src/lib/scout/discovery.ts`
2. Run pipeline: `runDailyPipeline("restaurant", { city: "Tampa", state: "FL", zipRadius: 5 })`
3. Verify results:
   - `businesses.length >= 10` (mock scraper generates 15-20)
   - `scored.length >= 10` (all get scored)
   - Scored prospects have scores 0-100
   - At least some prospects score 60+ (qualified)
4. Write drafts to `~/clawstaff/scout/drafts/`:
   - Save `reportMarkdown` to `~/clawstaff/scout/drafts/YYYY-MM-DD-discovery.md`
   - Save prospect dossiers
5. Verify files written to disk
6. Note: these are mock businesses from MockGoogleMapsScraper, not real

Grade: PASS if pipeline runs, 10+ prospects found, drafts written. FAIL if pipeline errors or <10 prospects.

**Step 2: Commit**

---

### Task 8: Test 6 — Stripe (test mode)

**Step 1: Implement test6_stripe()**

Steps:
1. Check if Stripe CLI webhook listener is running (curl localhost:3000/api/stripe/webhook with empty body — should get 400 not connection refused)
2. If not running, return SKIP with instructions
3. Create a Stripe Checkout session via `POST http://localhost:3000/api/stripe/create-checkout` with `{ priceId: STRIPE_PRICE_STARTER, email: "test@example.com" }`
4. Verify response contains `url` (checkout URL)
5. Trigger a test webhook event: `stripe trigger checkout.session.completed --api-key $STRIPE_SECRET_KEY`
6. Wait 3 seconds
7. Check `~/clawstaff/clients.json` for new client record

Grade: PASS if checkout URL generated + webhook processed + client record created. PARTIAL if checkout works but webhook fails. FAIL if checkout fails. SKIP if Stripe CLI not running.

**Step 2: Commit**

---

### Task 9: Report generation + known issues tracking

**Step 1: Implement report generation**

- Write results to `docs/test-results/YYYY-MM-DD.md` with summary table + per-test details
- Write/append issues to `docs/known-issues.md`
- Console output with color-coded PASS/PARTIAL/FAIL/SKIP

**Step 2: Final build verification**

Run: `npx next build`
Expected: all routes compile

**Step 3: Commit**

```bash
git add scripts/test-e2e.ts docs/e2e-test-runbook.md
git commit -m "feat: complete E2E test suite with 6 test groups"
```
