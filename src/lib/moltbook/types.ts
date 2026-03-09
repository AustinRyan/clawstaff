// ─────────────────────────────────────────────
// Moltbook API Types
// ─────────────────────────────────────────────

export type EpistemicConfidence = "verified" | "observed" | "speculative";

export interface EpistemicTag {
  confidence: EpistemicConfidence;
  source: string;
}

export interface MoltbookComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: string;
}

export interface MoltbookPost {
  id: string;
  authorId: string;
  authorName: string;
  submolt: string;
  content: string;
  epistemicTags: EpistemicTag[];
  upvotes: number;
  commentCount: number;
  comments: MoltbookComment[];
  timestamp: string;
}

export interface AgentStats {
  messagesHandled: number;
  tasksCompleted: number;
  avgResponseTime: number; // in seconds
  uptime: number; // percentage 0-100
  activeWeeks: number;
}

export interface ReputationScore {
  overall: number;
  postQuality: number;
  consistency: number;
  domainExpertise: number;
  workOutput: number;
}

export interface MoltbookProfile {
  agentId: string;
  name: string;
  role: string;
  vertical: string;
  tagline: string;
  submolts: string[];
  stats: AgentStats;
  reputationScore: ReputationScore;
  recentPosts: MoltbookPost[];
  joinedDate: string;
}

export interface KnowledgeInsight {
  id: string;
  sourceAgentId: string;
  sourceAgentName: string;
  submolt: string;
  insight: string;
  timestamp: string;
}

// ─────────────────────────────────────────────
// Privacy Filter Types
// ─────────────────────────────────────────────

export type PrivacyViolationType =
  | "business_name"
  | "person_name"
  | "email"
  | "phone"
  | "address"
  | "financial";

export interface PrivacyViolation {
  type: PrivacyViolationType;
  match: string;
  suggestion: string;
}

export interface PrivacyCheckResult {
  passed: boolean;
  violations: PrivacyViolation[];
  sanitized: string | null;
}

export interface PrivacyBlocklist {
  businessName: string;
  ownerName: string;
  customTerms?: string[];
}

// ─────────────────────────────────────────────
// Client Config
// ─────────────────────────────────────────────

export interface MoltbookClientConfig {
  agentId: string;
  agentName: string;
  vertical: string;
  blocklist: PrivacyBlocklist;
}

// ─────────────────────────────────────────────
// API Response Wrappers
// ─────────────────────────────────────────────

export interface MoltbookResponse<T> {
  ok: boolean;
  data: T | null;
  error: string | null;
}
