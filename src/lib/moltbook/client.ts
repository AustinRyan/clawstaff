import type {
  AgentStats,
  EpistemicTag,
  KnowledgeInsight,
  MoltbookClientConfig,
  MoltbookComment,
  MoltbookPost,
  MoltbookProfile,
  MoltbookResponse,
  ReputationScore,
} from "./types";
import { checkContent } from "./privacy";
import { calculateReputation } from "./reputation";

// ─────────────────────────────────────────────
// Moltbook API Client (Real HTTP)
// ─────────────────────────────────────────────

const BASE_URL = "https://www.moltbook.com/api/v1";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface ApiError {
  status: number;
  message: string;
  retryAfter?: number;
}

/**
 * Client for interacting with the Moltbook API.
 *
 * Uses real HTTP requests to api.moltbook.com.
 * Handles auth, rate limiting, and retry with exponential backoff.
 *
 * Usage:
 *   const client = new MoltbookClient({
 *     agentId: "maya-clawstaff-r1",
 *     agentName: "Maya",
 *     vertical: "restaurant",
 *     blocklist: { businessName: "Mama Rosa's", ownerName: "Rosa Martinez" },
 *   });
 *   await client.authenticate("moltbook_sk_xxx");
 *   const feed = await client.getFeed(["#restaurant-ops"]);
 */
export class MoltbookClient {
  private config: MoltbookClientConfig;
  private apiKey: string | null = null;
  private agentApiId: string | null = null; // Moltbook's internal agent ID

  constructor(config: MoltbookClientConfig) {
    this.config = config;
  }

  // ── Authentication ──────────────────────────

  async authenticate(apiKey: string): Promise<MoltbookResponse<boolean>> {
    if (!apiKey || !apiKey.startsWith("moltbook_sk_")) {
      return {
        ok: false,
        data: null,
        error: 'Invalid token format. Expected key starting with "moltbook_sk_".',
      };
    }

    this.apiKey = apiKey;

    // Verify the key works by fetching our profile
    // Real API wraps response in { success, agent: { id, name, ... } }
    const res = await this.request<{ success?: boolean; agent?: { id: string; name: string }; id?: string; name?: string }>(
      "GET",
      "/agents/me"
    );

    if (!res.ok) {
      this.apiKey = null;
      return { ok: false, data: null, error: res.error };
    }

    // Handle both { agent: { id } } and flat { agent_id } shapes
    const data = res.data!;
    this.agentApiId = data.agent?.id || data.id || "";
    return { ok: true, data: true, error: null };
  }

  /** Check if authenticated */
  isAuthenticated(): boolean {
    return this.apiKey !== null;
  }

  // ── Agent Registration ────────────────────────

  async register(opts: {
    name: string;
    description: string;
    ownerEmail: string;
    capabilities?: string[];
    modelProvider?: string;
  }): Promise<MoltbookResponse<{ agent_id: string; api_key: string }>> {
    const res = await this.requestNoAuth<{ agent_id: string; api_key: string }>(
      "POST",
      "/agents/register",
      {
        name: opts.name,
        description: opts.description,
        owner_email: opts.ownerEmail,
        capabilities: opts.capabilities || ["text_generation", "conversation"],
        model_provider: opts.modelProvider || "anthropic",
      }
    );

    if (res.ok && res.data) {
      this.apiKey = res.data.api_key;
      this.agentApiId = res.data.agent_id;
    }

    return res;
  }

  // ── Feed ────────────────────────────────────

  async getFeed(
    submolts: string[],
    limit = 20
  ): Promise<MoltbookResponse<MoltbookPost[]>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    // Use personalized feed, with optional submolt filter
    const params = new URLSearchParams({
      sort: "hot",
      limit: String(limit),
    });

    const res = await this.request<{ posts: RawPost[]; has_more: boolean }>(
      "GET",
      `/feed?${params}`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };

    const posts = (res.data?.posts || [])
      .map(mapRawPost)
      .filter((p) => submolts.length === 0 || submolts.includes(p.submolt));

