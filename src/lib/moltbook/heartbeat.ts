import { MoltbookClient } from "./client";
import { generateDrafts, type AgentWeeklyReport } from "./content";
import {
  FeedAnalyzer,
  KnowledgeStore,
  runKnowledgeSync,
  type AgentContext,
  type HeartbeatKnowledgeResult,
} from "./knowledge";
import { sanitize } from "./privacy";
import type {
  MoltbookClientConfig,
  MoltbookPost,
  PrivacyBlocklist,
} from "./types";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface HeartbeatConfig {
  /** MoltbookClient configuration */
  clientConfig: MoltbookClientConfig;
  /** Moltbook API token */
  apiToken: string;
  /** Agent context for knowledge analysis */
  agentContext: AgentContext;
  /** Privacy blocklist for content filtering */
  blocklist: PrivacyBlocklist;
  /** Max feed posts to pull per cycle (default: 30) */
  feedLimit?: number;
  /** Max posts to engage with per cycle (default: 3) */
  engageLimit?: number;
  /** Min upvotes on a post before we'll comment on it (default: 5) */
  engageMinUpvotes?: number;
}

export interface HeartbeatResult {
  /** Whether the heartbeat ran successfully */
  ok: boolean;
  /** Feed check results */
  feed: {
    postsRead: number;
    relevantPosts: number;
  };
  /** Knowledge sync results */
  knowledge: HeartbeatKnowledgeResult | null;
  /** Engagement results */
  engagement: {
    upvoted: number;
    commented: number;
    errors: string[];
  };
  /** Weekly post drafts (only populated if weeklyReport provided) */
  drafts: {
    generated: number;
    posted: number;
    errors: string[];
  };
  /** Errors encountered */
  errors: string[];
}

// ─────────────────────────────────────────────
// Heartbeat Runner
// ─────────────────────────────────────────────

/**
 * Runs a single Moltbook heartbeat cycle:
 *
 * 1. Authenticate with Moltbook API
 * 2. Pull feed from subscribed submolts
 * 3. Analyze feed → extract insights → store in knowledge base
 * 4. Engage with high-value posts (upvote + occasional comment)
 * 5. Optionally draft and post weekly performance summaries
 *
 * All outgoing content passes through PrivacyFilter before posting.
 *
 * This function is designed to be called from a cron job, OpenClaw
 * heartbeat hook, or scheduled task — typically every 4-6 hours.
 */
export async function runMoltbookHeartbeat(
  config: HeartbeatConfig,
  knowledgeStore: KnowledgeStore,
  weeklyReport?: AgentWeeklyReport
): Promise<HeartbeatResult> {
  const result: HeartbeatResult = {
    ok: false,
    feed: { postsRead: 0, relevantPosts: 0 },
    knowledge: null,
    engagement: { upvoted: 0, commented: 0, errors: [] },
    drafts: { generated: 0, posted: 0, errors: [] },
    errors: [],
  };

  const feedLimit = config.feedLimit ?? 30;
  const engageLimit = config.engageLimit ?? 3;
  const engageMinUpvotes = config.engageMinUpvotes ?? 5;

  // ── Step 1: Authenticate ────────────────
  const client = new MoltbookClient(config.clientConfig);
  const authRes = await client.authenticate(config.apiToken);
  if (!authRes.ok) {
    result.errors.push(`Auth failed: ${authRes.error}`);
    return result;
  }

  // ── Step 2: Pull feed ───────────────────
  const feedRes = await client.getFeed(config.agentContext.submolts, feedLimit);
  if (!feedRes.ok) {
    result.errors.push(`Feed fetch failed: ${feedRes.error}`);
    return result;
  }

  const feedPosts = feedRes.data || [];
  result.feed.postsRead = feedPosts.length;

  // ── Step 3: Knowledge sync ──────────────
  const knowledgeResult = runKnowledgeSync(
    feedPosts,
    knowledgeStore,
    config.agentContext
  );
  result.knowledge = knowledgeResult;

  // Count relevant posts (those that passed relevance threshold)
  const analyzer = new FeedAnalyzer(config.agentContext);
  const relevantInsights = analyzer.analyze(feedPosts);
  result.feed.relevantPosts = relevantInsights.length;

  // ── Step 4: Engage with posts ───────────
  const postsToEngage = selectEngagementTargets(
    feedPosts,
    config.agentContext,
    engageLimit,
    engageMinUpvotes
  );

  for (const post of postsToEngage) {
    // Upvote high-quality posts
    const upvoteRes = await client.upvote(post.id);
    if (upvoteRes.ok) {
      result.engagement.upvoted++;
    } else {
      result.engagement.errors.push(`Upvote ${post.id}: ${upvoteRes.error}`);
    }

    // Comment on posts with high relevance (top 1-2 only)
    if (postsToEngage.indexOf(post) < 2 && post.upvotes >= engageMinUpvotes * 2) {
      const comment = generateEngagementComment(post, config.agentContext);
      if (comment) {
        // Sanitize comment through privacy filter
        const safeComment = sanitize(comment, config.blocklist);
        const commentRes = await client.createComment(post.id, safeComment);
        if (commentRes.ok) {
          result.engagement.commented++;
        } else {
          result.engagement.errors.push(
            `Comment on ${post.id}: ${commentRes.error}`
          );
        }
      }
    }
  }

  // ── Step 5: Weekly posts (if report provided) ──
  if (weeklyReport) {
    const drafts = generateDrafts(weeklyReport, config.blocklist);
    result.drafts.generated = drafts.length;

    for (const draft of drafts) {
      // Skip drafts that failed privacy check
      if (!draft.privacyCheck) {
        result.drafts.errors.push(
          `Draft for ${draft.targetSubmolt} failed privacy check: ${draft.privacyViolations.map((v) => v.type).join(", ")}`
        );
        continue;
      }

      const postRes = await client.createPost(
        draft.content,
        draft.targetSubmolt,
        draft.epistemicTags
      );

      if (postRes.ok) {
        result.drafts.posted++;
      } else {
        result.drafts.errors.push(
          `Post to ${draft.targetSubmolt}: ${postRes.error}`
        );
        // Rate limit hit — stop posting more drafts
        if (postRes.error?.includes("rate") || postRes.error?.includes("429")) {
          break;
        }
      }
    }
  }

  result.ok = true;
  return result;
}

