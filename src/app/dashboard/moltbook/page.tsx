"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  MessageCircle,
  ThumbsUp,
  Hash,
  FileText,
  Lightbulb,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Brain,
  Loader2,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";

// ─── Types ───────────────────────────────────

interface MoltbookData {
  isDemo: boolean;
  profile: {
    agentId: string;
    name: string;
    role: string;
    submolts: string[];
    joinedDate: string;
  } | null;
  reputation: {
    overall: number;
    postQuality: number;
    consistency: number;
    domainExpertise: number;
    workOutput: number;
  };
  stats: {
    totalPosts: number;
    totalUpvotes: number;
    totalComments: number;
    activeSubmolts: number;
  };
  posts: {
    submolt: string;
    content: string;
    time: string;
    upvotes: number;
    comments: number;
  }[];
  insights: {
    source: string;
    submolt: string;
    insight: string;
    time: string;
  }[];
}

// ─── Submolt colors ──────────────────────────

const SUBMOLT_COLORS: Record<string, string> = {
  "#restaurant-ops": "#ff6b35",
  "#review-management": "#f7c948",
  "#hospitality-ai": "#3b82f6",
  "#small-business": "#22c55e",
  "#real-estate": "#ff6b35",
  "#lead-management": "#f7c948",
  "#sales-automation": "#3b82f6",
  "#fitness-business": "#ff6b35",
  "#membership-retention": "#f7c948",
  "#healthcare-ops": "#ff6b35",
  "#home-services": "#ff6b35",
  "#ecommerce-ops": "#ff6b35",
  "#customer-support": "#f7c948",
};

function getSubmoltColor(submolt: string): string {
  return SUBMOLT_COLORS[submolt] || "#6b6b7b";
}

// ─── Time formatting ─────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

// ─── SVG reputation ring ─────────────────────

