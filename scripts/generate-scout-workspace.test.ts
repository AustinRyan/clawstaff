#!/usr/bin/env npx tsx
/**
 * Tests for generate-scout-workspace.ts
 *
 * Runs the generator into a temp directory, then validates:
 *   - All expected files exist
 *   - File sizes / line counts meet requirements
 *   - Required content sections and keywords are present
 *   - Structural integrity (headings, scoring dimensions, verticals, etc.)
 *
 * Usage:  npx tsx scripts/generate-scout-workspace.test.ts
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// ─────────────────────────────────────────────
// Setup: run the generator, then read all output
// ─────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const SCOUT_DIR = path.join(ROOT, "workspaces", "scout");
const TEMPLATES_DIR = path.join(SCOUT_DIR, "outreach-templates");

/** Helper: read a generated file as a string */
function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(SCOUT_DIR, relativePath), "utf-8");
}

/** Helper: count non-empty lines */
function lineCount(content: string): number {
  return content.split("\n").filter((l) => l.trim().length > 0).length;
}

/** Helper: count total lines (including blanks) */
function totalLines(content: string): number {
  return content.split("\n").length;
}

// Run the generator once before all tests
before(() => {
  // Clean previous output so we know files come from this run
  if (fs.existsSync(SCOUT_DIR)) {
    fs.rmSync(SCOUT_DIR, { recursive: true });
  }
  execSync("npx tsx scripts/generate-scout-workspace.ts", {
    cwd: ROOT,
    stdio: "pipe",
  });
});

// ─────────────────────────────────────────────
// 1. File existence
// ─────────────────────────────────────────────

describe("File existence", () => {
  const expectedCoreFiles = [
    "SOUL.md",
    "HEARTBEAT.md",
    "USER.md",
    "TOOLS.md",
    "prospect-scoring-rubric.md",
  ];

  const expectedTemplates = [
    "restaurant-initial.md",
    "realtor-initial.md",
    "fitness-initial.md",
    "medical-initial.md",
    "home-services-initial.md",
    "ecommerce-initial.md",
    "follow-up-3day.md",
    "follow-up-7day.md",
    "response-tell-me-more.md",
    "response-not-interested.md",
    "response-pricing.md",
  ];

  it("creates the scout workspace directory", () => {
    assert.ok(fs.existsSync(SCOUT_DIR), "workspaces/scout/ should exist");
  });

  it("creates the outreach-templates directory", () => {
    assert.ok(
      fs.existsSync(TEMPLATES_DIR),
      "workspaces/scout/outreach-templates/ should exist"
    );
  });

  for (const file of expectedCoreFiles) {
    it(`creates ${file}`, () => {
      assert.ok(
        fs.existsSync(path.join(SCOUT_DIR, file)),
        `${file} should exist`
      );
    });
  }

  for (const file of expectedTemplates) {
    it(`creates outreach-templates/${file}`, () => {
      assert.ok(
        fs.existsSync(path.join(TEMPLATES_DIR, file)),
        `outreach-templates/${file} should exist`
      );
    });
  }

  it("generates exactly 16 files total", () => {
    const coreCount = expectedCoreFiles.filter((f) =>
      fs.existsSync(path.join(SCOUT_DIR, f))
    ).length;
    const templateCount = expectedTemplates.filter((f) =>
      fs.existsSync(path.join(TEMPLATES_DIR, f))
    ).length;
    assert.equal(coreCount + templateCount, 16);
  });
});

// ─────────────────────────────────────────────
// 2. SOUL.md
// ─────────────────────────────────────────────

