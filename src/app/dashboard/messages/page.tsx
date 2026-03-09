"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useAgentMessages, useAgentStats } from "@/lib/agent-data/hooks";
import { DemoBanner } from "@/components/demo-banner";

const channelConfig: Record<string, { color: string; bg: string; borderColor: string }> = {
  Google: { color: "text-blue-400", bg: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  Yelp: { color: "text-red-400", bg: "bg-red-500/10", borderColor: "border-red-500/20" },
  WhatsApp: { color: "text-emerald-400", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  Email: { color: "text-violet-400", bg: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  SMS: { color: "text-yellow-400", bg: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
  Slack: { color: "text-purple-400", bg: "bg-purple-500/10", borderColor: "border-purple-500/20" },
};

const defaultCfg = { color: "text-text-muted", bg: "bg-white/5", borderColor: "border-border" };

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: msgData, loading: msgLoading } = useAgentMessages({
    page: 1,
    pageSize: 50,
    search: searchQuery || undefined,
  });

  const { data: statsData } = useAgentStats();
  const isDemo = statsData?.isDemo ?? false;
  const agentName = statsData?.identity?.agentName ?? "Agent";

  const conversations = useMemo(() => msgData?.conversations ?? [], [msgData]);

  // Derive available channels from data
  const channels = useMemo(() => {
    const set = new Set(conversations.map((c) => c.channel));
    return ["All", ...Array.from(set).sort()];
  }, [conversations]);

  const filtered = useMemo(() => {
    if (activeChannel === "All") return conversations;
    return conversations.filter((c) => c.channel === activeChannel);
  }, [conversations, activeChannel]);

  const stats = useMemo(() => {
    const total = conversations.length;
    const inbound = conversations.filter((c) =>
      c.messages.some((m) => m.role === "user")
    ).length;
    const outbound = conversations.filter((c) =>
      c.messages.some((m) => m.role === "assistant")
    ).length;
    return { total, inbound, outbound };
  }, [conversations]);

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Messages</h1>
          <p className="text-sm text-text-muted mt-1">
            All agent conversations across every channel.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Inbound", value: stats.inbound },
            { label: "Outbound", value: stats.outbound },
          ].map((s) => (
            <div key={s.label} className="text-right">
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                {s.label}
              </p>
              <p className="text-lg font-bold font-mono text-text">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {channels.map((ch) => {
              const isActive = activeChannel === ch;
              const cfg = ch !== "All" ? (channelConfig[ch] ?? defaultCfg) : null;
              return (
                <button
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                    isActive
                      ? ch === "All"
                        ? "bg-accent/15 text-accent"
                        : `${cfg!.bg} ${cfg!.color}`
                      : "text-text-muted hover:text-text hover:bg-white/5"
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="ml-auto relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="bg-transparent border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent/40 transition-colors w-64"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {msgLoading && conversations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-accent animate-spin" />
        </div>
      )}

      {/* Message List */}
      <div className="space-y-2">
        {!msgLoading && filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <MessageSquare size={32} className="text-text-muted/40 mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              No messages match your filters.
            </p>
          </div>
        )}

        {filtered.map((conv) => {
          const isExpanded = expandedId === conv.id;
          const cfg = channelConfig[conv.channel] ?? defaultCfg;
          const firstMsg = conv.messages[0];
          const isInbound = firstMsg?.role === "user";

          return (
            <div
              key={conv.id}
              className={`bg-card border rounded-2xl transition-all ${
                isExpanded ? "border-accent/20" : "border-border hover:border-border"
              }`}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                className="w-full text-left p-4 flex items-center gap-4"
              >
                <div
                  className={`flex-shrink-0 w-[72px] text-center px-2 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.color} ${cfg.borderColor}`}
                >
                  {conv.channel}
                </div>

                <div className="flex-shrink-0">
                  {isInbound ? (
                    <ArrowDownLeft size={14} className="text-text-muted" />
                  ) : (
                    <ArrowUpRight size={14} className="text-accent/70" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">
                      {conv.contact}
                    </span>
                    <span className="text-xs text-text-muted">
                      {conv.messages.length} msg{conv.messages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[13px] text-text-muted mt-0.5 line-clamp-1">
                    {conv.preview}
                  </p>
                </div>

                <div className="flex-shrink-0 text-right flex items-center gap-3">
                  <div>
                    <p className="text-[11px] font-mono text-text-muted">
                      {formatDate(conv.date)}
                    </p>
                    <p className="text-[11px] font-mono text-text-muted/60">
                      {formatTime(conv.date)}
                    </p>
                  </div>
                  <div className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-text-muted" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  <div className="pt-4 space-y-3">
                    {conv.messages.map((msg, i) => {
                      const isOutbound = msg.role === "assistant";
                      return (
                        <div
                          key={i}
                          className={`flex gap-3 ${isOutbound ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                              isOutbound ? "bg-accent/15" : "bg-white/5"
                            }`}
                          >
                            {isOutbound ? (
                              <ArrowUpRight size={12} className="text-accent" />
                            ) : (
                              <ArrowDownLeft size={12} className="text-text-muted" />
                            )}
                          </div>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                              isOutbound
                                ? "bg-accent/[0.07] rounded-tr-md"
                                : "bg-white/[0.03] rounded-tl-md"
                            }`}
                          >
                            <p className="text-[13px] text-text leading-relaxed whitespace-pre-line">
                              {msg.content}
                            </p>
                            <p
                              className={`text-[10px] font-mono mt-2 ${
                                isOutbound ? "text-accent/50" : "text-text-muted/60"
                              }`}
                            >
                              {isOutbound ? agentName : conv.contact} — {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
