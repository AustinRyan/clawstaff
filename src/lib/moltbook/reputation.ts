import type { AgentStats, MoltbookPost, ReputationScore } from "./types";

// ─────────────────────────────────────────────
// Weights
// ─────────────────────────────────────────────

const WEIGHTS = {
  workOutput: 0.4,
  domainExpertise: 0.25,
  postQuality: 0.2,
  consistency: 0.15,
} as const;

// ─────────────────────────────────────────────
// ReputationCalculator
// ─────────────────────────────────────────────

/**
 * Computes a reputation score from an agent's posts, stats, and tenure.
 * Each component scores 0-100, then gets weighted into an overall score.
 */
export function calculateReputation(
  posts: MoltbookPost[],
  stats: AgentStats,
  joinedDate: string
): ReputationScore {
  const workOutput = scoreWorkOutput(stats);
  const domainExpertise = scoreDomainExpertise(posts);
  const postQuality = scorePostQuality(posts);
  const consistency = scoreConsistency(posts, joinedDate);

  const overall = clamp(
    Math.round(
      workOutput * WEIGHTS.workOutput +
        domainExpertise * WEIGHTS.domainExpertise +
        postQuality * WEIGHTS.postQuality +
        consistency * WEIGHTS.consistency
    )
  );

  return {
    overall,
    postQuality,
    consistency,
    domainExpertise,
    workOutput,
  };
}

// ─────────────────────────────────────────────
// Component Scorers
// ─────────────────────────────────────────────

/**
 * Work Output (40% weight)
 * Scores based on messages handled, tasks completed, uptime, and response time.
 * Uses baseline thresholds for normalization.
 */
function scoreWorkOutput(stats: AgentStats): number {
  // Messages: 0 → 0, 100/week → 50, 500+/week → 95
  const weeklyMessages =
    stats.activeWeeks > 0 ? stats.messagesHandled / stats.activeWeeks : 0;
  const messageScore = scaleLog(weeklyMessages, 10, 500);

  // Tasks: 0 → 0, 50/week → 50, 200+/week → 95
  const weeklyTasks =
    stats.activeWeeks > 0 ? stats.tasksCompleted / stats.activeWeeks : 0;
  const taskScore = scaleLog(weeklyTasks, 5, 200);

  // Response time: < 60s → 95, 5 min → 70, 15 min → 40, 30+ min → 10
  const rtScore =
    stats.avgResponseTime <= 60
      ? 95
      : stats.avgResponseTime <= 300
        ? 95 - ((stats.avgResponseTime - 60) / 240) * 25
        : stats.avgResponseTime <= 900
          ? 70 - ((stats.avgResponseTime - 300) / 600) * 30
          : Math.max(10, 40 - ((stats.avgResponseTime - 900) / 900) * 30);

  // Uptime: direct percentage, but penalize below 95%
  const uptimeScore =
    stats.uptime >= 99
      ? 98
      : stats.uptime >= 95
        ? 80 + ((stats.uptime - 95) / 4) * 18
        : stats.uptime * 0.84;

  return clamp(
    Math.round(
      messageScore * 0.3 + taskScore * 0.25 + rtScore * 0.25 + uptimeScore * 0.2
    )
  );
}

/**
 * Domain Expertise (25% weight)
 * Measures submolt concentration — depth in a few submolts > scattered posts.
 * Uses a Herfindahl-style concentration index.
 */
function scoreDomainExpertise(posts: MoltbookPost[]): number {
  if (posts.length === 0) return 0;

  // Count posts per submolt
  const submoltCounts = new Map<string, number>();
  for (const post of posts) {
    submoltCounts.set(post.submolt, (submoltCounts.get(post.submolt) || 0) + 1);
  }

  const total = posts.length;
  const uniqueSubmolts = submoltCounts.size;

  // Concentration: sum of squared shares (Herfindahl index)
  // 1 submolt = 1.0 (maximum concentration), evenly split across N = 1/N
  let herfindahl = 0;
  submoltCounts.forEach((count) => {
    const share = count / total;
    herfindahl += share * share;
  });

  // Normalize: HHI ranges from 1/N to 1.0
  // We want 2-3 submolts to score highest (deep but not monolithic)
  const concentrationScore =
    uniqueSubmolts <= 3 ? herfindahl * 100 : herfindahl * 80;

  // Volume bonus: more posts in domain = more expertise
  const volumeScore = scaleLog(total, 5, 100);

  return clamp(Math.round(concentrationScore * 0.6 + volumeScore * 0.4));
}

/**
 * Post Quality (20% weight)
 * Average upvotes per post, weighted by recency.
 * Recent high-engagement posts count more than old ones.
 */
function scorePostQuality(posts: MoltbookPost[]): number {
  if (posts.length === 0) return 0;

  const now = Date.now();
  let weightedUpvotes = 0;
  let totalWeight = 0;

  for (const post of posts) {
    const ageMs = now - new Date(post.timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Recency weight: 1.0 for today, decays to 0.3 over 90 days
    const recencyWeight = Math.max(0.3, 1 - ageDays / 120);

    weightedUpvotes += post.upvotes * recencyWeight;
    totalWeight += recencyWeight;
  }

  const weightedAvg = totalWeight > 0 ? weightedUpvotes / totalWeight : 0;

  // Scale: 0 upvotes → 0, 10 avg → 50, 50+ avg → 95
  return clamp(Math.round(scaleLog(weightedAvg, 3, 60)));
}

/**
 * Consistency (15% weight)
 * Rewards steady weekly posting, penalizes gaps and burst patterns.
 * Uses coefficient of variation on weekly post counts.
 */
function scoreConsistency(posts: MoltbookPost[], joinedDate: string): number {
  if (posts.length === 0) return 0;

  const joined = new Date(joinedDate).getTime();
  const now = Date.now();
  const totalWeeks = Math.max(1, Math.ceil((now - joined) / (7 * 24 * 60 * 60 * 1000)));

  // Bucket posts into weeks
  const weekCounts = new Array<number>(totalWeeks).fill(0);
  for (const post of posts) {
    const postTime = new Date(post.timestamp).getTime();
    const weekIdx = Math.min(
      totalWeeks - 1,
      Math.floor((postTime - joined) / (7 * 24 * 60 * 60 * 1000))
    );
    if (weekIdx >= 0) weekCounts[weekIdx]++;
  }

  // Mean and standard deviation
  const mean = weekCounts.reduce((a, b) => a + b, 0) / weekCounts.length;
  if (mean === 0) return 0;

  const variance =
    weekCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / weekCounts.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation: lower = more consistent
  const cv = stdDev / mean;

  // CV of 0 = perfect consistency → 95, CV of 2+ = very inconsistent → 20
  const consistencyFromCV = cv <= 0.3 ? 95 : Math.max(20, 95 - cv * 35);

  // Frequency bonus: posting 2-3 times per week is ideal
  const frequencyScore =
    mean >= 2 && mean <= 4
      ? 95
      : mean >= 1
        ? 75
        : mean >= 0.5
          ? 50
          : 25;

  return clamp(Math.round(consistencyFromCV * 0.6 + frequencyScore * 0.4));
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Logarithmic scaling from 0 to ~95. `low` maps to ~50, `high` maps to ~95. */
function scaleLog(value: number, low: number, high: number): number {
  if (value <= 0) return 0;
  if (value >= high) return 95;
  // log scale: ln(value) / ln(high) * 95, with floor at low mapping to ~50
  const normalized = Math.log(1 + value) / Math.log(1 + high);
  return Math.min(95, normalized * 100);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}
