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
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  expectToolAttempt: RegExp[];
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

function envSet(name: string): boolean {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) continue;
      if (trimmed.startsWith(`${name}=`) && trimmed.length > name.length + 1) return true;
    }
  }
  return !!process.env[name];
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
    skipIf: () => !envSet("TAVILY_API_KEY"),
    skipReason: "TAVILY_API_KEY not set",
  },

  // ── Tavily (TestJake) ──
  {
    agent: "testjake", vertical: "home-services", skill: "tavily",
    description: "Jake uses Tavily to research HVAC pricing trends",
    message: "Search the web for average HVAC tune-up pricing in the Denver area for 2026. I need to make sure our estimates are competitive.",
    expectToolAttempt: [/hvac|price|denver|average|cost/i],
    skipIf: () => !envSet("TAVILY_API_KEY"),
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
    let forbiddenHit = false;
    if (test.expectAbsent) {
      for (const pattern of test.expectAbsent) {
        if (pattern.test(response)) {
          process.stdout.write(`\r  ${C.red("FAIL")} [${test.agent}] ${test.skill} — ${test.description}\n`);
          console.log(`    ${C.dim(`Forbidden pattern matched: ${pattern.source}`)}`);
          failed++;
          forbiddenHit = true;
          break;
        }
      }
    }
    if (forbiddenHit) continue;

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

    // Brief pause between tests to avoid rate limiting
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
