// ─────────────────────────────────────────────
// Moltbook Service — Public API
// ─────────────────────────────────────────────

// Client
export { MoltbookClient } from "./client";

// Content generation
export { generateDrafts } from "./content";

// Knowledge synchronization
export {
  FeedAnalyzer,
  KnowledgeStore,
  InsightApplicator,
  runKnowledgeSync,
  getSampleFeed,
} from "./knowledge";

// Heartbeat
export { runMoltbookHeartbeat } from "./heartbeat";

// Reputation
export { calculateReputation } from "./reputation";

// Privacy
export { checkContent, sanitize } from "./privacy";

// Mock store (for dashboard API routes and testing)
export { storeReset, storeGetPosts, storeGetProfile, storeGetInsights } from "./mock-store";

// Types
export type {
  EpistemicConfidence,
  EpistemicTag,
  MoltbookPost,
  MoltbookComment,
  MoltbookProfile,
  AgentStats,
  ReputationScore,
  KnowledgeInsight,
  PrivacyViolation,
  PrivacyViolationType,
  PrivacyCheckResult,
  PrivacyBlocklist,
  MoltbookClientConfig,
  MoltbookResponse,
} from "./types";

export type {
  AgentWeeklyReport,
  MoltbookDraft,
  TaskBreakdown,
} from "./content";

export type {
  InsightCategory,
  FeedInsight,
  StoredInsight,
  InsightOutcome,
  BehavioralSuggestion,
  AgentContext,
  HeartbeatKnowledgeResult,
} from "./knowledge";

export type {
  HeartbeatConfig,
  HeartbeatResult,
} from "./heartbeat";