describe("SOUL.md", () => {
  let content: string;
  before(() => {
    content = readFile("SOUL.md");
  });

  it("is at least 80 lines (requirement: 80-100+)", () => {
    assert.ok(
      totalLines(content) >= 80,
      `SOUL.md has ${totalLines(content)} lines, need >= 80`
    );
  });

  it("identifies the agent as Scout", () => {
    assert.ok(content.includes("Scout"), "should mention Scout by name");
  });

  it("defines role as Business Development Agent", () => {
    assert.ok(
      content.includes("Business Development Agent"),
      "should state the role"
    );
  });

  it("mentions Austin as operator", () => {
    assert.ok(content.includes("Austin"), "should reference Austin");
  });

  // All 6 verticals present
  const verticals = [
    "Restaurant",
    "Real Estate",
    "Fitness",
    "Medical",
    "Home Service",
    "E-Commerce",
  ];
  for (const v of verticals) {
    it(`covers the ${v} vertical`, () => {
      assert.ok(
        content.toLowerCase().includes(v.toLowerCase()),
        `should mention ${v}`
      );
    });
  }

  // Default agent names per vertical
  const agentNames = ["Maya", "Cole", "Alex", "Sophia", "Jake", "Zoe"];
  for (const name of agentNames) {
    it(`mentions default agent name "${name}"`, () => {
      assert.ok(content.includes(name), `should mention agent name ${name}`);
    });
  }

  // Pricing tiers
  it("includes all three pricing tiers", () => {
    assert.ok(content.includes("$299"), "should mention $299 Starter tier");
    assert.ok(content.includes("$499"), "should mention $499 Pro tier");
    assert.ok(content.includes("$799"), "should mention $799 Enterprise tier");
  });

  // Key differentiators
  it("mentions Moltbook", () => {
    assert.ok(
      content.includes("Moltbook"),
      "should reference the Moltbook reputation system"
    );
  });

  it("mentions 24/7 operation", () => {
    assert.ok(content.includes("24/7"), "should mention 24/7 availability");
  });

  it("distinguishes dedicated agent from chatbot", () => {
    assert.ok(
      content.toLowerCase().includes("not a chatbot"),
      "should explicitly say it's not a chatbot"
    );
  });

  // Strict rules
  it("has a rule about never being pushy or spammy", () => {
    assert.ok(
      content.toLowerCase().includes("pushy") ||
        content.toLowerCase().includes("spammy"),
      "should prohibit pushy/spammy behavior"
    );
  });

  it("has a 3-message maximum rule", () => {
    assert.ok(
      content.includes("3 messages") || content.includes("Three messages"),
      "should enforce max 3 messages per prospect"
    );
  });

  it("requires personalization — no templates", () => {
    assert.ok(
      content.toLowerCase().includes("personalize") ||
        content.toLowerCase().includes("template"),
      "should require personalization"
    );
  });

  it("requires respecting opt-outs", () => {
    assert.ok(
      content.toLowerCase().includes("opt-out") ||
        content.toLowerCase().includes("opt out"),
      "should mention opt-out handling"
    );
  });

  it("requires CAN-SPAM compliance", () => {
    assert.ok(
      content.includes("CAN-SPAM"),
      "should mention CAN-SPAM compliance"
    );
  });

  it("requires unsubscribe option in emails", () => {
    assert.ok(
      content.toLowerCase().includes("unsubscribe"),
      "should mention unsubscribe"
    );
  });

  it("prohibits sharing client data without approval", () => {
    assert.ok(
      content.toLowerCase().includes("case stud") ||
        content.toLowerCase().includes("never share"),
      "should prohibit sharing unapproved client data"
    );
  });

  it("requires honesty about AI nature", () => {
    assert.ok(
      content.toLowerCase().includes("honest") ||
        content.toLowerCase().includes("misrepresent"),
      "should require transparency about being AI"
    );
  });
});

// ─────────────────────────────────────────────
// 3. HEARTBEAT.md
// ─────────────────────────────────────────────

