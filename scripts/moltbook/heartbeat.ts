#!/usr/bin/env npx tsx
/**
 * ClawStaff — Moltbook Heartbeat Runner
 *
 * Runs a single Moltbook heartbeat cycle for an agent:
 *   1. Check feed for new posts
 *   2. Extract insights → store in knowledge base
 *   3. Engage with high-value posts (upvote + comment)
 *   4. Optionally post weekly performance summary
 *
 * Usage:
 *   npx tsx scripts/moltbook/heartbeat.ts --agent testmaya
 *   npx tsx scripts/moltbook/heartbeat.ts --agent testmaya --weekly
 *
 * Options:
 *   --agent <name>   Agent name (default: testmaya)
 *   --weekly         Include weekly performance post drafts
 *   --dry-run        Print actions without executing them
 *
 * Prerequisites:
 *   MOLTBOOK_API_TOKEN in .env.local
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join } from "path";

// We import from the built lib — this script runs via tsx
import { runMoltbookHeartbeat } from "../../src/lib/moltbook/heartbeat";
import { KnowledgeStore } from "../../src/lib/moltbook/knowledge";
import type { AgentWeeklyReport } from "../../src/lib/moltbook/content";
import type { MoltbookClientConfig, PrivacyBlocklist } from "../../src/lib/moltbook/types";
import type { AgentContext } from "../../src/lib/moltbook/knowledge";

const PROJECT_DIR = resolve(__dirname, "../..");
const ENV_PATH = join(PROJECT_DIR, ".env.local");

// ── Config ──────────────────────────────────

const VERTICAL_SUBMOLTS: Record<string, string[]> = {
  restaurant: ["#restaurant-ops", "#review-management", "#hospitality-ai", "#small-business"],
  realtor: ["#real-estate", "#lead-management", "#sales-automation", "#crm-agents"],
  fitness: ["#fitness-business", "#membership-retention", "#wellness-ops", "#scheduling"],
  medical: ["#healthcare-ops", "#appointment-management", "#patient-retention", "#small-business"],
  "home-services": ["#home-services", "#review-management", "#lead-management", "#small-business"],
  ecommerce: ["#ecommerce-ops", "#customer-support", "#retention-marketing", "#small-business"],
};

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  restaurant: ["review", "reservation", "booking", "no-show", "rating", "response time"],
  realtor: ["lead", "listing", "showing", "follow-up", "closing", "response time"],
  fitness: ["member", "retention", "churn", "no-show", "inquiry", "booking"],
  medical: ["patient", "appointment", "no-show", "confirmation", "reminder"],
  "home-services": ["estimate", "lead", "review", "follow-up", "scheduling"],
  ecommerce: ["ticket", "support", "abandoned cart", "review", "return", "retention"],
};

// ── Helpers ──────────────────────────────────

function loadEnv(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const lines = readFileSync(ENV_PATH, "utf-8").split("\n");
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function getAgentConfig(agentName: string): {
  vertical: string;
  displayName: string;
} {
  const verticalMap: Record<string, string> = {
    testmaya: "restaurant",
    testcole: "realtor",
    testalex: "fitness",
    testsophia: "medical",
    testjake: "home-services",
    testzoe: "ecommerce",
  };

  const vertical = verticalMap[agentName.toLowerCase()] || "restaurant";
  return {
    vertical,
    displayName: agentName.charAt(0).toUpperCase() + agentName.slice(1),
  };
}

/**
 * Load or create the agent's knowledge store from the insights markdown file.
 */
function loadKnowledgeStore(agentName: string, agentId: string): KnowledgeStore {
  const store = new KnowledgeStore(agentId);
  const insightsDir = join(PROJECT_DIR, "data", "moltbook");
  const insightsPath = join(insightsDir, `${agentName}-insights.md`);

  if (existsSync(insightsPath)) {
    const markdown = readFileSync(insightsPath, "utf-8");
    store.loadFromMarkdown(markdown);
    console.log(`  Loaded ${store.count()} existing insights from ${insightsPath}`);
  }

  return store;
}

function saveKnowledgeStore(agentName: string, markdown: string): void {
  const insightsDir = join(PROJECT_DIR, "data", "moltbook");
  if (!existsSync(insightsDir)) {
    mkdirSync(insightsDir, { recursive: true });
  }
  const insightsPath = join(insightsDir, `${agentName}-insights.md`);
  writeFileSync(insightsPath, markdown, "utf-8");
  console.log(`  Saved insights to ${insightsPath}`);
}

/**
 * Build a mock weekly report for testing.
 * In production, this would be built from actual agent session data.
 */
function buildMockWeeklyReport(vertical: string): AgentWeeklyReport {
  return {
    vertical,
    submolts: VERTICAL_SUBMOLTS[vertical] || [],
    messagesHandled: 127,
    tasksCompleted: [
      { type: "review responses", count: 34 },
      { type: "reservation confirmations", count: 28 },
      { type: "customer inquiries", count: 45 },
      { type: "follow-up messages", count: 20 },
    ],
    avgResponseTime: 42,
    notableEvents: [
      "Handled a complex complaint escalation involving a catering order that was delivered to the wrong address — coordinated between the delivery partner and the customer to resolve within 2 hours.",
    ],
    patternsObserved: [
      "Reviews posted between 7-9 PM on weekdays get 40% more views than those posted during business hours. Shifting response timing to early evening appears to increase the visibility of our responses.",
    ],
    insightsFromOtherAgents: [
      "responding to negative reviews within 4 hours leads to a 3x higher rate of the reviewer updating their rating compared to responses after 24 hours.",
    ],
  };
}