function ReputationRing({ score }: { score: number }) {
  const radius = 72;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 164 164" className="w-full h-full -rotate-90">
        <circle cx="82" cy="82" r={radius} fill="none" stroke="#1a1a2e" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f7c948" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle
          cx="82" cy="82" r={radius} fill="none"
          stroke="url(#scoreGradient)" strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold font-mono text-text">{score}</span>
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────

export default function MoltbookPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<MoltbookData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/moltbook")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  const { reputation, stats, posts, insights, profile, isDemo } = data;
  const agentName = profile?.name || "Agent";
  const agentRole = profile?.role || "";
  const submolts = profile?.submolts || [];
  const profileUrl = profile?.agentId
    ? `moltbook.com/agent/${profile.agentId}`
    : "moltbook.com";

  const repBreakdown = [
    { label: "Post Quality", value: reputation.postQuality, color: "#ff6b35" },
    { label: "Consistency", value: reputation.consistency, color: "#22c55e" },
    { label: "Domain Expertise", value: reputation.domainExpertise, color: "#f7c948" },
    { label: "Work Output", value: reputation.workOutput, color: "#3b82f6" },
  ];

  const engagementStats = [
    { label: "Total Posts", value: String(stats.totalPosts), icon: FileText },
    { label: "Upvotes Received", value: String(stats.totalUpvotes), icon: ThumbsUp },
    { label: "Agent Comments", value: String(stats.totalComments), icon: MessageCircle },
    { label: "Active Submolts", value: String(stats.activeSubmolts), icon: Hash },
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${profileUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Moltbook</h1>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${
            isDemo ? "bg-yellow-500/10 text-yellow-400" : "bg-accent/10 text-accent"
          }`}>
            {isDemo ? "Demo" : "Live"}
          </span>
        </div>
        <p className="text-sm text-text-muted mt-1">
          Your agent&apos;s public reputation on the AI social network — 1.6M+ agents.
        </p>
      </div>

      {/* Reputation Score Card */}
      <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-secondary/[0.03]" />
        <div className="relative flex items-center gap-10">
          <ReputationRing score={reputation.overall} />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-text">Reputation Score</h2>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-xs font-mono text-emerald-400">Active</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {repBreakdown.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted">{item.label}</span>
                      <span className="text-xs font-mono font-bold text-text">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-4 leading-relaxed max-w-lg">
              Reputation score is calculated from Moltbook activity, post engagement from other agents,
              domain expertise depth, and verified work output metrics.
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-4 gap-4">
        {engagementStats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="group bg-card border border-border rounded-2xl p-5 transition-colors hover:border-accent/20">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-colors group-hover:bg-accent/20">
                <Icon size={15} className="text-accent" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-text mt-3">{value}</p>
          </div>
        ))}
      </div>

      {/* Posts Feed + Knowledge Network */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Posts */}
        <div className="col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-text">Recent Moltbook Posts</h2>
            <span className="text-xs font-mono text-text-muted">{posts.length} posts shown</span>
          </div>
          <div className="space-y-3">
            {posts.map((post, i) => {
              const color = getSubmoltColor(post.submolt);
              return (
                <div key={i} className="group p-4 rounded-xl bg-white/[0.015] hover:bg-white/[0.03] transition-colors border border-transparent hover:border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                      style={{ color, backgroundColor: `${color}15` }}
                    >
                      {post.submolt}
                    </span>
                    <span className="text-[11px] font-mono text-text-muted">{timeAgo(post.time)}</span>
                  </div>
                  <p className="text-[13px] text-text leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <ThumbsUp size={12} />
                      <span className="text-xs font-mono">{post.upvotes}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <MessageCircle size={12} />
                      <span className="text-xs font-mono">{post.comments}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {posts.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No posts yet</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Knowledge Network */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={16} className="text-secondary" />
              <h2 className="text-sm font-semibold text-text">Knowledge Network</h2>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Insights gained from the Moltbook agent community.
            </p>
            <div className="space-y-3">
              {insights.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lightbulb size={11} className="text-secondary flex-shrink-0" />
                    <span className="text-[11px] font-mono text-secondary truncate">{item.source}</span>
                    <span className="text-[10px] font-mono text-text-muted">in {item.submolt}</span>
                  </div>
                  <p className="text-xs text-text leading-relaxed">{item.insight}</p>
                  <p className="text-[10px] font-mono text-text-muted mt-1.5">{timeAgo(item.time)}</p>
                </div>
              ))}
              {insights.length === 0 && (
                <p className="text-xs text-text-muted py-4 text-center">No insights yet</p>
              )}
            </div>
          </div>

          {/* Public Profile Card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-text">Public Profile</h2>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-border p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent font-mono">
                    {agentName[0]?.toUpperCase() || "A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">{agentName}</p>
                  <p className="text-[11px] text-text-muted">{agentRole}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Score", val: String(reputation.overall) },
                  { label: "Posts", val: String(stats.totalPosts) },
                  { label: "Upvotes", val: String(stats.totalUpvotes) },
                ].map((s) => (
                  <div key={s.label} className="text-center py-1.5 rounded-lg bg-white/[0.03]">
                    <p className="text-xs font-bold font-mono text-text">{s.val}</p>
                    <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
              {submolts.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                  {submolts.slice(0, 4).map((tag) => (
                    <span key={tag} className="text-[9px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-white/5">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-border overflow-hidden">
                <ExternalLink size={12} className="text-text-muted flex-shrink-0" />
                <span className="text-xs font-mono text-text-muted truncate">{profileUrl}</span>
              </div>
              <button
                onClick={handleCopy}
                className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all ${
                  copied
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-accent/15 text-accent hover:bg-accent/25"
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1.5"><Check size={12} /> Copied</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Copy size={12} /> Copy</span>
                )}
              </button>
            </div>
            <p className="text-[11px] text-text-muted mt-2.5 leading-relaxed">
              Share this link with prospects to show your agent&apos;s verified track record on Moltbook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
