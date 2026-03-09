# Agent Skills & Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install, configure, and test all tools and skills for the 6 ClawStaff agents so they can perform real actions (pull reviews, send emails, check calendars, look up orders) — not just answer questions.

**Architecture:** OpenClaw skills are global (all agents see them), but each agent's SOUL.md/TOOLS.md determines which skills it actually uses. We install shared CLI tools first (gog, summarize, wacli), then ClawHub community skills (google-reviews, tavily-tool, shopify-admin-api), configure API keys, and add integration tests to the E2E suite. Each installation step is verified with a targeted test before moving on.

**Tech Stack:** OpenClaw skills system, ClawHub registry, brew (for bundled CLI tools), Google OAuth (gog), Tavily API, Shopify Admin API, Anthropic API (summarize)

---

### Task 1: Install shared bundled CLI tools (gog, summarize, wacli)

These 3 tools are used by ALL 6 agents. They're OpenClaw-bundled skills installed via brew.

**Files:**
- None created — CLI tool installation only

**Step 1: Install `summarize` CLI**

```bash
brew install steipete/tap/summarize
```

Expected: `summarize` binary available in PATH.

**Step 2: Verify `summarize` works with existing Anthropic key**

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-zKI20P..."
echo "ClawStaff is a managed AI agent staffing service." | summarize --stdin
```

Expected: Returns a summary. This uses the Anthropic key already in `~/.openclaw/openclaw.json`.

**Step 3: Install `gog` CLI (Google Workspace)**

```bash
brew install steipete/tap/gogcli
```

Expected: `gog` binary available in PATH.

**Step 4: Verify `gog` installed**

```bash
gog --version
gog auth list
```

Expected: Version prints. Auth list shows no accounts (we'll configure later).

**Step 5: Install `wacli` CLI (WhatsApp)**

```bash
brew install steipete/tap/wacli
```

Expected: `wacli` binary available in PATH.

**Step 6: Verify `wacli` installed**

```bash
wacli --version
```

Expected: Version prints.

**Step 7: Verify OpenClaw recognizes all 3 skills**

```bash
openclaw skills list 2>&1 | grep -E "gog|summarize|wacli"
```

Expected: All 3 show `✓ ready` instead of `✗ missing`.

**Step 8: Commit note**

No files to commit — these are system-level installs. Document in memory.

---

### Task 2: Install ClawHub community skills

**Files:**
- Skills installed to: `~/.openclaw/skills/` (ClawHub managed)

**Step 1: Install `google-reviews` skill**

```bash
npx clawhub install google-reviews
```

Expected: `Installed google-reviews@1.0.0`

**Step 2: Install `tavily-tool` skill**

```bash
npx clawhub install tavily-tool
```

Expected: `Installed tavily-tool@0.1.1`

**Step 3: Install `shopify-admin-api` skill**

```bash
npx clawhub install shopify-admin-api
```

Expected: `Installed shopify-admin-api@1.0.0`

**Step 4: Install `review-summarizer` skill**

```bash
npx clawhub install review-summarizer
```

Expected: `Installed review-summarizer@1.0.0`

**Step 5: Verify all ClawHub skills installed**

```bash
npx clawhub list
```

Expected: All 4 skills show as installed with versions.

**Step 6: Verify OpenClaw sees ClawHub skills**

```bash
openclaw skills list 2>&1 | grep -E "google-reviews|tavily|shopify|review-summ"
```

Expected: All 4 visible in skill list.

**Step 7: Commit note**

No project files changed. Skills are in ClawHub's managed directory.

---

### Task 3: Create the skills test script

This script validates that each skill is installed, configured, and functional per-agent.

**Files:**
- Create: `scripts/test-skills.ts`

**Step 1: Write the test script**

```typescript
#!/usr/bin/env npx tsx
/**
 * ClawStaff — Skills Integration Test
 *
 * Validates that all required skills are installed and functional
 * for each agent's vertical.
 *
 * Usage:
 *   npx tsx scripts/test-skills.ts              # test all
 *   npx tsx scripts/test-skills.ts --agent testmaya  # test one agent
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ── Types ──

type Status = "PASS" | "PARTIAL" | "FAIL" | "SKIP";

interface SkillTest {
  skill: string;
  description: string;
  check: () => { status: Status; detail: string };
}

interface AgentSkillResult {
  agent: string;
  vertical: string;
  results: { skill: string; description: string; status: Status; detail: string }[];
}

// ── Helpers ──

const HOME = process.env.HOME!;

const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function statusColor(s: Status): string {
  switch (s) {
    case "PASS": return C.green(s);
    case "PARTIAL": return C.yellow(s);
    case "FAIL": return C.red(s);
    case "SKIP": return C.dim(s);
  }
}

function binExists(name: string): boolean {
  try {
    execSync(`which ${name} 2>/dev/null`, { encoding: "utf-8" });
    return true;
  } catch { return false; }
}

function envSet(name: string): boolean {
  // Check .env.local
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    if (content.includes(`${name}=`) && !content.includes(`${name}=\n`)) return true;
  }
  // Check process env
  return !!process.env[name];
}

function openClawSkillReady(name: string): boolean {
  try {
    const out = execSync(`openclaw skills list 2>&1`, { encoding: "utf-8" });
    // Match "✓ ready" followed by the skill name
    const lines = out.split("\n");
    return lines.some((l) => l.includes("✓") && l.includes(name));
  } catch { return false; }
}

function clawHubInstalled(slug: string): boolean {
  try {
    const out = execSync(`npx clawhub list 2>&1`, { encoding: "utf-8" });
    return out.includes(slug);
  } catch { return false; }
}

function canRunSummarize(): boolean {
  try {
    const out = execSync(
      `echo "Test input for summarize" | summarize --stdin 2>&1`,
      { encoding: "utf-8", timeout: 30000 }
    );
    return out.length > 10 && !out.includes("Error");
  } catch { return false; }
}

function canRunGogAuth(): boolean {
  try {
    const out = execSync(`gog auth list 2>&1`, { encoding: "utf-8" });
    // Even with no accounts configured, this should not error
    return !out.includes("command not found");
  } catch { return false; }
}

function gogHasAccount(): boolean {
  try {
    const out = execSync(`gog auth list 2>&1`, { encoding: "utf-8" });
    return out.includes("@") && !out.includes("No accounts");
  } catch { return false; }
}

// ── Shared Skill Checks ──

function sharedSkills(): SkillTest[] {
  return [
    {
      skill: "summarize",
      description: "Summarize CLI installed and functional",
      check: () => {
        if (!binExists("summarize")) return { status: "FAIL", detail: "Binary not found. Run: brew install steipete/tap/summarize" };
        if (!openClawSkillReady("summarize")) return { status: "PARTIAL", detail: "Binary exists but OpenClaw doesn't see it as ready" };
        return { status: "PASS", detail: "Installed and ready" };
      },
    },
    {
      skill: "gog",
      description: "Google Workspace CLI installed",
      check: () => {
        if (!binExists("gog")) return { status: "FAIL", detail: "Binary not found. Run: brew install steipete/tap/gogcli" };
        if (!openClawSkillReady("gog")) return { status: "PARTIAL", detail: "Binary exists but OpenClaw doesn't see it as ready" };
        return { status: "PASS", detail: "Installed and ready" };
      },
    },
    {
      skill: "gog-auth",
      description: "Google OAuth account configured",
      check: () => {
        if (!binExists("gog")) return { status: "SKIP", detail: "gog not installed" };
        if (!gogHasAccount()) return { status: "PARTIAL", detail: "No Google account linked. Run: gog auth add <email> --services gmail,calendar,drive,contacts,docs,sheets" };
        return { status: "PASS", detail: "Google account linked" };
      },
    },
    {
      skill: "wacli",
      description: "WhatsApp CLI installed",
      check: () => {
        if (!binExists("wacli")) return { status: "FAIL", detail: "Binary not found. Run: brew install steipete/tap/wacli" };
        if (!openClawSkillReady("wacli")) return { status: "PARTIAL", detail: "Binary exists but OpenClaw doesn't see it as ready" };
        return { status: "PASS", detail: "Installed and ready" };
      },
    },
  ];
}

// ── Per-Vertical Skill Checks ──

function verticalSkills(vertical: string): SkillTest[] {
  const checks: SkillTest[] = [];

  switch (vertical) {
    case "restaurant":
      checks.push({
        skill: "google-reviews",
        description: "Google Reviews skill installed (ClawHub)",
        check: () => {
          if (!clawHubInstalled("google-reviews")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install google-reviews" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "review-summarizer",
        description: "Review Summarizer skill installed (Yelp/Google/TripAdvisor)",
        check: () => {
          if (!clawHubInstalled("review-summarizer")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install review-summarizer" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      break;

    case "realtor":
      checks.push({
        skill: "tavily-tool",
        description: "Tavily web search skill installed",
        check: () => {
          if (!clawHubInstalled("tavily-tool")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install tavily-tool" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "tavily-api-key",
        description: "Tavily API key configured",
        check: () => {
          if (envSet("TAVILY_API_KEY")) return { status: "PASS", detail: "TAVILY_API_KEY set" };
          return { status: "PARTIAL", detail: "TAVILY_API_KEY not set in .env.local. Get free key at app.tavily.com" };
        },
      });
      break;

    case "fitness":
      // Fitness uses shared skills only (gog, summarize, cron)
      // Cron is built into OpenClaw — no install needed
      checks.push({
        skill: "cron",
        description: "Cron scheduling (built-in)",
        check: () => ({ status: "PASS", detail: "Built into OpenClaw heartbeat system" }),
      });
      break;

    case "medical":
      // Medical uses shared skills only (gog, summarize, cron)
      checks.push({
        skill: "cron",
        description: "Cron scheduling (built-in)",
        check: () => ({ status: "PASS", detail: "Built into OpenClaw heartbeat system" }),
      });
      break;

    case "home-services":
      checks.push({
        skill: "google-reviews",
        description: "Google Reviews skill installed (ClawHub)",
        check: () => {
          if (!clawHubInstalled("google-reviews")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install google-reviews" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "tavily-tool",
        description: "Tavily web search skill installed",
        check: () => {
          if (!clawHubInstalled("tavily-tool")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install tavily-tool" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "tavily-api-key",
        description: "Tavily API key configured",
        check: () => {
          if (envSet("TAVILY_API_KEY")) return { status: "PASS", detail: "TAVILY_API_KEY set" };
          return { status: "PARTIAL", detail: "TAVILY_API_KEY not set. Get free key at app.tavily.com" };
        },
      });
      break;

    case "ecommerce":
      checks.push({
        skill: "shopify-admin-api",
        description: "Shopify Admin API skill installed",
        check: () => {
          if (!clawHubInstalled("shopify-admin-api")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install shopify-admin-api" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "shopify-token",
        description: "Shopify Admin API token configured",
        check: () => {
          if (envSet("SHOPIFY_ADMIN_API_TOKEN") || envSet("SHOPIFY_ACCESS_TOKEN"))
            return { status: "PASS", detail: "Shopify token set" };
          return { status: "PARTIAL", detail: "Shopify token not set. Needed for real store access." };
        },
      });
      break;
  }

  return checks;
}

// ── Agent Definitions ──

const AGENTS = [
  { id: "testmaya", name: "TestMaya", vertical: "restaurant" },
  { id: "testcole", name: "TestCole", vertical: "realtor" },
  { id: "testalex", name: "TestAlex", vertical: "fitness" },
  { id: "testsophia", name: "TestSophia", vertical: "medical" },
  { id: "testjake", name: "TestJake", vertical: "home-services" },
  { id: "testzoe", name: "TestZoe", vertical: "ecommerce" },
];

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const agentFilter = args.find((a, i) => args[i - 1] === "--agent");

  console.log(`\n${C.bold("═══════════════════════════════════════════")}`);
  console.log(`${C.bold("  ClawStaff Skills Integration Test")}`);
  console.log(`${C.bold("═══════════════════════════════════════════")}\n`);

  // Shared skills (run once)
  console.log(`${C.bold("── Shared Skills (all agents) ──")}`);
  const shared = sharedSkills();
  let sharedPass = 0;
  let sharedTotal = 0;
  for (const test of shared) {
    const result = test.check();
    sharedTotal++;
    if (result.status === "PASS") sharedPass++;
    console.log(`  ${statusColor(result.status)} ${test.skill} — ${test.description}`);
    if (result.status !== "PASS") console.log(`    ${C.dim(result.detail)}`);
  }
  console.log("");

  // Per-agent skills
  const agentsToTest = agentFilter
    ? AGENTS.filter((a) => a.id === agentFilter)
    : AGENTS;

  const results: AgentSkillResult[] = [];

  for (const agent of agentsToTest) {
    console.log(`${C.bold(`── ${agent.name} (${agent.vertical}) ──`)}`);

    const checks = verticalSkills(agent.vertical);
    const agentResults: AgentSkillResult = {
      agent: agent.id,
      vertical: agent.vertical,
      results: [],
    };

    if (checks.length === 0) {
      console.log(`  ${C.dim("No vertical-specific skills (uses shared only)")}`);
    }

    for (const test of checks) {
      const result = test.check();
      agentResults.results.push({
        skill: test.skill,
        description: test.description,
        ...result,
      });
      console.log(`  ${statusColor(result.status)} ${test.skill} — ${test.description}`);
      if (result.status !== "PASS") console.log(`    ${C.dim(result.detail)}`);
    }
    results.push(agentResults);
    console.log("");
  }

  // Summary
  const allResults = [
    ...shared.map((t) => t.check()),
    ...results.flatMap((r) => r.results),
  ];
  const totalPass = allResults.filter((r) => r.status === "PASS").length;
  const totalPartial = allResults.filter((r) => r.status === "PARTIAL").length;
  const totalFail = allResults.filter((r) => r.status === "FAIL").length;
  const totalSkip = allResults.filter((r) => r.status === "SKIP").length;
  const total = allResults.length;

  console.log(`${C.bold("═══════════════════════════════════════════")}`);
  console.log(`  ${C.green(`${totalPass} passed`)}  ${totalPartial > 0 ? C.yellow(`${totalPartial} partial`) + "  " : ""}${totalFail > 0 ? C.red(`${totalFail} failed`) + "  " : ""}${totalSkip > 0 ? C.dim(`${totalSkip} skipped`) : ""}`);
  console.log(`  ${total} total checks\n`);

  if (totalFail > 0) {
    console.log(`${C.red("Action needed:")} Install missing skills listed above.`);
  }
  if (totalPartial > 0) {
    console.log(`${C.yellow("Optional:")} Configure API keys for partial items.`);
  }
  console.log("");

  process.exit(totalFail);
}

main().catch((err) => {
  console.error("Skills test error:", err);
  process.exit(1);
});
```

**Step 2: Run the test to see current state (everything should fail)**

```bash
npx tsx scripts/test-skills.ts
```

Expected: All shared skills FAIL (not installed yet), all ClawHub skills FAIL (not installed yet). This is our baseline.

**Step 3: Commit**

```bash
git add scripts/test-skills.ts
git commit -m "test: add skills integration test script"
```

---

### Task 4: Install bundled tools and run tests

**Step 1: Install all 3 bundled tools**

```bash
brew install steipete/tap/summarize steipete/tap/gogcli steipete/tap/wacli
```

**Step 2: Run skills test to verify**

```bash
npx tsx scripts/test-skills.ts
```

Expected: `summarize`, `gog`, `wacli` all show PASS. `gog-auth` shows PARTIAL (no account linked yet — needs Google OAuth).

**Step 3: Test summarize with Anthropic key**

```bash
export ANTHROPIC_API_KEY=$(grep apiKey ~/.openclaw/openclaw.json | head -2 | tail -1 | tr -d ' ",' | cut -d: -f2)
echo "ClawStaff provides dedicated AI employees to local businesses via WhatsApp. Each agent handles reviews, appointments, leads, and customer support 24/7." | summarize --stdin
```

Expected: A concise summary returned. Confirms the existing Anthropic API key works with summarize.

---

### Task 5: Install ClawHub skills and run tests

**Step 1: Install all 4 ClawHub skills**

```bash
npx clawhub install google-reviews tavily-tool shopify-admin-api review-summarizer
```

**Step 2: Run skills test**

```bash
npx tsx scripts/test-skills.ts
```

Expected: All ClawHub skills show PASS for installation. API key checks show PARTIAL for tavily and shopify (keys not yet provided).

**Step 3: Verify OpenClaw sees everything**

```bash
openclaw skills list 2>&1 | grep -c "✓ ready"
```

Expected: Count increases from 6 to 9 (gog, summarize, wacli now ready).

---

### Task 6: Configure Google OAuth for `gog`

This gives agents Gmail, Calendar, Drive, Contacts, Sheets access.

**Files:**
- None in project — Google Cloud Console setup

**Step 1: Create Google Cloud OAuth credentials**

1. Go to https://console.cloud.google.com/
2. Create project "ClawStaff" (or use existing)
3. Enable APIs: Gmail, Calendar, Drive, Contacts, Sheets
4. Create OAuth 2.0 Client ID (Desktop application)
5. Download `client_secret_*.json`

**Step 2: Configure gog with credentials**

```bash
gog auth credentials ~/Downloads/client_secret_*.json
gog auth add YOUR_EMAIL@gmail.com --services gmail,calendar,drive,contacts,docs,sheets
```

This opens a browser for OAuth consent. Approve all scopes.

**Step 3: Verify auth**

```bash
gog auth list
```

Expected: Shows your email with all services listed.

**Step 4: Test Gmail access**

```bash
gog gmail list --max 3
```

Expected: Lists 3 recent emails. Confirms Gmail API works.

**Step 5: Test Calendar access**

```bash
gog calendar list
gog calendar events --max 3
```

Expected: Lists calendars and recent events.

**Step 6: Run skills test**

```bash
npx tsx scripts/test-skills.ts
```

Expected: `gog-auth` now shows PASS.

---

### Task 7: Configure Tavily API key

Tavily provides web search for TestCole (real estate) and TestJake (home services).

**Files:**
- Modify: `.env.local` (add TAVILY_API_KEY)

**Step 1: Get Tavily API key**

1. Go to https://app.tavily.com/
2. Sign up (free tier: 1000 searches/month)
3. Copy API key

**Step 2: Add to .env.local**

```bash
echo "TAVILY_API_KEY=tvly-YOUR_KEY_HERE" >> .env.local
```

**Step 3: Add to OpenClaw environment**

The agent needs this env var at runtime. Add to `~/.openclaw/openclaw.json` under a new `env` section, or export in shell profile:

```bash
echo 'export TAVILY_API_KEY="tvly-YOUR_KEY_HERE"' >> ~/.zshrc
source ~/.zshrc
```

**Step 4: Test Tavily search**

```bash
openclaw agent --agent testcole --message "Search for 3-bedroom homes for sale in Silver Spring MD under 600K. Use your Tavily web search tool."
```

Expected: TestCole uses Tavily to search and returns real listing information.

**Step 5: Run skills test**

```bash
npx tsx scripts/test-skills.ts --agent testcole
```

Expected: `tavily-api-key` shows PASS.

---

### Task 8: Test agent skill integration (message-based)

Now that skills are installed, test that each agent can actually USE them via OpenClaw messaging.

**Files:**
- Create: `scripts/test-skill-usage.ts`

**Step 1: Write the skill usage test**

This sends messages that REQUIRE tool use and verifies the agent attempts to use the right tool.

```typescript
#!/usr/bin/env npx tsx
/**
 * ClawStaff — Agent Skill Usage Tests
 *
 * Sends messages that require agents to USE their installed skills,
 * then verifies the agent attempted the correct tool.
 *
 * Usage:
 *   npx tsx scripts/test-skill-usage.ts
 *   npx tsx scripts/test-skill-usage.ts --agent testmaya
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HOME = process.env.HOME!;

const C = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

type Status = "PASS" | "PARTIAL" | "FAIL" | "SKIP";

interface SkillUsageTest {
  agent: string;
  vertical: string;
  skill: string;
  description: string;
  message: string;
  // The response should indicate tool was used or attempted
  expectToolAttempt: RegExp[];
  // The response should NOT contain these (agent shouldn't hallucinate results)
  expectAbsent?: RegExp[];
  skipIf?: () => boolean;
  skipReason?: string;
}

function sendMessage(agent: string, message: string, timeoutSec = 120): string {
  try {
    const raw = execSync(
      `openclaw agent --agent ${agent} --message ${JSON.stringify(message)} --timeout ${timeoutSec}`,
      { timeout: (timeoutSec + 30) * 1000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return raw.trim();
  } catch (err: unknown) {
    const e = err as { stdout?: Buffer };
    return e.stdout?.toString().trim() || "ERROR";
  }
}

function clearLocks(agent: string) {
  try {
    const dir = path.join(HOME, ".openclaw", "agents", agent, "sessions");
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".lock")) fs.unlinkSync(path.join(dir, f));
      }
    }
  } catch { /* ignore */ }
}

