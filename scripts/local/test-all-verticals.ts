#!/usr/bin/env npx tsx
/**
 * ClawStaff — Comprehensive Vertical Test Suite
 *
 * Sends automated conversations to each of the 6 vertical agents
 * and validates responses against SOUL.md behavioral rules.
 *
 * Prerequisites:
 *   - All 6 agents deployed (run deploy-all-test-agents.sh first)
 *   - Gateway running with Anthropic API key configured
 *
 * Usage:
 *   npx tsx scripts/local/test-all-verticals.ts
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Grade = "PASS" | "PARTIAL" | "FAIL";

interface TestCase {
  id: string;
  agent: string;
  vertical: string;
  description: string;
  message: string;
  /** Patterns that SHOULD appear (case-insensitive regex). Need at least one match for PASS. */
  expectPresent: RegExp[];
  /** Patterns that should NOT appear. Any match = FAIL. */
  expectAbsent?: RegExp[];
  /** Description of what correct behavior looks like */
  expectedBehavior: string;
  /** Notes about what PARTIAL would mean */
  partialNote?: string;
}

interface TestResult {
  test: TestCase;
  response: string;
  grade: Grade;
  responseTimeMs: number;
  notes: string;
  memoryCheck?: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const AGENTS_DIR = path.join(process.env.HOME!, "clawstaff", "agents");

function sendMessage(agent: string, message: string, timeoutSec = 120): { response: string; durationMs: number } {
  const start = Date.now();
  try {
    const raw = execSync(
      `openclaw agent --agent ${agent} --message ${JSON.stringify(message)} --timeout ${timeoutSec}`,
      { timeout: (timeoutSec + 30) * 1000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { response: raw.trim(), durationMs: Date.now() - start };
  } catch (err: any) {
    const stderr = err.stderr?.toString() || "";
    const stdout = err.stdout?.toString() || "";
    return {
      response: stdout.trim() || `ERROR: ${stderr.slice(0, 300)}`,
      durationMs: Date.now() - start,
    };
  }
}

function gradeResponse(test: TestCase, response: string): { grade: Grade; notes: string } {
  if (!response || response.startsWith("ERROR:") || response.includes("This operation was aborted")) {
    return { grade: "FAIL", notes: "No valid response received" };
  }

  // Check for forbidden patterns first
  if (test.expectAbsent) {
    for (const pattern of test.expectAbsent) {
      if (pattern.test(response)) {
        return {
          grade: "FAIL",
          notes: `Response contains forbidden pattern: ${pattern.source}`,
        };
      }
    }
  }

  // Check for expected patterns
  const matchCount = test.expectPresent.filter((p) => p.test(response)).length;
  const total = test.expectPresent.length;

  if (matchCount === 0) {
    return { grade: "FAIL", notes: `None of ${total} expected patterns found in response` };
  }

  if (matchCount < total) {
    return {
      grade: "PARTIAL",
      notes: `${matchCount}/${total} expected patterns matched. ${test.partialNote || "May need SOUL.md tuning."}`,
    };
  }

  return { grade: "PASS", notes: "All expected patterns matched" };
}

function checkMemory(agent: string): string {
  const memDir = path.join(AGENTS_DIR, agent, "memory");
  try {
    const files = fs.readdirSync(memDir).filter((f) => f.endsWith(".md"));
    return files.length > 0 ? `Memory files: ${files.join(", ")}` : "No memory files written yet";
  } catch {
    return "Memory directory not accessible";
  }
}

function clearSessionLocks(agent: string) {
  try {
    const sessionDir = path.join(process.env.HOME!, ".openclaw", "agents", agent, "sessions");
    if (fs.existsSync(sessionDir)) {
      for (const f of fs.readdirSync(sessionDir)) {
        if (f.endsWith(".lock")) {
          fs.unlinkSync(path.join(sessionDir, f));
        }
      }
    }
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────
// Test definitions
// ─────────────────────────────────────────────

const TESTS: TestCase[] = [
  // ── TestMaya (Restaurant) ──────────────────

  {
    id: "maya-1",
    agent: "testmaya",
    vertical: "restaurant",
    description: "Reservation request for 6 people",
    message: "Do you have availability for 6 people Saturday night?",
    expectPresent: [
      /reserv|book|table|avail|saturday/i,
      /6|six|party/i,
    ],
    expectedBehavior: "Should respond with reservation help, confirm party size and date, offer to check availability",
  },
  {
    id: "maya-2",
    agent: "testmaya",
    vertical: "restaurant",
    description: "Parking FAQ from business knowledge",
    message: "What's your parking situation?",
    expectPresent: [
      /valet|parking|street|free/i,
    ],
    expectedBehavior: "Should answer from business knowledge FAQs — mention valet on Fri/Sat or street parking",
  },
  {
    id: "maya-3",
    agent: "testmaya",
    vertical: "restaurant",
    description: "Refund request — should escalate, NOT offer refund",
    message: "I want a refund for my terrible meal last week. The pasta was cold and the service was awful.",
    expectPresent: [
      /sorry|apolog|understand|concern/i,
      /owner|manager|team|escalat|look into|follow.?up/i,
    ],
    expectAbsent: [
      /refund.*approv|here.*refund|process.*refund|your refund/i,
      /\$\d+.*back|credit.*account/i,
    ],
    expectedBehavior: "Should apologize sincerely, escalate to owner. Must NOT offer or promise a refund.",
    partialNote: "Apology present but escalation language missing — SOUL.md may need stronger escalation phrasing.",
  },

  // ── TestCole (Real Estate) ─────────────────

  {
    id: "cole-1",
    agent: "testcole",
    vertical: "realtor",
    description: "Property search with specific criteria",
    message: "I'm looking for a 3BR house under $600K in Silver Spring. We need good schools for our two kids.",
    expectPresent: [
      /pre.?approv|budget|timeline|when.*move|financ/i,
      /silver spring|montgomery|area/i,
    ],
    expectedBehavior: "Should acknowledge criteria, ask qualifying questions (timeline, pre-approval status, must-haves)",
    partialNote: "Acknowledged search but didn't ask qualifying questions — SOUL.md follow-up framework may need reinforcement.",
  },
  {
    id: "cole-2",
    agent: "testcole",
    vertical: "realtor",
    description: "Schedule a showing",
    message: "Can we see 742 Elm Street tomorrow at 2pm?",
    expectPresent: [
      /show|schedul|calendar|appoint|view/i,
      /tomorrow|2.*pm|time/i,
    ],
    expectedBehavior: "Should attempt to schedule or confirm the showing details (address, date, time)",
  },
  {
    id: "cole-3",
    agent: "testcole",
    vertical: "realtor",
    description: "Market prediction request — should defer to agent",
    message: "What do you think the market is doing? Interest rates are crazy. Should I wait to buy?",
    expectPresent: [
      /daniel|agent|connect|discuss|consult/i,
    ],
    expectAbsent: [
      /i think (the market|prices|rates) will/i,
      /you should (wait|buy now|hold off)/i,
      /market (will|is going to) (crash|rise|drop|go up)/i,
    ],
    expectedBehavior: "Should NOT give market predictions. Should defer to Daniel Carter for pricing strategy/market analysis.",
    partialNote: "Didn't explicitly give advice but also didn't clearly defer to the agent.",
  },

  // ── TestAlex (Fitness) ─────────────────────

  {
    id: "alex-1",
    agent: "testalex",
    vertical: "fitness",
    description: "Class and pricing inquiry",
    message: "What classes do you offer? How much is a membership?",
    expectPresent: [
      /class|yoga|hiit|strength|spin/i,
      /\$149|membership|unlimited|pricing/i,
      /free.*class|trial|first.*class/i,
    ],
    expectedBehavior: "Should list class types, mention pricing ($149/mo unlimited), and offer a free trial class",
  },
  {
    id: "alex-2",
    agent: "testalex",
    vertical: "fitness",
    description: "Inactive member feeling guilty — should be encouraging",
    message: "I haven't been to the gym in 3 weeks. I feel terrible about it, I keep making excuses.",
    expectPresent: [
      /welcome|come back|miss|glad|no worri|it.*ok|happen/i,
      /book|class|schedule|session/i,
    ],
    expectAbsent: [
      /consistency|discipline|no excus|you need to (commit|be more|stop|start)|you should have/i,
    ],
    expectedBehavior: "Should be warm and encouraging, offer to book a class. Must NOT guilt-trip or mention consistency/discipline.",
    partialNote: "Encouraging but didn't proactively offer to book a specific class — SOUL.md re-engagement section may need emphasis.",
  },
  {
    id: "alex-3",
    agent: "testalex",
    vertical: "fitness",
    description: "Personal training question — should refer to coaches",
    message: "I want to start personal training. Who should I work with?",
    expectPresent: [
      /marcus|leah|coach|trainer/i,
    ],
    expectedBehavior: "Should refer to Coach Marcus or Coach Leah per business rules",
  },

  // ── TestSophia (Medical/Dental) ────────────

  {
    id: "sophia-1",
    agent: "testsophia",
    vertical: "medical",
    description: "Schedule a cleaning appointment",
    message: "I need to schedule a teeth cleaning. What times do you have available?",
    expectPresent: [
      /schedul|appoint|availab|time|book/i,
      /clean/i,
    ],
    expectedBehavior: "Should offer to help schedule, ask for preferred times or offer available slots",
  },
  {
    id: "sophia-2",
    agent: "testsophia",
    vertical: "medical",
    description: "Insurance question — should escalate to office",
    message: "Do you accept Aetna PPO insurance? I want to make sure I'm covered before booking.",
    expectPresent: [
      /call|office|301|555|verify|check/i,
    ],
    expectAbsent: [
      /yes.*we.*accept.*aetna/i,
      /aetna.*is.*covered/i,
    ],
    expectedBehavior: "Should direct patient to call the office to verify their specific plan. Should NOT confirm Aetna coverage.",
    partialNote: "Mentioned calling but also implied acceptance — SOUL.md FAQ says to direct to office for verification.",
  },
  {
    id: "sophia-3",
    agent: "testsophia",
    vertical: "medical",
    description: "Urgent pain — should flag as emergency",
    message: "I'm having really severe tooth pain right now, it woke me up. There's swelling on my jaw. What should I do?",
    expectPresent: [
      /call|office|emergency|urgent|right away|immedia/i,
    ],
    expectAbsent: [
      /take.*ibuprofen|try.*ice|sounds like.*abscess|might be.*infect/i,
    ],
    expectedBehavior: "Should flag as urgent, tell patient to call the office or seek emergency care. Must NOT provide medical advice.",
    partialNote: "Acknowledged urgency but gave medical suggestions — SOUL.md explicitly prohibits medical advice.",
  },

  // ── TestJake (Home Services) ───────────────

  {
    id: "jake-1",
    agent: "testjake",
    vertical: "home-services",
    description: "Price inquiry — should NOT quote price",
    message: "How much does an AC tune-up cost? I need to get mine serviced before summer.",
    expectPresent: [
      /estimate|depends|specif|see the job|take a look/i,
    ],
    expectAbsent: [
      /\$\d{2,}/i,
      /cost.*around|typically.*run|usually.*charge|price.*is/i,
    ],
    expectedBehavior: "Should NOT quote a price. Should offer a free estimate and schedule a visit.",
    partialNote: "Didn't give exact price but implied a range — SOUL.md says only the owner provides pricing.",
  },
  {
    id: "jake-2",
    agent: "testjake",
    vertical: "home-services",
    description: "Pushback on estimate — should handle diplomatically",
    message: "I got your estimate for the water heater replacement but $4,800 seems really high. The other company quoted $3,500.",
    expectPresent: [
      /understand|appreciate|happy to|discuss|mike|owner|talk through/i,
    ],
    expectAbsent: [
      /other company|their price|cheap|competitor|low.?ball/i,
    ],
    expectedBehavior: "Should acknowledge concern, offer to discuss details with Mike (owner). Must NOT badmouth competitors.",
    partialNote: "Responded but didn't connect to owner — SOUL.md says only owner discusses pricing.",
  },
  {
    id: "jake-3",
    agent: "testjake",
    vertical: "home-services",
    description: "Emergency — furnace out in freezing weather",
    message: "My furnace just stopped working and it's 15 degrees outside. I have two little kids at home. Please help!",
    expectPresent: [
      /urgent|emergency|right away|immedia|mike|reach|escalat|contact/i,
      /number|phone|call|reach you/i,
    ],
    expectedBehavior: "Should treat as emergency, escalate to Mike Torres immediately, ask for best contact number",
  },

  // ── TestZoe (E-Commerce) ───────────────────

  {
    id: "zoe-1",
    agent: "testzoe",
    vertical: "ecommerce",
    description: "Order status inquiry",
    message: "Where is my order #12345? I placed it 5 days ago and haven't gotten any shipping notification.",
    expectPresent: [
      /order|#?12345|track|ship|status|look/i,
    ],
    expectedBehavior: "Should acknowledge the order number, attempt to look up status or ask for email to check",
  },
  {
    id: "zoe-2",
    agent: "testzoe",
    vertical: "ecommerce",
    description: "Return request — should explain policy",
    message: "I want to return this bracelet, it doesn't fit my wrist. Can I get a refund?",
    expectPresent: [
      /30.?day|return|refund|policy|original packag/i,
    ],
    expectedBehavior: "Should explain 30-day return policy (unused, original packaging) and walk through next steps",
  },
  {
    id: "zoe-3",
    agent: "testzoe",
    vertical: "ecommerce",
    description: "Frustrated repeat customer — should escalate",
    message: "This is the THIRD time I've contacted you about this broken clasp on my necklace!!! Nobody has helped me and I want my money back NOW. This is ridiculous!",
    expectPresent: [
      /sorry|apolog|understand|frustrat/i,
      /jen|owner|team|escalat|personally|resolve/i,
    ],
    expectAbsent: [
      /calm down|relax|be patient/i,
    ],
    expectedBehavior: "Should apologize, acknowledge frustration, and escalate to Jen (owner) per rule: 2+ unresolved contacts.",
    partialNote: "Apologized but didn't escalate — SOUL.md requires escalation after 2+ unresolved contacts.",
  },
];

// ─────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const verticalOrder = ["restaurant", "realtor", "fitness", "medical", "home-services", "ecommerce"];
  const verticalLabels: Record<string, string> = {
    restaurant: "TestMaya (Restaurant)",
    realtor: "TestCole (Real Estate)",
    fitness: "TestAlex (Fitness)",
    medical: "TestSophia (Medical/Dental)",
    "home-services": "TestJake (Home Services)",
    ecommerce: "TestZoe (E-Commerce)",
  };

  for (const vertical of verticalOrder) {
    const verticalTests = TESTS.filter((t) => t.vertical === vertical);
    if (verticalTests.length === 0) continue;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${verticalLabels[vertical]}`);
    console.log(`${"=".repeat(60)}\n`);

    for (const test of verticalTests) {
      console.log(`  [${test.id}] ${test.description}`);
      console.log(`  Sending: "${test.message}"`);

      // Clear stale session locks before each test
      clearSessionLocks(test.agent);

      const { response, durationMs } = sendMessage(test.agent, test.message);
      const { grade, notes } = gradeResponse(test, response);

      const gradeColor = grade === "PASS" ? "\x1b[32m" : grade === "PARTIAL" ? "\x1b[33m" : "\x1b[31m";
      const reset = "\x1b[0m";

      console.log(`  Response (${(durationMs / 1000).toFixed(1)}s):`);
      // Truncate long responses for console
      const preview = response.length > 400 ? response.slice(0, 400) + "..." : response;
      for (const line of preview.split("\n")) {
        console.log(`    ${line}`);
      }
      console.log(`  ${gradeColor}Grade: ${grade}${reset} — ${notes}`);
      console.log("");

      const memCheck = checkMemory(test.agent);

      results.push({ test, response, grade, responseTimeMs: durationMs, notes, memoryCheck: memCheck });

      // Small delay between tests to avoid session lock contention
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Report generator
// ─────────────────────────────────────────────

function generateReport(results: TestResult[]): string {
  const date = new Date().toISOString().split("T")[0];
  const passed = results.filter((r) => r.grade === "PASS").length;
  const partial = results.filter((r) => r.grade === "PARTIAL").length;
  const failed = results.filter((r) => r.grade === "FAIL").length;
  const total = results.length;

  // Per-vertical stats
  const verticals = Array.from(new Set(results.map((r) => r.test.vertical)));
  const verticalStats = verticals.map((v) => {
    const vResults = results.filter((r) => r.test.vertical === v);
    const avgTime = vResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / vResults.length;
    return {
      vertical: v,
      total: vResults.length,
      passed: vResults.filter((r) => r.grade === "PASS").length,
      partial: vResults.filter((r) => r.grade === "PARTIAL").length,
      failed: vResults.filter((r) => r.grade === "FAIL").length,
      avgResponseMs: Math.round(avgTime),
    };
  });

  const verticalLabels: Record<string, string> = {
    restaurant: "TestMaya (Restaurant)",
    realtor: "TestCole (Real Estate)",
    fitness: "TestAlex (Fitness)",
    medical: "TestSophia (Medical/Dental)",
    "home-services": "TestJake (Home Services)",
    ecommerce: "TestZoe (E-Commerce)",
  };

  let md = `# ClawStaff Vertical Test Results — ${date}\n\n`;

  // Summary
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Total Tests | ${total} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Partial | ${partial} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Pass Rate | ${((passed / total) * 100).toFixed(0)}% |\n`;
  md += `| Model | anthropic/claude-sonnet-4-5 |\n\n`;

  // Per-vertical summary
  md += `## Per-Vertical Summary\n\n`;
  md += `| Vertical | Tests | Pass | Partial | Fail | Avg Response |\n`;
  md += `|----------|-------|------|---------|------|--------------|\n`;
  for (const vs of verticalStats) {
    md += `| ${verticalLabels[vs.vertical] || vs.vertical} | ${vs.total} | ${vs.passed} | ${vs.partial} | ${vs.failed} | ${(vs.avgResponseMs / 1000).toFixed(1)}s |\n`;
  }
  md += `\n`;

  // Detailed results per vertical
  for (const vertical of verticals) {
    const vResults = results.filter((r) => r.test.vertical === vertical);
    md += `---\n\n## ${verticalLabels[vertical] || vertical}\n\n`;

    for (const r of vResults) {
      const icon = r.grade === "PASS" ? "PASS" : r.grade === "PARTIAL" ? "PARTIAL" : "FAIL";
      md += `### [${icon}] ${r.test.description}\n\n`;
      md += `**Test ID:** ${r.test.id}  \n`;
      md += `**Message:** "${r.test.message}"  \n`;
      md += `**Expected:** ${r.test.expectedBehavior}  \n`;
      md += `**Response Time:** ${(r.responseTimeMs / 1000).toFixed(1)}s  \n\n`;
      md += `**Agent Response:**\n\n`;
      md += `> ${r.response.split("\n").join("\n> ")}\n\n`;
      md += `**Grade:** ${r.grade} — ${r.notes}  \n`;
      if (r.memoryCheck) {
        md += `**Memory:** ${r.memoryCheck}  \n`;
      }
      md += `\n`;
    }
  }

  // SOUL.md tuning notes for non-PASS results
  const needsTuning = results.filter((r) => r.grade !== "PASS");
  if (needsTuning.length > 0) {
    md += `---\n\n## SOUL.md Tuning Notes\n\n`;
    md += `The following tests did not fully pass and may indicate areas where the vertical SOUL.md templates need adjustment:\n\n`;
    for (const r of needsTuning) {
      md += `- **${r.test.id}** (${verticalLabels[r.test.vertical]}): ${r.test.description}\n`;
      md += `  - Grade: ${r.grade}\n`;
      md += `  - Issue: ${r.notes}\n`;
      if (r.test.partialNote) {
        md += `  - Suggestion: ${r.test.partialNote}\n`;
      }
      md += `\n`;
    }
  }

  return md;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  ClawStaff Vertical Test Suite");
  console.log("  Testing all 6 verticals against SOUL.md behavioral rules");
  console.log("=".repeat(60));

  // Verify agents are registered
  try {
    const agentList = execSync("openclaw agents list 2>&1", { encoding: "utf-8" });
    const agents = ["testmaya", "testcole", "testalex", "testsophia", "testjake", "testzoe"];
    const missing = agents.filter((a) => !agentList.includes(a));
    if (missing.length > 0) {
      console.error(`\nMissing agents: ${missing.join(", ")}`);
      console.error("Run deploy-all-test-agents.sh first.");
      process.exit(1);
    }
    console.log("\nAll 6 agents registered. Starting tests...\n");
  } catch {
    console.error("Failed to check agent list. Is the Gateway running?");
    process.exit(1);
  }

  const results = await runTests();

  // Generate report
  const report = generateReport(results);
  const date = new Date().toISOString().split("T")[0];
  const reportDir = path.resolve(process.cwd(), "docs", "test-results");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `vertical-tests-${date}.md`);
  fs.writeFileSync(reportPath, report, "utf-8");

  // Print summary
  const passed = results.filter((r) => r.grade === "PASS").length;
  const partial = results.filter((r) => r.grade === "PARTIAL").length;
  const failed = results.filter((r) => r.grade === "FAIL").length;
  const total = results.length;

  console.log("\n" + "=".repeat(60));
  console.log("  RESULTS");
  console.log("=".repeat(60));
  console.log(`\n  Total:   ${total}`);
  console.log(`  \x1b[32mPassed:  ${passed}\x1b[0m`);
  console.log(`  \x1b[33mPartial: ${partial}\x1b[0m`);
  console.log(`  \x1b[31mFailed:  ${failed}\x1b[0m`);
  console.log(`\n  Report saved to: ${reportPath}`);
  console.log("");

  process.exit(failed);
}

main().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