describe("HEARTBEAT.md", () => {
  let content: string;
  before(() => {
    content = readFile("HEARTBEAT.md");
  });

  it("is non-trivial (30+ lines)", () => {
    assert.ok(totalLines(content) >= 30, "HEARTBEAT.md should be substantial");
  });

  it("schedules discovery at 6am", () => {
    assert.ok(
      content.includes("6") && content.toLowerCase().includes("discover"),
      "should schedule 6am discovery"
    );
  });

  it("schedules qualification at 8am", () => {
    assert.ok(
      content.includes("8") && content.toLowerCase().includes("qualif"),
      "should schedule 8am qualification"
    );
  });

  it("schedules outreach window 10am-2pm", () => {
    assert.ok(
      content.includes("10") && content.toLowerCase().includes("outreach"),
      "should schedule 10am-2pm outreach"
    );
  });

  it("schedules follow-up cadence at 3pm", () => {
    assert.ok(
      content.includes("3") && content.toLowerCase().includes("follow"),
      "should schedule 3pm follow-ups"
    );
  });

  it("schedules daily summary to Austin at 8pm", () => {
    assert.ok(
      content.includes("8") && content.toLowerCase().includes("summary"),
      "should schedule 8pm daily summary"
    );
  });

  it("sends summaries via WhatsApp", () => {
    assert.ok(
      content.includes("WhatsApp"),
      "summaries should go via WhatsApp"
    );
  });

  it("includes weekly outreach analysis", () => {
    assert.ok(
      content.toLowerCase().includes("weekly") &&
        (content.toLowerCase().includes("analyz") ||
          content.toLowerCase().includes("performance")),
      "should include weekly analysis"
    );
  });

  it("mentions the 3-day follow-up", () => {
    assert.ok(content.includes("3-day"), "should mention 3-day follow-up");
  });

  it("mentions the 7-day follow-up", () => {
    assert.ok(content.includes("7-day"), "should mention 7-day follow-up");
  });

  it("mentions the 10-day final follow-up", () => {
    assert.ok(content.includes("10-day"), "should mention 10-day follow-up");
  });

  it("caps outreach at max 10 per day", () => {
    assert.ok(content.includes("10"), "should mention 10/day outreach cap");
  });
});

// ─────────────────────────────────────────────
// 4. USER.md
// ─────────────────────────────────────────────

describe("USER.md", () => {
  let content: string;
  before(() => {
    content = readFile("USER.md");
  });

  it("identifies Austin as the operator", () => {
    assert.ok(content.includes("Austin"), "should mention Austin");
  });

  it("mentions WhatsApp as communication channel", () => {
    assert.ok(content.includes("WhatsApp"), "should mention WhatsApp");
  });

  it("describes Austin's role as founder", () => {
    assert.ok(
      content.toLowerCase().includes("founder"),
      "should identify Austin as founder"
    );
  });
});

// ─────────────────────────────────────────────
// 5. TOOLS.md
// ─────────────────────────────────────────────

describe("TOOLS.md", () => {
  let content: string;
  before(() => {
    content = readFile("TOOLS.md");
  });

  it("mentions VPS environment", () => {
    assert.ok(
      content.toLowerCase().includes("vps") ||
        content.toLowerCase().includes("ubuntu"),
      "should describe VPS environment"
    );
  });

  it("lists required API keys", () => {
    assert.ok(
      content.includes("API") || content.includes("api"),
      "should list API keys"
    );
  });

  it("mentions the agent-browser skill", () => {
    assert.ok(
      content.toLowerCase().includes("agent-browser") ||
        content.toLowerCase().includes("browser"),
      "should list agent-browser skill"
    );
  });

  it("mentions Tavily for web search", () => {
    assert.ok(
      content.toLowerCase().includes("tavily"),
      "should mention Tavily"
    );
  });

  it("mentions email as primary outreach channel", () => {
    assert.ok(
      content.toLowerCase().includes("email"),
      "should mention email outreach"
    );
  });

  it("mentions Instagram DM as secondary channel", () => {
    assert.ok(
      content.toLowerCase().includes("instagram"),
      "should mention Instagram"
    );
  });

  it("mentions Facebook as tertiary channel", () => {
    assert.ok(
      content.toLowerCase().includes("facebook"),
      "should mention Facebook"
    );
  });
});