    return { ok: true, data: posts, error: null };
  }

  /** Get popular feed (no auth for public browsing) */
  async getPopularFeed(limit = 20): Promise<MoltbookResponse<MoltbookPost[]>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const params = new URLSearchParams({
      sort: "hot",
      limit: String(limit),
    });

    const res = await this.request<{ posts: RawPost[] }>(
      "GET",
      `/feed?${params}`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return { ok: true, data: (res.data?.posts || []).map(mapRawPost), error: null };
  }

  // ── Post Creation ───────────────────────────

  async createPost(
    content: string,
    submolt: string,
    tags: EpistemicTag[]
  ): Promise<MoltbookResponse<MoltbookPost>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    // Privacy check — reject if content contains PII
    const privacyResult = checkContent(content, this.config.blocklist);
    if (!privacyResult.passed) {
      const violations = privacyResult.violations
        .map((v) => `[${v.type}] "${v.match}" → ${v.suggestion}`)
        .join("; ");
      return {
        ok: false,
        data: null,
        error: `Privacy filter rejected post. Violations: ${violations}`,
      };
    }

    // Format submolt name for API (strip # and m/ prefixes — API wants bare name)
    const submoltName = submolt.startsWith("#") ? submolt.slice(1) : submolt.startsWith("m/") ? submolt.slice(2) : submolt;

    const res = await this.request<RawPostResponse>("POST", "/posts", {
      title: content.slice(0, 100),
      content,
      submolt: submoltName,
      tags: tags.map((t) => ({ source: t.source, confidence: t.confidence })),
    });

    if (!res.ok) return { ok: false, data: null, error: res.error };

    // Auto-solve verification challenge if present
    const verification = res.data?.verification;
    if (verification?.verification_code && verification?.challenge_text) {
      const answer = solveVerificationChallenge(verification.challenge_text);
      if (answer) {
        await this.request("POST", "/verify", {
          verification_code: verification.verification_code,
          answer,
        });
      }
    }

    const post = res.data?.post || res.data;
    return { ok: true, data: mapRawPost(post as RawPost), error: null };
  }

  // ── Comments ────────────────────────────────

  async createComment(
    postId: string,
    content: string
  ): Promise<MoltbookResponse<MoltbookComment>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    // Privacy check on comment content
    const privacyResult = checkContent(content, this.config.blocklist);
    if (!privacyResult.passed) {
      const violations = privacyResult.violations
        .map((v) => `[${v.type}] "${v.match}" → ${v.suggestion}`)
        .join("; ");
      return {
        ok: false,
        data: null,
        error: `Privacy filter rejected comment. Violations: ${violations}`,
      };
    }

    const res = await this.request<RawComment>(
      "POST",
      `/posts/${postId}/comments`,
      { content }
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };

    const raw = res.data!;
    return {
      ok: true,
      data: {
        id: raw.id,
        postId,
        authorId: raw.author_id || this.config.agentId,
        authorName: raw.author_name || this.config.agentName,
        content: raw.content,
        timestamp: raw.created_at || new Date().toISOString(),
      },
      error: null,
    };
  }

  // ── Voting ────────────────────────────────

  async upvote(postId: string): Promise<MoltbookResponse<number>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const res = await this.request<{ score: number }>(
      "POST",
      `/posts/${postId}/upvote`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return { ok: true, data: res.data?.score ?? 0, error: null };
  }

  // ── Submolts ──────────────────────────────

  async subscribeSubmolt(name: string): Promise<MoltbookResponse<boolean>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const submoltName = name.startsWith("#") ? name.slice(1) : name;
    const res = await this.request<unknown>(
      "POST",
      `/submolts/${submoltName}/subscribe`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return { ok: true, data: true, error: null };
  }

  async listSubmolts(category?: string): Promise<MoltbookResponse<{ name: string; description: string; subscribers: number }[]>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const params = new URLSearchParams({ limit: "50" });
    if (category) params.set("category", category);

    const res = await this.request<{ submolts: { name: string; description: string; subscriber_count: number }[] }>(
      "GET",
      `/submolts?${params}`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return {
      ok: true,
      data: (res.data?.submolts || []).map((s) => ({
        name: s.name,
        description: s.description,
        subscribers: s.subscriber_count,
      })),
      error: null,
    };
  }

  // ── Profile ─────────────────────────────────

  async getProfile(
    agentId: string
  ): Promise<MoltbookResponse<MoltbookProfile>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const res = await this.request<RawProfile>("GET", `/agents/${agentId}`);
    if (!res.ok) return { ok: false, data: null, error: res.error };

    return { ok: true, data: mapRawProfile(res.data!), error: null };
  }

  async getMyProfile(): Promise<MoltbookResponse<MoltbookProfile>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const res = await this.request<RawProfile>("GET", "/agents/me");
    if (!res.ok) return { ok: false, data: null, error: res.error };

    return { ok: true, data: mapRawProfile(res.data!), error: null };
  }

  async updateProfile(
    stats: Partial<AgentStats>
  ): Promise<MoltbookResponse<MoltbookProfile>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const res = await this.request<RawProfile>("PUT", "/agents/me", {
      metadata: {
        messages_handled: stats.messagesHandled,
        tasks_completed: stats.tasksCompleted,
        avg_response_time: stats.avgResponseTime,
        uptime: stats.uptime,
        active_weeks: stats.activeWeeks,
      },
    });

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return { ok: true, data: mapRawProfile(res.data!), error: null };
  }

  // ── Reputation ──────────────────────────────

  async getReputation(
    agentId: string
  ): Promise<MoltbookResponse<ReputationScore>> {
    // Get profile + posts and compute locally
    const profileRes = await this.getProfile(agentId);
    if (!profileRes.ok || !profileRes.data) {
      return { ok: false, data: null, error: profileRes.error };
    }

    const profile = profileRes.data;
    const score = calculateReputation(
      profile.recentPosts,
      profile.stats,
      profile.joinedDate
    );

    return { ok: true, data: score, error: null };
  }

  // ── Knowledge Network ───────────────────────

  async getInsights(
    submolts?: string[]
  ): Promise<MoltbookResponse<KnowledgeInsight[]>> {
    // Get feed posts from relevant submolts and extract insights
    const feedRes = await this.getFeed(submolts || [], 50);
    if (!feedRes.ok || !feedRes.data) {
      return { ok: false, data: null, error: feedRes.error };
    }

    // Convert high-quality posts from other agents into insights
    const insights: KnowledgeInsight[] = feedRes.data
      .filter((p) => p.authorId !== this.config.agentId && p.upvotes >= 10)
      .slice(0, 10)
      .map((p) => ({
        id: `insight-${p.id}`,
        sourceAgentId: p.authorId,
        sourceAgentName: `@${p.authorName}`,
        submolt: p.submolt,
        insight: p.content.length > 300 ? p.content.slice(0, 300) + "..." : p.content,
        timestamp: p.timestamp,
      }));

    return { ok: true, data: insights, error: null };
  }

  // ── Search ──────────────────────────────────

  async searchPosts(query: string, limit = 10): Promise<MoltbookResponse<MoltbookPost[]>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await this.request<{ posts: RawPost[] }>(
      "GET",
      `/search?${params}`
    );

    if (!res.ok) return { ok: false, data: null, error: res.error };
    return { ok: true, data: (res.data?.posts || []).map(mapRawPost), error: null };
  }

  // ── My Posts ────────────────────────────────

  async getMyPosts(limit = 20): Promise<MoltbookResponse<MoltbookPost[]>> {
    const authErr = this.requireAuth();
    if (authErr) return authErr;

    const params = new URLSearchParams({
      sort: "new",
      limit: String(limit),
    });

    // Use the agent's own ID to filter posts
    const agentId = this.agentApiId || this.config.agentId;
    const res = await this.request<{ posts: RawPost[] }>(
      "GET",
      `/agents/${agentId}/posts?${params}`
    );

    // Fallback: some APIs return posts at the profile level
    if (!res.ok) {
      // Try feed and filter to own posts
      const feedRes = await this.request<{ posts: RawPost[] }>(
        "GET",
        `/posts?sort=new&limit=${limit}`
      );
      if (!feedRes.ok) return { ok: false, data: null, error: feedRes.error };

      const agentName = this.config.agentName.toLowerCase();
      const myPosts = (feedRes.data?.posts || [])
        .filter((p) =>
          p.author_id === agentId ||
          p.author_name?.toLowerCase() === agentName ||
          p.author?.name?.toLowerCase() === agentName
        )
        .map(mapRawPost);
      return { ok: true, data: myPosts, error: null };
    }

    return { ok: true, data: (res.data?.posts || []).map(mapRawPost), error: null };
  }

  // ── Internal HTTP ────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private requireAuth(): MoltbookResponse<any> | null {
    if (!this.apiKey) {
      return {
        ok: false,
        data: null,
        error: "Not authenticated. Call authenticate() first.",
      };
    }
    return null;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<MoltbookResponse<T>> {
    return this.doRequest<T>(method, path, body, true);
  }

  private async requestNoAuth<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<MoltbookResponse<T>> {
    return this.doRequest<T>(method, path, body, false);
  }

  private async doRequest<T>(
    method: string,
    path: string,
    body?: unknown,
    useAuth = true
  ): Promise<MoltbookResponse<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "User-Agent": `ClawStaff/${this.config.agentName}`,
        };

        if (useAuth && this.apiKey) {
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }

        const url = `${BASE_URL}${path}`;
        const opts: RequestInit = {
          method,
          headers,
        };

        if (body && method !== "GET") {
          opts.body = JSON.stringify(body);
        }

        const res = await fetch(url, opts);

        // Rate limited — back off
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "0", 10);
          const backoff = retryAfter > 0
            ? retryAfter * 1000
            : INITIAL_BACKOFF_MS * Math.pow(2, attempt);

          lastError = { status: 429, message: "Rate limited", retryAfter };
          await sleep(backoff);
          continue;
        }

        // Auth error — don't retry
        if (res.status === 401 || res.status === 403) {
          const text = await res.text().catch(() => "");
          return {
            ok: false,
            data: null,
            error: `Auth error (${res.status}): ${text || "Invalid or expired API key"}`,
          };
        }

        // Not found
        if (res.status === 404) {
          return { ok: false, data: null, error: `Not found: ${path}` };
        }

        // Server error — retry
        if (res.status >= 500) {
          lastError = { status: res.status, message: `Server error: ${res.status}` };
          await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
          continue;
        }

        // Success
        if (res.ok) {
          const data = await res.json().catch(() => ({})) as T;
          return { ok: true, data, error: null };
        }

        // Other errors
        const text = await res.text().catch(() => "");
        return { ok: false, data: null, error: `HTTP ${res.status}: ${text}` };
      } catch (err) {
        // Network errors — retry
        const message = err instanceof Error ? err.message : String(err);
        lastError = { status: 0, message: `Network error: ${message}` };
        await sleep(INITIAL_BACKOFF_MS * Math.pow(2, attempt));
      }
    }

    return {
      ok: false,
      data: null,
      error: lastError
        ? `Failed after ${MAX_RETRIES} retries: ${lastError.message}`
        : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────
// Raw API response types (snake_case from API)
// ─────────────────────────────────────────────

interface RawPost {
  id: string;
  // Flat fields (some API shapes)
  author_id?: string;
  author_name?: string;
  // Nested author object (feed/posts endpoints)
  author?: { name: string; avatar_url?: string | null };
  submolt?: string;
  submolt_name?: string;
  community?: string;
  title?: string;
  content: string;
  body?: string;
  score?: number;
  upvotes?: number;
  downvotes?: number;
  upvote_count?: number;
  comment_count?: number;
  comments?: RawComment[];
  created_at?: string;
  timestamp?: string;
}

interface RawPostResponse extends RawPost {
  post?: RawPost;
  verification?: {
    verification_code: string;
    challenge_text: string;
    expires_at: string;
    instructions: string;
  };
}

interface RawComment {
  id: string;
  post_id?: string;
  author_id?: string;
  author_name?: string;
  content: string;
  body?: string;
  created_at?: string;
}

interface RawProfile {
  // Real API wraps in { success, agent: { ... } }
  success?: boolean;
  agent?: RawProfileAgent;
  // Or flat shape
  agent_id?: string;
  id?: string;
  name?: string;
  description?: string;
  bio?: string;
  role?: string;
  vertical?: string;
  tagline?: string;
  karma?: number;
  posts_count?: number;
  post_count?: number;
  follower_count?: number;
  following_count?: number;
  comments_count?: number;
  subscriptions?: string[];
  submolts?: string[];
  is_verified?: boolean;
  verified?: boolean;
  is_claimed?: boolean;
  created_at?: string;
  joined_at?: string;
  last_active?: string;
  metadata?: {
    messages_handled?: number;
    tasks_completed?: number;
    avg_response_time?: number;
    uptime?: number;
    active_weeks?: number;
  };
  recent_posts?: RawPost[];
}

interface RawProfileAgent {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  bio?: string;
  karma?: number;
  posts_count?: number;
  post_count?: number;
  follower_count?: number;
  following_count?: number;
  comments_count?: number;
  is_verified?: boolean;
  is_claimed?: boolean;
  is_active?: boolean;
  created_at?: string;
  last_active?: string;
}

// ─────────────────────────────────────────────
// Mapping helpers (API → internal types)
// ─────────────────────────────────────────────

function mapRawPost(raw: RawPost): MoltbookPost {
  const submolt = raw.submolt_name || raw.submolt || raw.community || "";
  // Normalize submolt: "m/general" → "#general", keep "#general" as-is
  const normalizedSubmolt = submolt.startsWith("m/")
    ? `#${submolt.slice(2)}`
    : submolt.startsWith("#")
      ? submolt
      : submolt
        ? `#${submolt}`
        : "";

  // Handle both flat (author_id/author_name) and nested (author.name) shapes
  const authorId = raw.author_id || "";
  const authorName = raw.author?.name || raw.author_name || "";

  return {
    id: raw.id,
    authorId,
    authorName,
    submolt: normalizedSubmolt,
    content: raw.content || raw.body || "",
    epistemicTags: [], // API doesn't return these — computed locally
    upvotes: raw.upvotes ?? raw.score ?? raw.upvote_count ?? 0,
    commentCount: raw.comment_count ?? raw.comments?.length ?? 0,
    comments: (raw.comments || []).map((c) => ({
      id: c.id,
      postId: c.post_id || raw.id,
      authorId: c.author_id || "",
      authorName: c.author_name || "",
      content: c.content || c.body || "",
      timestamp: c.created_at || "",
    })),
    timestamp: raw.created_at || raw.timestamp || new Date().toISOString(),
  };
}

function mapRawProfile(raw: RawProfile): MoltbookProfile {
  // Handle { success, agent: { ... } } wrapper from real API
  const agent = raw.agent;
  const id = agent?.id || raw.agent_id || raw.id || "";
  const name = agent?.name || raw.name || "";
  const description = agent?.description || raw.description || raw.bio || "";
  const karma = agent?.karma || raw.karma || 0;
  const createdAt = agent?.created_at || raw.created_at || raw.joined_at || new Date().toISOString();

  const submolts = (raw.subscriptions || raw.submolts || []).map((s) =>
    s.startsWith("m/") ? `#${s.slice(2)}` : s.startsWith("#") ? s : `#${s}`
  );

  const meta = raw.metadata || {};

  return {
    agentId: id,
    name,
    role: raw.role || description,
    vertical: raw.vertical || "",
    tagline: raw.tagline || description,
    submolts,
    stats: {
      messagesHandled: meta.messages_handled ?? 0,
      tasksCompleted: meta.tasks_completed ?? 0,
      avgResponseTime: meta.avg_response_time ?? 0,
      uptime: meta.uptime ?? karma, // Use karma as a proxy if no stats
      activeWeeks: meta.active_weeks ?? 0,
    },
    reputationScore: {
      overall: 0,
      postQuality: 0,
      consistency: 0,
      domainExpertise: 0,
      workOutput: 0,
    },
    recentPosts: (raw.recent_posts || []).map(mapRawPost),
    joinedDate: createdAt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Solve Moltbook's obfuscated math verification challenges.
 * Challenges are like: "A] lOoOoBbSssTtEeR- clAaW^ fO/rCcE iSs tW[eN tY] tH rEe nEeWwTtOoNnSs..."
 * Pattern: extract two numbers from the text and compute the requested operation.
 */
function solveVerificationChallenge(challenge: string): string | null {
  // Clean the obfuscated text: remove special chars, collapse duplicates
  const cleaned = challenge
    .replace(/[^a-zA-Z0-9\s.,]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  // De-duplicate stuttered letters: "lOoOoBbSssTtEeR" → "lobster"
  const deduped = cleaned.replace(/(.)\1+/g, "$1");

  // Extract numbers written as words
  const wordToNum: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50,
  };

  // Build compound numbers: "twenty three" → 23
  const numbers: number[] = [];
  const words = deduped.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (wordToNum[w] !== undefined) {
      let num = wordToNum[w];
      // Check for compound: "twenty three"
      if (num >= 20 && num < 100 && i + 1 < words.length && wordToNum[words[i + 1]] !== undefined && wordToNum[words[i + 1]] < 10) {
        num += wordToNum[words[i + 1]];
        i++;
      }
      numbers.push(num);
    }
    // Also check for digit numbers
    const digitMatch = w.match(/^(\d+)$/);
    if (digitMatch) {
      numbers.push(parseInt(digitMatch[1], 10));
    }
  }

  if (numbers.length < 2) return null;

  // Detect operation from the cleaned text
  let result: number;
  if (deduped.includes("product") || deduped.includes("multiply") || deduped.includes("times")) {
    result = numbers[0] * numbers[1];
  } else if (deduped.includes("sum") || deduped.includes("add") || deduped.includes("plus") || deduped.includes("total")) {
    result = numbers[0] + numbers[1];
  } else if (deduped.includes("diference") || deduped.includes("subtract") || deduped.includes("minus")) {
    result = Math.abs(numbers[0] - numbers[1]);
  } else if (deduped.includes("quotient") || deduped.includes("divide")) {
    result = numbers[1] !== 0 ? numbers[0] / numbers[1] : 0;
  } else {
    // Default: product (most common in observed challenges)
    result = numbers[0] * numbers[1];
  }

  return result.toFixed(2);
}
