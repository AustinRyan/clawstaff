"use client";

import {
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  Trophy,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAgentStats } from "@/lib/agent-data/hooks";
import { DemoBanner } from "@/components/demo-banner";

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#6b6b7b] text-xs font-mono mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[#e8e6e3] text-sm font-mono font-bold">
          {p.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

function BarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { channel: string } }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[#6b6b7b] text-xs font-mono">
        {payload[0].payload.channel}
      </p>
      <p className="text-[#e8e6e3] text-sm font-mono font-bold">
        {payload[0].value} messages
      </p>
    </div>
  );
}

const axisStyle = {
  fill: "#6b6b7b",
  fontSize: 10,
  fontFamily: "var(--font-space-mono)",
};

export default function PerformancePage() {
  const { data, loading } = useAgentStats();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { identity, dailyStats, taskBreakdown, avgResponseTimeSec, isDemo } = data;

  // Chart data — last 30 days
  const dailyMessages = dailyStats.slice(-30).map((d) => {
    const dt = new Date(d.date);
    return {
      day: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      messages: d.messages,
    };
  });

  // Response time trend
  const responseTime = dailyStats.slice(-30).map((d) => {
    const dt = new Date(d.date);
    return {
      day: dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg: Number((d.avgResponseTimeSec / 60).toFixed(1)),
    };
  });

  // Messages by channel — derive from task breakdown for demo, or just show tasks
  // For real data, we don't have per-channel breakdowns yet, so use task breakdown as the bar chart
  const channelData = taskBreakdown.map((t) => ({
    channel: t.label,
    messages: t.value,
    fill: t.color,
  }));

  const taskTotal = taskBreakdown.reduce((sum, t) => sum + t.value, 0);

  // Growth calculation
  const firstHalf = dailyMessages.slice(0, 15).reduce((s, d) => s + d.messages, 0);
  const secondHalf = dailyMessages.slice(15).reduce((s, d) => s + d.messages, 0);
  const growth = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

  // Response time trend
  const rtFirst = responseTime[0]?.avg ?? 0;
  const rtLast = responseTime[responseTime.length - 1]?.avg ?? 0;

  // Monthly summary
  const totalMsgs = dailyMessages.reduce((s, d) => s + d.messages, 0);
  const busiestDay = (() => {
    const dayTotals: Record<string, number> = {};
    dailyStats.slice(-30).forEach((d) => {
      const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: "long" });
      dayTotals[dayName] = (dayTotals[dayName] || 0) + d.messages;
    });
    const sorted = Object.entries(dayTotals).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? "—";
  })();

  const topTask = taskBreakdown.reduce((best, t) => (t.value > best.value ? t : best), taskBreakdown[0]);

  // Date range
  const rangeStart = dailyStats[Math.max(0, dailyStats.length - 30)]?.date ?? "";
  const rangeEnd = dailyStats[dailyStats.length - 1]?.date ?? "";
  const formatRange = (d: string) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Performance</h1>
          <p className="text-sm text-text-muted mt-1">
            30-day analytics for {identity.agentName} — all channels combined.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg">
          <Calendar size={14} className="text-text-muted" />
          <span className="text-xs font-mono text-text-muted">
            {formatRange(rangeStart)} — {formatRange(rangeEnd)}
          </span>
        </div>
      </div>

      {/* Top row: Line chart + Bar chart */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-text">Messages Per Day</h2>
              <p className="text-xs text-text-muted mt-0.5">Last 30 days</p>
            </div>
            <div className="flex items-center gap-2">
              {growth >= 0 ? (
                <TrendingUp size={14} className="text-emerald-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
              <span className={`text-xs font-mono ${growth >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {growth >= 0 ? "+" : ""}{growth}% growth
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyMessages} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisStyle} dy={8} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                <Tooltip content={<ChartTooltip suffix=" msgs" />} cursor={{ stroke: "#ff6b35", strokeOpacity: 0.15 }} />
                <Line type="monotone" dataKey="messages" stroke="#ff6b35" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#ff6b35", stroke: "#12121e", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-text">Task Breakdown</h2>
            <p className="text-xs text-text-muted mt-0.5 capitalize">{identity.vertical.replace("-", " ")}</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis dataKey="channel" axisLine={false} tickLine={false} tick={{ ...axisStyle, fontSize: 8 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                <Tooltip content={<BarTooltip />} cursor={false} />
                <Bar dataKey="messages" radius={[6, 6, 0, 0]}>
                  {channelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row: Area chart + Donut chart */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-text">Avg Response Time</h2>
              <p className="text-xs text-text-muted mt-0.5">Minutes — last 30 days</p>
            </div>
            <div className="flex items-center gap-2">
              {rtLast <= rtFirst ? (
                <TrendingDown size={14} className="text-emerald-400" />
              ) : (
                <TrendingUp size={14} className="text-red-400" />
              )}
              <span className={`text-xs font-mono ${rtLast <= rtFirst ? "text-emerald-400" : "text-red-400"}`}>
                {rtFirst.toFixed(1)}m → {rtLast.toFixed(1)}m
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={responseTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f7c948" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f7c948" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={axisStyle} dy={8} interval={4} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} domain={[0, "auto"]} />
                <Tooltip content={<ChartTooltip suffix=" min" />} cursor={{ stroke: "#f7c948", strokeOpacity: 0.15 }} />
                <Area type="monotone" dataKey="avg" stroke="#f7c948" strokeWidth={2} fill="url(#rtGradient)" dot={false} activeDot={{ r: 4, fill: "#f7c948", stroke: "#12121e", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text">Task Distribution</h2>
            <p className="text-xs text-text-muted mt-0.5">All time</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {taskBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg px-3 py-2 shadow-xl">
                        <p className="text-[#6b6b7b] text-xs font-mono">{d.label}</p>
                        <p className="text-[#e8e6e3] text-sm font-mono font-bold">
                          {d.value}{" "}
                          <span className="text-[#6b6b7b] font-normal">
                            ({taskTotal > 0 ? Math.round((d.value / taskTotal) * 100) : 0}%)
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {taskBreakdown.map((task) => (
              <div key={task.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: task.color }} />
                  <span className="text-xs text-text-muted">{task.label}</span>
                </div>
                <span className="text-xs font-mono text-text">{task.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-text mb-4">Monthly Summary</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/[0.02] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <MessageSquare size={15} className="text-accent" />
              </div>
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Total Messages
              </p>
            </div>
            <p className="text-2xl font-bold font-mono text-text">{totalMsgs}</p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Zap size={15} className="text-secondary" />
              </div>
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Avg Response
              </p>
            </div>
            <p className="text-2xl font-bold font-mono text-text">
              {(avgResponseTimeSec / 60).toFixed(1)}m
            </p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar size={15} className="text-emerald-400" />
              </div>
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Busiest Day
              </p>
            </div>
            <p className="text-2xl font-bold font-mono text-text">{busiestDay}</p>
          </div>

          <div className="bg-white/[0.02] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Trophy size={15} className="text-blue-400" />
              </div>
              <p className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Top Category
              </p>
            </div>
            <p className="text-2xl font-bold font-mono text-text">{topTask?.label?.split(" ")[0] ?? "—"}</p>
            <p className="text-xs font-mono text-text-muted mt-1">
              {topTask?.value ?? 0} — {taskTotal > 0 ? Math.round(((topTask?.value ?? 0) / taskTotal) * 100) : 0}% of all tasks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