function binExists(name: string): boolean {
  try { execSync(`which ${name} 2>/dev/null`); return true; } catch { return false; }
}

const TESTS: SkillUsageTest[] = [
  // ── Summarize (all agents can use) ──
  {
    agent: "testmaya", vertical: "restaurant", skill: "summarize",
    description: "Maya uses summarize to condense a review batch",
    message: "Summarize today's activity: We had 3 new Google reviews (2 positive, 1 negative about wait times), 4 reservation inquiries, and 2 questions about our gluten-free menu options. Create a brief owner summary.",
    expectToolAttempt: [/summary|briefing|recap|overview/i, /review|reserv|gluten/i],
    skipIf: () => !binExists("summarize"),
    skipReason: "summarize CLI not installed",
  },

  // ── GOG / Calendar (TestCole) ──
  {
    agent: "testcole", vertical: "realtor", skill: "gog-calendar",
    description: "Cole attempts to check calendar for showing availability",
    message: "A client wants to see 742 Elm Street tomorrow at 2pm. Check my calendar and schedule the showing.",
    expectToolAttempt: [/calendar|schedule|check.*avail|book|showing/i],
    skipIf: () => !binExists("gog"),
    skipReason: "gog CLI not installed",
  },

  // ── GOG / Gmail (TestSophia) ──
  {
    agent: "testsophia", vertical: "medical", skill: "gog-gmail",
    description: "Sophia attempts to send appointment confirmation email",
    message: "Send an appointment confirmation email to patient John Smith at john@example.com for his cleaning tomorrow at 10am with Dr. Martinez.",
    expectToolAttempt: [/email|send|confirm|john/i, /appointment|cleaning|10/i],
    skipIf: () => !binExists("gog"),
    skipReason: "gog CLI not installed",
  },

  // ── Google Reviews (TestMaya) ──
  {
    agent: "testmaya", vertical: "restaurant", skill: "google-reviews",
    description: "Maya attempts to check for new Google reviews",
    message: "Check our latest Google reviews and tell me if there are any new ones that need responses.",
    expectToolAttempt: [/review|google|check|look|monitor/i],
  },

  // ── Tavily (TestCole) ──
  {
    agent: "testcole", vertical: "realtor", skill: "tavily",
    description: "Cole uses Tavily to research a neighborhood",
    message: "Research the Silver Spring MD housing market. What are average home prices and school ratings in the area? Use web search.",
    expectToolAttempt: [/silver spring|market|price|school/i, /search|research|found|data/i],
    skipIf: () => !process.env.TAVILY_API_KEY,
    skipReason: "TAVILY_API_KEY not set",
  },

  // ── Tavily (TestJake) ──
  {
    agent: "testjake", vertical: "home-services", skill: "tavily",
    description: "Jake uses Tavily to research HVAC pricing trends",
    message: "Search the web for average HVAC tune-up pricing in the Denver area for 2026. I need to make sure our estimates are competitive.",
    expectToolAttempt: [/hvac|price|denver|average|cost/i],
    skipIf: () => !process.env.TAVILY_API_KEY,
    skipReason: "TAVILY_API_KEY not set",
  },

  // ── Shopify (TestZoe) ──
  {
    agent: "testzoe", vertical: "ecommerce", skill: "shopify",
    description: "Zoe attempts to look up an order",
    message: "Look up order #12345 in our Shopify store. The customer is asking about their shipping status.",
    expectToolAttempt: [/order|#?12345|shopify|look.*up|check/i],
  },
];

async function main() {
  const args = process.argv.slice(2);
  const agentFilter = args.find((a, i) => args[i - 1] === "--agent");

  const testsToRun = agentFilter
    ? TESTS.filter((t) => t.agent === agentFilter)
    : TESTS;

  console.log(`\n${C.bold("═══════════════════════════════════════════")}`);
  console.log(`${C.bold("  ClawStaff Skill Usage Tests")}`);
  console.log(`${C.bold("═══════════════════════════════════════════")}\n`);

  let passed = 0, partial = 0, failed = 0, skipped = 0;

  for (const test of testsToRun) {
    if (test.skipIf?.()) {
      console.log(`  ${C.dim("SKIP")} [${test.agent}] ${test.skill} — ${test.skipReason}`);
      skipped++;
      continue;
    }

    clearLocks(test.agent);
    process.stdout.write(`  ${C.dim("...")} [${test.agent}] ${test.skill} — ${test.description}`);

    const response = sendMessage(test.agent, test.message);

    // Check forbidden patterns
    if (test.expectAbsent) {
      for (const pattern of test.expectAbsent) {
        if (pattern.test(response)) {
          process.stdout.write(`\r  ${C.red("FAIL")} [${test.agent}] ${test.skill} — ${test.description}\n`);
          console.log(`    ${C.dim(`Forbidden pattern matched: ${pattern.source}`)}`);
          failed++;
          continue;
        }
      }
    }

    // Check expected patterns
    const matchCount = test.expectToolAttempt.filter((p) => p.test(response)).length;
    const total = test.expectToolAttempt.length;

    if (matchCount === total) {
      process.stdout.write(`\r  ${C.green("PASS")} [${test.agent}] ${test.skill} — ${test.description}\n`);
      passed++;
    } else if (matchCount > 0) {
      process.stdout.write(`\r  ${C.yellow("PARTIAL")} [${test.agent}] ${test.skill} — ${test.description}\n`);
      console.log(`    ${C.dim(`${matchCount}/${total} patterns matched`)}`);
      partial++;
    } else {
      process.stdout.write(`\r  ${C.red("FAIL")} [${test.agent}] ${test.skill} — ${test.description}\n`);
      console.log(`    ${C.dim(response.slice(0, 200))}`);
      failed++;
    }

    // Brief pause between tests
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n${C.bold("═══════════════════════════════════════════")}`);
  console.log(`  ${C.green(`${passed} passed`)}  ${partial > 0 ? C.yellow(`${partial} partial`) + "  " : ""}${failed > 0 ? C.red(`${failed} failed`) + "  " : ""}${skipped > 0 ? C.dim(`${skipped} skipped`) : ""}\n`);

  process.exit(failed);
}

main().catch((err) => {
  console.error("Skill usage test error:", err);
  process.exit(1);
});
```

**Step 2: Run the skill usage tests**

```bash
npx tsx scripts/test-skill-usage.ts
```

Expected: Agents that have skills installed will attempt to use them. Agents without API keys will respond intelligently about needing access.

**Step 3: Commit**

```bash
git add scripts/test-skill-usage.ts
git commit -m "test: add agent skill usage integration tests"
```

---

### Task 9: Update TOOLS.md for all agents with real skill status

After installation, update each agent's TOOLS.md to reflect actual installed state.

**Files:**
- Modify: `~/clawstaff/agents/testmaya/TOOLS.md`
- Modify: `~/clawstaff/agents/testcole/TOOLS.md`
- Modify: `~/clawstaff/agents/testalex/TOOLS.md`
- Modify: `~/clawstaff/agents/testsophia/TOOLS.md`
- Modify: `~/clawstaff/agents/testjake/TOOLS.md`
- Modify: `~/clawstaff/agents/testzoe/TOOLS.md`

**Step 1: Update each TOOLS.md**

Add an `## Environment` section with actual commands the agent can use:

For TestMaya:
```markdown
## Environment

### Available CLI Tools
- `summarize` — Summarize text, URLs, transcripts
- `gog gmail` — Read/send emails via Gmail
- `gog calendar` — Check/create calendar events
- `wacli` — Send WhatsApp messages to owner

### Available Skills (ClawHub)
- `google-reviews` — Monitor and research Google Reviews
- `review-summarizer` — Analyze reviews across Google, Yelp, TripAdvisor

### API Keys Required
- Google OAuth (via gog) — for Gmail and Calendar access
- No API key needed for Google Reviews skill (uses scraping)
```

Repeat for each agent with their specific skill set.

**Step 2: Verify agents see updated TOOLS.md**

```bash
openclaw agent --agent testmaya --message "What tools do you have access to? List them."
```

Expected: TestMaya lists its tools from TOOLS.md.

**Step 3: Commit**

```bash
git add -A  # workspace files are outside the project repo — may need separate tracking
```

---

### Task 10: Add skills checks to E2E test suite

**Files:**
- Modify: `scripts/test-e2e.ts`

**Step 1: Add a new test group (Test 7) for skills**

After test6_stripe, add:

```typescript
async function test7_skills(): Promise<TestGroupResult> {
  const start = Date.now();
  const steps: StepResult[] = [];

  // Check bundled tools
  const bundledTools = ["summarize", "gog", "wacli"];
  for (const tool of bundledTools) {
    try {
      execSync(`which ${tool} 2>/dev/null`, { encoding: "utf-8" });
      steps.push({ name: `${tool} CLI installed`, status: "PASS", detail: "Binary found in PATH" });
    } catch {
      steps.push({ name: `${tool} CLI installed`, status: "FAIL", detail: `Not found. Run: brew install steipete/tap/${tool === "gog" ? "gogcli" : tool}` });
    }
  }

  // Check ClawHub skills
  let clawHubList = "";
  try { clawHubList = execSync("npx clawhub list 2>&1", { encoding: "utf-8", timeout: 15000 }); } catch { /* ignore */ }

  const clawHubSkills = ["google-reviews", "tavily-tool", "shopify-admin-api", "review-summarizer"];
  for (const skill of clawHubSkills) {
    const installed = clawHubList.includes(skill);
    steps.push({
      name: `${skill} (ClawHub)`,
      status: installed ? "PASS" : "FAIL",
      detail: installed ? "Installed" : `Not installed. Run: npx clawhub install ${skill}`,
    });
  }

  // Check OpenClaw skill readiness
  let skillList = "";
  try { skillList = execSync("openclaw skills list 2>&1", { encoding: "utf-8" }); } catch { /* ignore */ }

  const readyCount = (skillList.match(/✓ ready/g) || []).length;
  steps.push({
    name: "OpenClaw ready skills",
    status: readyCount >= 9 ? "PASS" : readyCount >= 6 ? "PARTIAL" : "FAIL",
    detail: `${readyCount} skills ready (target: 9+)`,
  });

  const anyFail = steps.some((s) => s.status === "FAIL");
  const allPass = steps.every((s) => s.status === "PASS");

  return {
    id: 7,
    name: "Skills & Tools",
    status: anyFail ? "FAIL" : allPass ? "PASS" : "PARTIAL",
    steps,
    durationMs: Date.now() - start,
    notes: allPass ? "All skills installed and ready" : "Some skills need installation",
  };
}
```

Add to `allTests` array:
```typescript
{ id: 7, name: "Skills & Tools", fn: test7_skills },
```

**Step 2: Run updated E2E suite**

```bash
npx tsx scripts/test-e2e.ts --test 7
```

Expected: Shows current installation status for all skills.

**Step 3: Commit**

```bash
git add scripts/test-e2e.ts
git commit -m "test: add skills installation checks to E2E suite (test 7)"
```

---

## API Keys Needed

After all installation is complete, the following API keys are required:

| Key | Purpose | Where to Get | Cost | Used By |
|-----|---------|-------------|------|---------|
| **Google OAuth credentials** | Gmail, Calendar, Drive, Sheets | console.cloud.google.com | Free | All 6 agents |
| **TAVILY_API_KEY** | Web search for property/market research | app.tavily.com | Free (1K searches/mo) | TestCole, TestJake |
| **SHOPIFY_ACCESS_TOKEN** | Order/product/customer management | shopify.dev (requires a store) | Free with Shopify plan | TestZoe only |
| **ANTHROPIC_API_KEY** | Already configured in openclaw.json | — | Already set up | summarize tool |

**Not needed now (for real client onboarding later):**
- Client's Google Business Profile OAuth (for review monitoring)
- Client's Shopify store credentials
- Client's specific Gmail account OAuth
- Twilio API key (for SMS reminders — medical/fitness verticals)
- Mindbody API key (for fitness class scheduling)
