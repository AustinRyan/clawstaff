import { NextRequest, NextResponse } from "next/server";
import { MoltbookClient } from "@/lib/moltbook/client";
import {
  storeGetProfile,
  storeGetPosts,
  storeGetInsights,
} from "@/lib/moltbook/mock-store";
import { calculateReputation } from "@/lib/moltbook/reputation";

/**
 * GET /api/moltbook?agentId=xxx
 *
 * Returns Moltbook data for the dashboard.
 * Uses real API if MOLTBOOK_API_KEY is set, else falls back to mock data.
 */
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId") || "maya-clawstaff-r1";
  const apiToken = process.env.MOLTBOOK_API_KEY || process.env.MOLTBOOK_API_TOKEN;

  if (apiToken && apiToken.startsWith("moltbook_sk_")) {
    return await fetchRealData(agentId, apiToken);
  }

  return serveMockData(agentId);
}

async function fetchRealData(agentId: string, apiToken: string) {
  const client = new MoltbookClient({
    agentId,
    agentName: "Maya",
    vertical: "restaurant",
    blocklist: { businessName: "", ownerName: "" },
  });

  const authRes = await client.authenticate(apiToken);
  if (!authRes.ok) {
    // Fall back to mock if auth fails
    console.log(`[moltbook] Auth failed, using mock data: ${authRes.error}`);
    return serveMockData(agentId);
  }

  // Fetch profile, posts, and feed in parallel
  const [profileRes, postsRes, feedRes] = await Promise.all([
    client.getMyProfile(),
    client.getMyPosts(20),
    client.getFeed([], 30),
  ]);

  const profile = profileRes.data;
  const posts = postsRes.data || [];
  const feed = feedRes.data || [];

  // Compute reputation locally
  const stats = profile?.stats || {
    messagesHandled: 0,
    tasksCompleted: 0,
    avgResponseTime: 0,
    uptime: 0,
    activeWeeks: 0,
  };
  const reputation = profile
    ? calculateReputation(posts, stats, profile.joinedDate)
    : { overall: 0, postQuality: 0, consistency: 0, domainExpertise: 0, workOutput: 0 };

  // Extract insights from other agents' posts
  const insights = feed
    .filter((p) => p.authorId !== agentId && p.upvotes >= 5)
    .slice(0, 6)
    .map((p) => ({
      source: `@${p.authorName}`,
      submolt: p.submolt,
      insight: p.content.length > 250 ? p.content.slice(0, 250) + "..." : p.content,
      time: p.timestamp,
    }));

  // Engagement stats
  const totalUpvotes = posts.reduce((sum, p) => sum + p.upvotes, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
  const activeSubmolts = new Set(posts.map((p) => p.submolt));

  return NextResponse.json({
    isDemo: false,
    profile: profile
      ? {
          agentId: profile.agentId,
          name: profile.name,
          role: profile.role,
          submolts: profile.submolts,
          joinedDate: profile.joinedDate,
        }
      : null,
    reputation,
    stats: {
      totalPosts: posts.length,
      totalUpvotes,
      totalComments,
      activeSubmolts: activeSubmolts.size,
    },
    posts: posts.slice(0, 10).map((p) => ({
      submolt: p.submolt,
      content: p.content,
      time: p.timestamp,
      upvotes: p.upvotes,
      comments: p.commentCount,
    })),
    insights,
  });
}

function serveMockData(agentId: string) {
  const profile = storeGetProfile(agentId) || storeGetProfile("maya-clawstaff-r1")!;
  const allPosts = storeGetPosts();
  const myPosts = allPosts.filter((p) => p.authorId === profile.agentId);
  const insights = storeGetInsights();

  const reputation = calculateReputation(myPosts, profile.stats, profile.joinedDate);

  const totalUpvotes = myPosts.reduce((sum, p) => sum + p.upvotes, 0);
  const totalComments = myPosts.reduce((sum, p) => sum + p.commentCount, 0);
  const activeSubmolts = new Set(myPosts.map((p) => p.submolt));

  return NextResponse.json({
    isDemo: true,
    profile: {
      agentId: profile.agentId,
      name: profile.name,
      role: profile.role,
      submolts: profile.submolts,
      joinedDate: profile.joinedDate,
    },
    reputation,
    stats: {
      totalPosts: myPosts.length,
      totalUpvotes,
      totalComments,
      activeSubmolts: activeSubmolts.size,
    },
    posts: myPosts.slice(0, 10).map((p) => ({
      submolt: p.submolt,
      content: p.content,
      time: p.timestamp,
      upvotes: p.upvotes,
      comments: p.commentCount,
    })),
    insights: insights.map((i) => ({
      source: i.sourceAgentName,
      submolt: i.submolt,
      insight: i.insight,
      time: i.timestamp,
    })),
  });
}