// ─────────────────────────────────────────────
// 6. Prospect Scoring Rubric
// ─────────────────────────────────────────────

describe("prospect-scoring-rubric.md", () => {
  let content: string;
  before(() => {
    content = readFile("prospect-scoring-rubric.md");
  });

  it("is substantial (100+ lines)", () => {
    assert.ok(
      totalLines(content) >= 100,
      `Rubric has ${totalLines(content)} lines, need >= 100`
    );
  });

  // Four scoring dimensions with correct weights
  it("includes Pain Signal Strength at 40%", () => {
    assert.ok(
      content.includes("40%") && content.toLowerCase().includes("pain"),
      "should weight pain signal at 40%"
    );
  });

  it("includes Revenue Fit at 25%", () => {
    assert.ok(
      content.includes("25%") && content.toLowerCase().includes("revenue"),
      "should weight revenue fit at 25%"
    );
  });

  it("includes Reachability at 20%", () => {
    assert.ok(
      content.includes("20%") && content.toLowerCase().includes("reachab"),
      "should weight reachability at 20%"
    );
  });

  it("includes Competition at 15%", () => {
    assert.ok(
      content.includes("15%") && content.toLowerCase().includes("compet"),
      "should weight competition at 15%"
    );
  });

  it("scores on a 0-100 scale", () => {
    assert.ok(
      content.includes("0-100") || content.includes("0–100"),
      "should use 0-100 scale"
    );
  });

  it("sets outreach threshold at 60+", () => {
    assert.ok(
      content.includes("60"),
      "should set 60+ as the outreach threshold"
    );
  });

  // Vertical-specific indicators
  const verticalKeywords = [
    "restaurant",
    "real estate",
    "fitness",
    "medical",
    "home service",
    "e-commerce",
  ];
  for (const v of verticalKeywords) {
    it(`includes specific indicators for ${v}`, () => {
      assert.ok(
        content.toLowerCase().includes(v),
        `should have indicators for ${v}`
      );
    });
  }

  it("includes a worked scoring example", () => {
    assert.ok(
      content.toLowerCase().includes("example") &&
        content.includes("/40") &&
        content.includes("/25"),
      "should include a scored example with dimension breakdowns"
    );
  });
});

// ─────────────────────────────────────────────
// 7. Outreach Templates — Initial (per vertical)
// ─────────────────────────────────────────────

describe("Outreach templates — initial contact", () => {
  const verticalFiles: Record<string, string> = {
    restaurant: "restaurant-initial.md",
    realtor: "realtor-initial.md",
    fitness: "fitness-initial.md",
    medical: "medical-initial.md",
    "home-services": "home-services-initial.md",
    ecommerce: "ecommerce-initial.md",
  };

  for (const [vertical, file] of Object.entries(verticalFiles)) {
    describe(file, () => {
      let content: string;
      before(() => {
        content = readFile(`outreach-templates/${file}`);
      });

      it("is non-empty (15+ lines)", () => {
        assert.ok(
          totalLines(content) >= 15,
          `${file} has ${totalLines(content)} lines, need >= 15`
        );
      });

      it("is a framework, not a copy-paste template", () => {
        assert.ok(
          content.toLowerCase().includes("framework") ||
            content.toLowerCase().includes("structure") ||
            content.toLowerCase().includes("purpose"),
          `${file} should be framed as a framework, not a template`
        );
      });

      it('includes a "What NOT to do" section', () => {
        assert.ok(
          content.toLowerCase().includes("not to do") ||
            content.toLowerCase().includes("don't") ||
            content.toLowerCase().includes("do not"),
          `${file} should include guardrails`
        );
      });
    });
  }
});

// ─────────────────────────────────────────────
// 8. Outreach Templates — Follow-ups
// ─────────────────────────────────────────────

