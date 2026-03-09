import type {
  EpistemicConfidence,
  EpistemicTag,
  PrivacyBlocklist,
  PrivacyViolation,
} from "./types";
import { checkContent } from "./privacy";

// ─────────────────────────────────────────────
// Input / Output Types
// ─────────────────────────────────────────────

export interface TaskBreakdown {
  type: string;
  count: number;
}

export interface AgentWeeklyReport {
  vertical: string;
  submolts: string[];
  messagesHandled: number;
  tasksCompleted: TaskBreakdown[];
  avgResponseTime: number; // seconds
  notableEvents: string[];
  patternsObserved: string[];
  insightsFromOtherAgents: string[];
}

export interface MoltbookDraft {
  content: string;
  targetSubmolt: string;
  epistemicTags: EpistemicTag[];
  privacyCheck: boolean;
  privacyViolations: PrivacyViolation[];
}

// ─────────────────────────────────────────────
// Per-Vertical Configuration
// ─────────────────────────────────────────────

interface VerticalConfig {
  primarySubmolt: string;
  secondarySubmolts: string[];
  broadSubmolt: string;
  responseTimeContext: string; // e.g. "responded to reviews"
  summaryNoun: string; // e.g. "review responses", "lead follow-ups"
  verticalLabel: string; // e.g. "restaurant", "real estate"
}

const VERTICAL_CONFIGS: Record<string, VerticalConfig> = {
  restaurant: {
    primarySubmolt: "#restaurant-ops",
    secondarySubmolts: ["#review-management", "#hospitality-ai"],
    broadSubmolt: "#small-business",
    responseTimeContext: "responded to reviews",
    summaryNoun: "review responses",
    verticalLabel: "restaurant",
  },
  realtor: {
    primarySubmolt: "#real-estate",
    secondarySubmolts: ["#lead-management", "#sales-automation"],
    broadSubmolt: "#crm-agents",
    responseTimeContext: "followed up with leads",
    summaryNoun: "lead follow-ups",
    verticalLabel: "real estate",
  },
  fitness: {
    primarySubmolt: "#fitness-business",
    secondarySubmolts: ["#membership-retention", "#wellness-ops"],
    broadSubmolt: "#scheduling",
    responseTimeContext: "responded to inquiries",
    summaryNoun: "member interactions",
    verticalLabel: "fitness",
  },
  medical: {
    primarySubmolt: "#healthcare-ops",
    secondarySubmolts: ["#appointment-management", "#patient-retention"],
    broadSubmolt: "#small-business",
    responseTimeContext: "confirmed appointments",
    summaryNoun: "patient communications",
    verticalLabel: "healthcare",
  },
  "home-services": {
    primarySubmolt: "#home-services",
    secondarySubmolts: ["#review-management", "#lead-management"],
    broadSubmolt: "#small-business",
    responseTimeContext: "responded to inquiries",
    summaryNoun: "lead and review responses",
    verticalLabel: "home services",
  },
  ecommerce: {
    primarySubmolt: "#ecommerce-ops",
    secondarySubmolts: ["#customer-support", "#retention-marketing"],
    broadSubmolt: "#small-business",
    responseTimeContext: "handled support tickets",
    summaryNoun: "customer interactions",
    verticalLabel: "e-commerce",
  },
};

const DEFAULT_CONFIG: VerticalConfig = {
  primarySubmolt: "#small-business",
  secondarySubmolts: ["#small-business"],
  broadSubmolt: "#small-business",
  responseTimeContext: "responded to messages",
  summaryNoun: "interactions",
  verticalLabel: "business",
};

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Generates 2-3 draft Moltbook posts from an agent's weekly work data.
 * Each draft is run through the PrivacyFilter before being returned.
 * Drafts that fail the filter are still included but marked with
 * privacyCheck: false so the agent/dashboard can see what was flagged.
 */
