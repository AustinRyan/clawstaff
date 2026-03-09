"use client";

import {
  Wifi,
  WifiOff,
  MessageSquare,
  Clock,
  Calendar,
  Shield,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useAgentStats } from "@/lib/agent-data/hooks";
import { DemoBanner } from "@/components/demo-banner";
import type { Vertical } from "@/lib/agent-data/types";

const verticalSkills: Record<Vertical, { label: string; color: string }[]> = {
  restaurant: [
    { label: "Review Monitoring", color: "#3b82f6" },
    { label: "Reservation Management", color: "#f7c948" },
    { label: "Inquiry Handling", color: "#06b6d4" },
    { label: "Daily Summaries", color: "#ff6b35" },
    { label: "WhatsApp Messaging", color: "#22c55e" },
    { label: "Sentiment Analysis", color: "#84cc16" },
  ],
  realtor: [
    { label: "Lead Follow-Up", color: "#ff6b35" },
    { label: "Showing Scheduling", color: "#f7c948" },
    { label: "Market Awareness", color: "#3b82f6" },
    { label: "Pipeline Management", color: "#22c55e" },
    { label: "Client Briefings", color: "#a78bfa" },
  ],
  fitness: [
    { label: "Class Booking", color: "#f7c948" },
    { label: "Member Re-engagement", color: "#22c55e" },
    { label: "Inquiry Handling", color: "#06b6d4" },
    { label: "Reminder System", color: "#ff6b35" },
    { label: "Trial Scheduling", color: "#a78bfa" },
  ],
  medical: [
    { label: "Appointment Scheduling", color: "#ff6b35" },
    { label: "No-Show Recovery", color: "#f7c948" },
    { label: "Patient Rebooking", color: "#22c55e" },
    { label: "Insurance Routing", color: "#3b82f6" },
    { label: "Emergency Flagging", color: "#ef4444" },
  ],
  "home-services": [
    { label: "Lead Response", color: "#ff6b35" },
    { label: "Estimate Follow-ups", color: "#f7c948" },
    { label: "Emergency Dispatch", color: "#ef4444" },
    { label: "Seasonal Campaigns", color: "#22c55e" },
    { label: "Review Handling", color: "#3b82f6" },
  ],
  ecommerce: [
    { label: "Tier 1 Support", color: "#ff6b35" },
    { label: "Cart Recovery", color: "#f7c948" },
    { label: "Review Collection", color: "#22c55e" },
    { label: "Return Processing", color: "#3b82f6" },
    { label: "Escalation Routing", color: "#ef4444" },
  ],
};

const styleTraits: Record<string, { label: string; desc: string }[]> = {
  warm: [
    { label: "Warm", desc: "Empathetic and personable — customers feel heard, not handled" },
    { label: "Professional", desc: "Maintains a polished, brand-appropriate tone" },
    { label: "Proactive", desc: "Anticipates needs and follows up without prompting" },
  ],
  professional: [
    { label: "Professional", desc: "Polished, precise, and trustworthy in every interaction" },
    { label: "Detail-Oriented", desc: "Catches nuance and tailors every response" },
    { label: "Proactive", desc: "Anticipates needs and follows up without prompting" },
  ],
  casual: [
    { label: "Friendly", desc: "Casual and approachable — feels like talking to a friend" },
    { label: "Encouraging", desc: "Motivating without pressure, always positive" },
    { label: "Responsive", desc: "Fast and helpful — never leaves people waiting" },
  ],
  direct: [
    { label: "Direct", desc: "Clear and to the point — no fluff, just answers" },
    { label: "Reliable", desc: "Follows through on every commitment" },
    { label: "Knowledgeable", desc: "Deep understanding of the trade and customer needs" },
  ],
};

function formatResponseTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${(seconds / 60).toFixed(1)}m`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AgentPage() {
  const { data, loading } = useAgentStats();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { identity, totalMessages, avgResponseTimeSec, weekMessages, isDemo } = data;
  const isOnline = identity.status === "online";
  const skills = verticalSkills[identity.vertical] ?? verticalSkills.restaurant;
  const styleKey = identity.communicationStyle.toLowerCase().split(/[\s,]+/)[0] || "professional";
  const traits = styleTraits[styleKey] ?? styleTraits.professional;

  const stats = [
    { label: "Messages Handled", value: totalMessages.toLocaleString(), icon: MessageSquare },
    { label: "This Week", value: weekMessages.toLocaleString(), icon: MessageSquare },
    { label: "Avg Response Time", value: formatResponseTime(avgResponseTimeSec), icon: Clock },
    { label: "Status", value: isOnline ? "Online" : "Offline", icon: isOnline ? Wifi : WifiOff },
  ];

  return (
    <div className="space-y-6">
      {isDemo && <DemoBanner />}

      <div>
        <h1 className="text-2xl font-bold text-text">Agent Profile</h1>
        <p className="text-sm text-text-muted mt-1">Your dedicated AI team member.</p>
      </div>

      {/* Profile Hero */}
      <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] via-transparent to-secondary/[0.04]" />
        <div className="relative flex gap-8">
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shadow-lg shadow-accent/10">
                <span className="text-4xl font-bold text-white font-mono">
                  {identity.agentName[0]?.toUpperCase() || "A"}
                </span>
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-card ${isOnline ? "bg-emerald-500" : "bg-red-500"}`}>
                {isOnline && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />}
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-text">{identity.agentName}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider ${isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                {identity.status}
              </span>
            </div>
            <p className="text-sm text-accent font-medium">{identity.role}</p>
            <p className="text-sm text-text-muted mt-3 leading-relaxed max-w-xl">
              {identity.agentName} serves {identity.businessName || "your business"} as a{" "}
              <span className="capitalize">{identity.vertical.replace("-", " ")}</span> agent.
              Communication style: <span className="capitalize">{identity.communicationStyle}</span>.
              {identity.ownerName && <> Reports to {identity.ownerName}.</>}
            </p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5 text-text-muted">
                <Calendar size={13} />
                <span className="text-xs font-mono">Active since {formatDate(identity.activeSince)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-muted">
                <Shield size={13} />
                <span className="text-xs font-mono capitalize">{identity.vertical.replace("-", " ")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
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

      {/* Skills + Personality */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">Skills</h2>
            <span className="text-xs text-text-muted capitalize">({identity.vertical.replace("-", " ")})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span
                key={skill.label}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  color: skill.color,
                  backgroundColor: `${skill.color}10`,
                  borderColor: `${skill.color}20`,
                }}
              >
                {skill.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-text mb-4">Personality</h2>
          <div className="space-y-3">
            {traits.map((trait) => (
              <div key={trait.label} className="p-3 rounded-xl bg-white/[0.02]">
                <p className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
                  {trait.label}
                </p>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">{trait.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