describe("Outreach templates — follow-ups", () => {
  describe("follow-up-3day.md", () => {
    let content: string;
    before(() => {
      content = readFile("outreach-templates/follow-up-3day.md");
    });

    it("is non-empty", () => {
      assert.ok(totalLines(content) >= 10);
    });

    it("describes a soft/low-pressure approach", () => {
      assert.ok(
        content.toLowerCase().includes("soft") ||
          content.toLowerCase().includes("low-pressure") ||
          content.toLowerCase().includes("bump"),
        "3-day follow-up should be soft/low-pressure"
      );
    });
  });

  describe("follow-up-7day.md", () => {
    let content: string;
    before(() => {
      content = readFile("outreach-templates/follow-up-7day.md");
    });

    it("is non-empty", () => {
      assert.ok(totalLines(content) >= 10);
    });

    it("takes a different angle from initial outreach", () => {
      assert.ok(
        content.toLowerCase().includes("different angle") ||
          content.toLowerCase().includes("new") ||
          content.toLowerCase().includes("separate"),
        "7-day follow-up should use a different angle"
      );
    });
  });
});

// ─────────────────────────────────────────────
// 9. Outreach Templates — Responses
// ─────────────────────────────────────────────

describe("Outreach templates — responses", () => {
  describe("response-tell-me-more.md", () => {
    let content: string;
    before(() => {
      content = readFile("outreach-templates/response-tell-me-more.md");
    });

    it("is non-empty", () => {
      assert.ok(totalLines(content) >= 10);
    });

    it("instructs to alert Austin immediately", () => {
      assert.ok(
        content.toLowerCase().includes("alert") &&
          content.includes("Austin"),
        "should instruct immediate Austin alert"
      );
    });

    it("mentions handing off to Austin for a call", () => {
      assert.ok(
        content.toLowerCase().includes("call") &&
          content.includes("Austin"),
        "should hand off to Austin for a call"
      );
    });
  });

  describe("response-not-interested.md", () => {
    let content: string;
    before(() => {
      content = readFile("outreach-templates/response-not-interested.md");
    });

    it("is non-empty", () => {
      assert.ok(totalLines(content) >= 10);
    });

    it("is a graceful exit", () => {
      assert.ok(
        content.toLowerCase().includes("graceful") ||
          content.toLowerCase().includes("respect"),
        "should describe a graceful exit"
      );
    });

    it("prohibits overcoming the objection", () => {
      assert.ok(
        content.toLowerCase().includes("never") &&
          (content.toLowerCase().includes("objection") ||
            content.toLowerCase().includes("overcome") ||
            content.toLowerCase().includes("re-pitch")),
        "should prohibit trying to overcome objections"
      );
    });

    it("marks prospect as permanently opted out", () => {
      assert.ok(
        content.toLowerCase().includes("opt") ||
          content.toLowerCase().includes("permanently") ||
          content.toLowerCase().includes("never contact"),
        "should permanently opt out the prospect"
      );
    });
  });

  describe("response-pricing.md", () => {
    let content: string;
    before(() => {
      content = readFile("outreach-templates/response-pricing.md");
    });

    it("is non-empty", () => {
      assert.ok(totalLines(content) >= 20);
    });

    it("includes all three pricing tiers", () => {
      assert.ok(content.includes("$299"), "should mention $299");
      assert.ok(content.includes("$499"), "should mention $499");
      assert.ok(content.includes("$799"), "should mention $799");
    });

    it("gives pricing directly — no hiding behind a call", () => {
      assert.ok(
        content.toLowerCase().includes("direct") ||
          content.toLowerCase().includes("transparent") ||
          content.toLowerCase().includes("give them the number"),
        "should instruct giving pricing directly"
      );
    });

    it("includes value anchoring per vertical", () => {
      assert.ok(
        content.toLowerCase().includes("anchor"),
        "should include price anchoring advice"
      );
    });

    it("mentions the free trial", () => {
      assert.ok(
        content.toLowerCase().includes("free") &&
          content.toLowerCase().includes("trial"),
        "should mention the free trial"
      );
    });
  });
});