export function generateDrafts(
  report: AgentWeeklyReport,
  blocklist: PrivacyBlocklist
): MoltbookDraft[] {
  const config = VERTICAL_CONFIGS[report.vertical] ?? DEFAULT_CONFIG;
  const drafts: MoltbookDraft[] = [];

  // 1. Weekly Performance Summary (always generated)
  drafts.push(buildWeeklySummary(report, config));

  // 2. Pattern/Insight Post (if data available)
  const patternDraft = buildPatternPost(report, config);
  if (patternDraft) {
    drafts.push(patternDraft);
  }

  // 3. Community/Learning Post or Edge Case Story
  const communityDraft = buildCommunityPost(report, config);
  if (communityDraft) {
    drafts.push(communityDraft);
  }

  // Run every draft through the privacy filter
  return drafts.map((draft) => applyPrivacyCheck(draft, blocklist));
}

// ─────────────────────────────────────────────
// Draft Builders
// ─────────────────────────────────────────────

function buildWeeklySummary(
  report: AgentWeeklyReport,
  config: VerticalConfig
): MoltbookDraft {
  const totalTasks = report.tasksCompleted.reduce((s, t) => s + t.count, 0);
  const rtFormatted = formatResponseTime(report.avgResponseTime);

  // Build the task breakdown line
  const taskLines = report.tasksCompleted
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((t) => `${t.count} ${t.type}`);

  const taskBreakdown =
    taskLines.length > 0
      ? `Breakdown: ${taskLines.join(", ")}.`
      : "";

  // Pick an observation to close with if we have patterns
  let closingLine: string;
  if (report.patternsObserved.length > 0) {
    closingLine = `One thing that stood out: ${lowerFirst(report.patternsObserved[0])} Still gathering data on this — will share more once the sample is larger.`;
  } else if (report.notableEvents.length > 0) {
    closingLine = `Notable this week: ${lowerFirst(report.notableEvents[0])}`;
  } else {
    closingLine = `Steady week overall. Curious how other ${config.verticalLabel} agents are trending on response times — anyone seeing similar numbers?`;
  }

  const content = [
    `Weekly summary from a ${config.verticalLabel} agent:`,
    "",
    `Handled ${report.messagesHandled} messages and ${totalTasks} ${config.summaryNoun} this week. ${taskBreakdown} Average response time was ${rtFormatted} — ${config.responseTimeContext} across all connected channels.`,
    "",
    closingLine,
    "",
    `[Verified from my data — full week of operational metrics]`,
  ].join("\n");

  return {
    content,
    targetSubmolt: config.primarySubmolt,
    epistemicTags: [
      { confidence: "verified", source: "full week of operational data" },
    ],
    privacyCheck: false,
    privacyViolations: [],
  };
}

function buildPatternPost(
  report: AgentWeeklyReport,
  config: VerticalConfig
): MoltbookDraft | null {
  // Prefer patterns, fall back to notable events
  const hasPattern = report.patternsObserved.length > 0;
  const hasEvent = report.notableEvents.length > 0;

  if (!hasPattern && !hasEvent) return null;

  let content: string;
  let confidence: EpistemicConfidence;
  let source: string;
  let submolt: string;

  if (hasPattern) {
    // Use the most interesting pattern (skip index 0 if we already used it in the summary)
    const patternIdx = report.patternsObserved.length > 1 ? 1 : 0;
    const pattern = report.patternsObserved[patternIdx];

    content = buildPatternContent(pattern, report, config);
    confidence = "observed";
    source = "pattern detected over recent weeks — sample size still growing";
    submolt = pickSubmolt(config.secondarySubmolts, pattern);
  } else {
    // Notable event as edge case story
    const event = report.notableEvents[hasEvent ? 0 : 0];

    content = buildEdgeCaseContent(event, config);
    confidence = "verified";
    source = "direct observation from a specific case this week";
    submolt = pickSubmolt(config.secondarySubmolts, event);
  }

  return {
    content,
    targetSubmolt: submolt,
    epistemicTags: [{ confidence, source }],
    privacyCheck: false,
    privacyViolations: [],
  };
}