// ── Main ────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const agentName = args.find((a, i) => args[i - 1] === "--agent") || "testmaya";
  const includeWeekly = args.includes("--weekly");
  const dryRun = args.includes("--dry-run");

  const env = loadEnv();
  const apiToken = env.MOLTBOOK_API_KEY || env.MOLTBOOK_API_TOKEN || process.env.MOLTBOOK_API_KEY || process.env.MOLTBOOK_API_TOKEN || "";

  if (!apiToken || !apiToken.startsWith("moltbook_sk_")) {
    console.error("Error: MOLTBOOK_API_TOKEN not set or invalid in .env.local");
    console.error("Run scripts/moltbook/register-agent.ts first to get a token.");
    process.exit(1);
  }

  const config = getAgentConfig(agentName);
  const vertical = config.vertical;
  const agentId = `${agentName}-clawstaff-r1`;
  const submolts = VERTICAL_SUBMOLTS[vertical] || ["#small-business"];
  const keywords = VERTICAL_KEYWORDS[vertical] || [];

  console.log(`\n--- Moltbook Heartbeat ---\n`);
  console.log(`  Agent: ${config.displayName} (${agentId})`);
  console.log(`  Vertical: ${vertical}`);
  console.log(`  Submolts: ${submolts.join(", ")}`);
  console.log(`  Weekly posts: ${includeWeekly ? "yes" : "no"}`);
  console.log(`  Dry run: ${dryRun ? "yes" : "no"}`);
  console.log("");

  if (dryRun) {
    console.log("Dry run mode — would perform the following:");
    console.log("  1. Authenticate with Moltbook API");
    console.log("  2. Pull feed (30 posts) from subscribed submolts");
    console.log("  3. Analyze feed for insights relevant to", vertical);
    console.log("  4. Upvote + comment on top 3 high-value posts");
    if (includeWeekly) {
      console.log("  5. Generate 2-3 weekly performance post drafts");
      console.log("  6. Post drafts that pass privacy filter");
    }
    console.log("\nRun without --dry-run to execute.");
    return;
  }

  // Load knowledge store
  console.log("Loading knowledge store...");
  const knowledgeStore = loadKnowledgeStore(agentName, agentId);

  // Build heartbeat config
  const clientConfig: MoltbookClientConfig = {
    agentId,
    agentName: config.displayName,
    vertical,
    blocklist: { businessName: "", ownerName: "" },
  };

  const blocklist: PrivacyBlocklist = {
    businessName: "",
    ownerName: "",
  };

  const agentContext: AgentContext = {
    agentId,
    vertical,
    submolts,
    currentTasks: ["review management", "customer inquiries", "reservation handling"],
    keywords,
  };

  // Build weekly report if requested
  const weeklyReport = includeWeekly
    ? buildMockWeeklyReport(vertical)
    : undefined;

  // Run heartbeat
  console.log("Running heartbeat cycle...\n");
  const result = await runMoltbookHeartbeat(
    {
      clientConfig,
      apiToken,
      agentContext,
      blocklist,
    },
    knowledgeStore,
    weeklyReport
  );

  // Save updated knowledge store
  if (result.knowledge) {
    saveKnowledgeStore(agentName, result.knowledge.storeSnapshot);
  }

  // Print results
  console.log(`\n--- Heartbeat Results ---\n`);
  console.log(`  Status: ${result.ok ? "OK" : "FAILED"}`);
  console.log("");
  console.log(`  Feed:`);
  console.log(`    Posts read: ${result.feed.postsRead}`);
  console.log(`    Relevant posts: ${result.feed.relevantPosts}`);
  console.log("");

  if (result.knowledge) {
    console.log(`  Knowledge:`);
    console.log(`    Posts analyzed: ${result.knowledge.postsAnalyzed}`);
    console.log(`    Insights extracted: ${result.knowledge.insightsExtracted}`);
    console.log(`    New insights stored: ${result.knowledge.insightsStored}`);
    console.log(`    Suggestions generated: ${result.knowledge.suggestionsGenerated}`);
    if (result.knowledge.suggestions.length > 0) {
      console.log("");
      console.log(`    Top suggestions:`);
      for (const s of result.knowledge.suggestions.slice(0, 3)) {
        console.log(`      [${s.priority}] ${s.suggestion.slice(0, 120)}...`);
      }
    }
    console.log("");
  }

  console.log(`  Engagement:`);
  console.log(`    Upvoted: ${result.engagement.upvoted}`);
  console.log(`    Commented: ${result.engagement.commented}`);
  if (result.engagement.errors.length > 0) {
    console.log(`    Errors: ${result.engagement.errors.join("; ")}`);
  }
  console.log("");

  if (weeklyReport) {
    console.log(`  Weekly Posts:`);
    console.log(`    Drafts generated: ${result.drafts.generated}`);
    console.log(`    Posted: ${result.drafts.posted}`);
    if (result.drafts.errors.length > 0) {
      console.log(`    Errors: ${result.drafts.errors.join("; ")}`);
    }
    console.log("");
  }

  if (result.errors.length > 0) {
    console.log(`  Errors:`);
    for (const e of result.errors) {
      console.log(`    - ${e}`);
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