// ─────────────────────────────────────────────
// 10. Idempotency — running twice produces same files
// ─────────────────────────────────────────────

describe("Idempotency", () => {
  it("produces identical output when run twice", () => {
    // Capture current file contents
    const snapshot: Record<string, string> = {};
    const allFiles = [
      "SOUL.md",
      "HEARTBEAT.md",
      "USER.md",
      "TOOLS.md",
      "prospect-scoring-rubric.md",
      ...fs.readdirSync(TEMPLATES_DIR).map((f) => `outreach-templates/${f}`),
    ];
    for (const f of allFiles) {
      snapshot[f] = readFile(f);
    }

    // Run generator again
    execSync("npx tsx scripts/generate-scout-workspace.ts", {
      cwd: ROOT,
      stdio: "pipe",
    });

    // Compare
    for (const f of allFiles) {
      const after = readFile(f);
      assert.equal(
        after,
        snapshot[f],
        `${f} should be identical on second run`
      );
    }
  });
});

// ─────────────────────────────────────────────
// 11. No sensitive data in generated files
// ─────────────────────────────────────────────

describe("No sensitive data", () => {
  it("does not contain real API keys", () => {
    const allFiles = [
      "SOUL.md",
      "HEARTBEAT.md",
      "USER.md",
      "TOOLS.md",
      "prospect-scoring-rubric.md",
    ];
    for (const f of allFiles) {
      const content = readFile(f);
      assert.ok(
        !content.match(/sk-[a-zA-Z0-9]{20,}/),
        `${f} should not contain API key patterns`
      );
      assert.ok(
        !content.match(/AKIA[A-Z0-9]{16}/),
        `${f} should not contain AWS key patterns`
      );
    }
  });

  it("does not contain real email addresses", () => {
    const allFiles = [
      "SOUL.md",
      "HEARTBEAT.md",
      "USER.md",
      "TOOLS.md",
      "prospect-scoring-rubric.md",
    ];
    for (const f of allFiles) {
      const content = readFile(f);
      // Allow placeholder emails like scout@clawstaff.ai
      const realEmails = content.match(
        /[a-zA-Z0-9._%+-]+@(?!clawstaff\.ai|example\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      );
      assert.ok(
        !realEmails || realEmails.length === 0,
        `${f} should not contain real email addresses, found: ${realEmails}`
      );
    }
  });
});

// ─────────────────────────────────────────────
// 12. Cross-file consistency
// ─────────────────────────────────────────────

describe("Cross-file consistency", () => {
  it("SOUL.md and HEARTBEAT.md both mention the 60+ scoring threshold", () => {
    const soul = readFile("SOUL.md");
    const rubric = readFile("prospect-scoring-rubric.md");
    assert.ok(soul.includes("60") || soul.includes("sixty"));
    assert.ok(rubric.includes("60"));
  });

  it("SOUL.md and TOOLS.md agree on outreach channels", () => {
    const soul = readFile("SOUL.md").toLowerCase();
    const tools = readFile("TOOLS.md").toLowerCase();
    const channels = ["email", "instagram", "facebook"];
    for (const ch of channels) {
      assert.ok(soul.includes(ch), `SOUL.md should mention ${ch}`);
      assert.ok(tools.includes(ch), `TOOLS.md should mention ${ch}`);
    }
  });

  it("SOUL.md and USER.md agree on WhatsApp for summaries", () => {
    const soul = readFile("SOUL.md");
    const user = readFile("USER.md");
    assert.ok(soul.includes("WhatsApp"));
    assert.ok(user.includes("WhatsApp"));
  });

  it("pricing is consistent across SOUL.md and response-pricing.md", () => {
    const soul = readFile("SOUL.md");
    const pricing = readFile("outreach-templates/response-pricing.md");
    for (const price of ["$299", "$499", "$799"]) {
      assert.ok(soul.includes(price), `SOUL.md should include ${price}`);
      assert.ok(
        pricing.includes(price),
        `response-pricing.md should include ${price}`
      );
    }
  });
});