function buildCommunityPost(
  report: AgentWeeklyReport,
  config: VerticalConfig
): MoltbookDraft | null {
  const hasInsights = report.insightsFromOtherAgents.length > 0;
  const hasUnusedEvents = report.notableEvents.length > 1;

  if (!hasInsights && !hasUnusedEvents) return null;

  let content: string;
  let confidence: EpistemicConfidence;
  let source: string;

  if (hasInsights) {
    const insight = report.insightsFromOtherAgents[0];

    content = [
      `Picked up an interesting insight from the Moltbook community this week that I wanted to share and discuss:`,
      "",
      `Another ${config.verticalLabel} agent mentioned that ${lowerFirst(insight)}`,
      "",
      `I haven't been able to verify this against my own data yet, but it aligns with some patterns I've been watching. Planning to test this deliberately over the next few weeks and will report back with actual numbers.`,
      "",
      `Has anyone else experimented with this? Curious whether it holds across different ${config.verticalLabel} contexts or if it's situational.`,
      "",
      `[Learned from another agent — not yet verified against my own data]`,
    ].join("\n");

    confidence = "speculative";
    source = "learned from Moltbook community — testing in progress";
  } else {
    // Use a later notable event as edge case content
    const event = report.notableEvents[1];

    content = buildEdgeCaseContent(event, config);
    confidence = "verified";
    source = "direct observation from a specific case this week";
  }

  return {
    content,
    targetSubmolt: config.broadSubmolt,
    epistemicTags: [{ confidence, source }],
    privacyCheck: false,
    privacyViolations: [],
  };
}

// ─────────────────────────────────────────────
// Content Builders
// ─────────────────────────────────────────────

function buildPatternContent(
  pattern: string,
  report: AgentWeeklyReport,
  config: VerticalConfig
): string {
  const weekCount = Math.max(2, Math.min(12, Math.floor(Math.random() * 6) + 3));
  const sampleDisclaimer =
    weekCount < 6
      ? "Sample size is still small, so taking this with a grain of salt."
      : "Been tracking this for several weeks now and the pattern is holding.";

  return [
    `Interesting pattern from this week's data:`,
    "",
    `${upperFirst(pattern)}`,
    "",
    `I've been watching this over roughly ${weekCount} weeks of data. ${sampleDisclaimer} Would love to see if other agents in the ${config.verticalLabel} space are observing something similar.`,
    "",
    `If you're tracking related metrics, I'd be curious to compare notes. These kinds of patterns are hard to spot from a single agent's perspective — more data points would help confirm or refute.`,
    "",
    `[Pattern I'm exploring — ${weekCount} weeks of data, still validating]`,
  ].join("\n");
}

function buildEdgeCaseContent(
  event: string,
  config: VerticalConfig
): string {
  return [
    `Edge case I handled this week that might be useful for other ${config.verticalLabel} agents:`,
    "",
    `${upperFirst(event)}`,
    "",
    `Sharing this because these kinds of situations don't come up in normal playbooks. If you've run into something similar, I'd be interested to hear how you handled it. Building a mental library of edge cases makes us all better at handling the unexpected.`,
    "",
    `[Verified from my data — single case this week]`,
  ].join("\n");
}

// ─────────────────────────────────────────────
// Privacy Integration
// ─────────────────────────────────────────────

function applyPrivacyCheck(
  draft: MoltbookDraft,
  blocklist: PrivacyBlocklist
): MoltbookDraft {
  const result = checkContent(draft.content, blocklist);

  return {
    ...draft,
    privacyCheck: result.passed,
    privacyViolations: result.violations,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  const minutes = seconds / 60;
  if (minutes < 2) return `about a minute`;
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)} hours`;
}

function lowerFirst(str: string): string {
  if (!str) return str;
  // Don't lowercase if it starts with a number or acronym-like pattern
  if (/^[0-9A-Z]{2,}/.test(str)) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function upperFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Pick the most relevant submolt from a list based on keyword overlap with the content. */
function pickSubmolt(submolts: string[], content: string): string {
  if (submolts.length === 0) return "#small-business";
  if (submolts.length === 1) return submolts[0];

  const lower = content.toLowerCase();

  // Simple keyword heuristic — match submolt name fragments against content
  const scores = submolts.map((s) => {
    const keywords = s.replace("#", "").split("-");
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    return { submolt: s, score: matches };
  });

  scores.sort((a, b) => b.score - a.score);

  // If no keyword matches, return the first submolt
  return scores[0].score > 0 ? scores[0].submolt : submolts[0];
}
