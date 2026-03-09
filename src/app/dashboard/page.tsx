"use client";

import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
  Reply,
  Send,
  CalendarCheck,
  Bell,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAgentStats } from "@/lib/agent-data/hooks";
import { DemoBanner } from "@/components/demo-banner";
import type { ActivityItem } from "@/lib/agent-data/types";

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = (seconds / 60).toFixed(1);
  return `${mins}m`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const activityIcons: Record<ActivityItem["type"], typeof Reply> = {
  message: Send,
  escalation: ShieldCheck,
  task: CalendarCheck,
  memory: Bell,
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#6b6b7b] text-xs font-mono">{label}</p>
      <p className="text-[#e8e6e3] text-sm font-mono font-bold">
        {payload[0].value} messages
      </p>
    </div>
  );
}

export default function OverviewPage() {
  const { data, loading, error } = useAgentStats(60000); // 60s polling

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle size={24} className="text-accent mx-auto mb-2" />
          <p className="text-sm text-text-muted">Failed to load agent data</p>
          <p className="text-xs text-text-muted mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { identity, todayMessages, totalMessages, avgResponseTimeSec, taskBreakdown, dailyStats, recentActivity, isDemo } = data;

  // Chart data — last 14 days
  const chartData = dailyStats.slice(-14).map((d) => {
    const dt = new Date(d.date);
    return {
      day: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      messages: d.messages,
    };
  });

  const chartTotal = chartData.reduce((sum, d) => sum + d.messages, 0);

  const tasksThisWeek = taskBreakdown.reduce((sum, t) => sum + t.value, 0);

  const metrics = [
    {
      label: "Messages Today",
      value: String(todayMessages),
      icon: MessageSquare,
    },
    {
      label: "Avg Response Time",
      value: formatResponseTime(avgResponseTimeSec),
      icon: Clock,
    },
    {
      label: "Tasks Total",
      value: String(tasksThisWeek),
      icon: CheckCircle2,
    },
    {
      label: "Total Messages",
      value: String(totalMessages),
      icon: MessageSquare,
    },
  ];

  const isOnline = identity.status === "online";

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      {/* Agent Status Hero */}
      <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-secondary/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
                <span className="text-2xl font-bold text-accent font-mono">
                  {identity.agentName[0]?.toUpperCase() || "A"}
                </span>
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card ${isOnline ? "bg-emerald-500" : "bg-red-500"}`}>
                {isOnline && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />}
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">{identity.agentName}</h1>
              <p className="text-sm text-text-muted">{identity.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Status
              </p>
              <div className="flex items-center gap-2 mt-1">
                {isOnline ? (
                  <Wifi size={14} className="text-emerald-400" />
                ) : (
                  <WifiOff size={14} className="text-red-400" />
                )}
                <span className={`text-sm font-mono ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
                  {identity.status === "online" ? "Online" : identity.status === "error" ? "Error" : "Offline"}
                </span>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-right">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Vertical
              </p>
              <p className="text-sm font-mono text-text mt-1 capitalize">
                {identity.vertical.replace("-", " ")}
              </p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-right">
              <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Since
              </p>
              <p className="text-sm font-mono text-text mt-1">
                {formatDate(identity.activeSince)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="group bg-card border border-border rounded-2xl p-5 transition-colors hover:border-accent/20"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                {label}
              </p>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center transition-colors group-hover:bg-accent/20">
                <Icon size={15} className="text-accent" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-text mt-3">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Activity Feed */}
      <div className="grid grid-cols-3 gap-4">
        {/* Messages Chart */}
        <div className="col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-text">
                Messages Handled
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-text">
                {chartTotal}
              </span>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b35" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff6b35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#6b6b7b", fontSize: 11, fontFamily: "var(--font-space-mono)" }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b6b7b", fontSize: 11, fontFamily: "var(--font-space-mono)" }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#ff6b35", strokeOpacity: 0.2 }} />
                <Area type="monotone" dataKey="messages" stroke="#ff6b35" strokeWidth={2} fill="url(#msgGradient)" dot={false} activeDot={{ r: 4, fill: "#ff6b35", stroke: "#12121e", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col">
          <h2 className="text-sm font-semibold text-text mb-4">
            Recent Activity
          </h2>
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {recentActivity.length === 0 && (
              <p className="text-xs text-text-muted py-4 text-center">No recent activity</p>
            )}
            {recentActivity.map((item, i) => {
              const Icon = activityIcons[item.type] || Send;
              const isAccent = item.type === "escalation";
              return (
                <div
                  key={i}
                  className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className={`mt-0.5 w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      isAccent ? "bg-accent/15 text-accent" : "bg-white/5 text-text-muted"
                    }`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] text-text leading-snug">
                      {item.text}
                    </p>
                    <p className="text-[11px] font-mono text-text-muted mt-0.5">
                      {timeAgo(item.time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
