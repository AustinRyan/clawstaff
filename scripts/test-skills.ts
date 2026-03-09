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
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function openClawSkillReady(name: string): boolean {
  try {
    const out = execSync(`openclaw skills list 2>&1`, { encoding: "utf-8" });
    const lines = out.split("\n");
    return lines.some((l) => l.includes("\u2713") && l.toLowerCase().includes(name.toLowerCase()));
  } catch { return false; }
}

function clawHubInstalled(slug: string): boolean {
  try {
    const out = execSync(`npx clawhub list 2>&1`, { encoding: "utf-8", timeout: 15000 });
    return out.toLowerCase().includes(slug.toLowerCase());
  } catch { return false; }
}

function gogHasAccount(): boolean {
  try {
    const out = execSync(`gog auth list 2>&1`, { encoding: "utf-8" });
    return out.includes("@") && !out.toLowerCase().includes("no accounts");
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
    {
      skill: "goplaces",
      description: "Google Places API CLI installed",
      check: () => {
        if (!binExists("goplaces")) return { status: "FAIL", detail: "Binary not found. Run: brew install steipete/tap/goplaces" };
        if (!envSet("GOOGLE_PLACES_API_KEY")) return { status: "PARTIAL", detail: "Installed but GOOGLE_PLACES_API_KEY not set. Get from console.cloud.google.com" };
        return { status: "PASS", detail: "Installed and configured" };
      },
    },
    {
      skill: "google-analytics",
      description: "Google Analytics skill installed (ClawHub)",
      check: () => {
        if (!clawHubInstalled("google-analytics")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install google-analytics" };
        return { status: "PASS", detail: "Installed via ClawHub" };
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
        description: "Review Summarizer skill installed",
        check: () => {
          if (!clawHubInstalled("review-summarizer")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install review-summarizer" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "openclaw-reservation",
        description: "Restaurant reservation/booking skill (ClawCierge)",
        check: () => {
          if (!clawHubInstalled("openclaw-reservation")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install openclaw-reservation" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "resy-hunter",
        description: "Resy reservation monitoring skill",
        check: () => {
          if (!clawHubInstalled("resy-hunter")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install resy-hunter" };
          if (!envSet("RESY_API_KEY")) return { status: "PARTIAL", detail: "Installed but RESY_API_KEY not set" };
          return { status: "PASS", detail: "Installed and configured" };
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
      checks.push({
        skill: "zillow-scraper",
        description: "Zillow property data scraper installed",
        check: () => {
          if (!clawHubInstalled("zillow-scraper")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install zillow-scraper" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      checks.push({
        skill: "real-estate-lead-machine",
        description: "Real estate lead generation skill",
        check: () => {
          if (!clawHubInstalled("real-estate-lead-machine")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install real-estate-lead-machine" };
          return { status: "PASS", detail: "Installed via ClawHub" };
        },
      });
      break;

    case "fitness":
      checks.push({
        skill: "cron",
        description: "Cron scheduling (built-in)",
        check: () => ({ status: "PASS", detail: "Built into OpenClaw heartbeat system" }),
      });
      break;

    case "medical":
      checks.push({
        skill: "cron",
        description: "Cron scheduling (built-in)",
        check: () => ({ status: "PASS", detail: "Built into OpenClaw heartbeat system" }),
      });
      checks.push({
        skill: "twilio",
        description: "Twilio SMS reminders skill installed",
        check: () => {
          if (!clawHubInstalled("twilio")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install twilio" };
          if (!envSet("TWILIO_ACCOUNT_SID")) return { status: "PARTIAL", detail: "Installed but TWILIO_ACCOUNT_SID not set" };
          return { status: "PASS", detail: "Installed and configured" };
        },
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
      checks.push({
        skill: "book-hvac",
        description: "HVAC booking/scheduling skill",
        check: () => {
          if (!clawHubInstalled("book-hvac")) return { status: "FAIL", detail: "Not installed. Run: npx clawhub install book-hvac" };
          return { status: "PASS", detail: "Installed via ClawHub" };
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

  console.log(`\n${C.bold("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550")}`);
  console.log(`${C.bold("  ClawStaff Skills Integration Test")}`);
  console.log(`${C.bold("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550")}\n`);

  // Shared skills (run once)
  console.log(`${C.bold("\u2500\u2500 Shared Skills (all agents) \u2500\u2500")}`);
  const shared = sharedSkills();
  for (const test of shared) {
    const result = test.check();
    console.log(`  ${statusColor(result.status)} ${test.skill} \u2014 ${test.description}`);
    if (result.status !== "PASS") console.log(`    ${C.dim(result.detail)}`);
  }
  console.log("");

  // Per-agent skills
  const agentsToTest = agentFilter
    ? AGENTS.filter((a) => a.id === agentFilter)
    : AGENTS;

  const results: AgentSkillResult[] = [];

  for (const agent of agentsToTest) {
    console.log(`${C.bold(`\u2500\u2500 ${agent.name} (${agent.vertical}) \u2500\u2500`)}`);

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
      console.log(`  ${statusColor(result.status)} ${test.skill} \u2014 ${test.description}`);
      if (result.status !== "PASS") console.log(`    ${C.dim(result.detail)}`);
    }
    results.push(agentResults);
    console.log("");
  }

  // Summary
  const sharedResults = shared.map((t) => t.check());
  const allResults = [
    ...sharedResults,
    ...results.flatMap((r) => r.results),
  ];
  const totalPass = allResults.filter((r) => r.status === "PASS").length;
  const totalPartial = allResults.filter((r) => r.status === "PARTIAL").length;
  const totalFail = allResults.filter((r) => r.status === "FAIL").length;
  const totalSkip = allResults.filter((r) => r.status === "SKIP").length;
  const total = allResults.length;

  console.log(`${C.bold("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550")}`);
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