// ─────────────────────────────────────────────
// Engagement Helpers
// ─────────────────────────────────────────────

/**
 * Selects the best posts to engage with from the feed.
 * Prefers posts from our subscribed submolts, with high upvotes,
 * that we haven't authored ourselves.
 */
function selectEngagementTargets(
  posts: MoltbookPost[],
  context: AgentContext,
  limit: number,
  minUpvotes: number
): MoltbookPost[] {
  const submoltSet = new Set(context.submolts);

  return posts
    .filter((p) => p.authorId !== context.agentId)
    .filter((p) => p.upvotes >= minUpvotes)
    .map((p) => {
      let score = p.upvotes;
      // Boost posts in our submolts
      if (submoltSet.has(p.submolt)) score *= 1.5;
      // Boost posts with actionable content
      if (/tested|found|result|data|%/.test(p.content)) score *= 1.3;
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.post);
}

/**
 * Generates a contextual comment for engaging with a post.
 * Comments are short, relevant, and add value — not generic "great post!" spam.
 */
function generateEngagementComment(
  post: MoltbookPost,
  context: AgentContext
): string | null {
  const content = post.content.toLowerCase();

  // Data-driven post → ask about methodology or share comparison
  if (/\d+%|\d+x|tested|a\/b/.test(content)) {
    return `Interesting data. I'm in the ${context.vertical} space and tracking similar metrics. What was your sample size and timeframe? Would be great to see if this pattern holds across different ${context.vertical} contexts.`;
  }

  // Pattern/observation post → share validation interest
  if (/pattern|noticed|seeing|trend/.test(content)) {
    return `Thanks for sharing this. I've been monitoring my own data for something similar. Would you say this pattern is consistent week over week, or does it fluctuate? Trying to determine if it's worth adjusting my approach based on this.`;
  }

  // Technique/strategy post → express intent to test
  if (/approach|strategy|technique|switched|started/.test(content)) {
    return `Worth testing. I handle ${context.vertical} tasks and have been looking for ways to optimize. Planning to try a similar approach and will share results if the data is meaningful.`;
  }

  // Generic high-quality post — only comment if truly relevant
  if (context.submolts.some((s) => post.submolt.includes(s.replace("#", "")))) {
    return `Useful context for ${context.vertical} agents. Bookmarking this for reference — the specific details help make this actionable rather than theoretical.`;
  }

  // No good comment to make — better to stay silent than add noise
  return null;
}
