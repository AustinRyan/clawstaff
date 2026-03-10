"use client";

import { useState } from "react";
import {
  Building2,
  Wifi,
  Bell,
  Key,
  Check,
  Terminal,
} from "lucide-react";

const channels: Array<{ name: string; status: "connected" | "disconnected"; detail: string; color: string }> = [
  {
    name: "WhatsApp",
    status: "disconnected",
    detail: "Configure in openclaw.json",
    color: "#22c55e",
  },
  {
    name: "Google Reviews",
    status: "disconnected",
    detail: "Requires Agent Browser skill",
    color: "#3b82f6",
  },
  {
    name: "Slack",
    status: "disconnected",
    detail: "Configure in openclaw.json",
    color: "#a78bfa",
  },
  {
    name: "Telegram",
    status: "disconnected",
    detail: "Configure in openclaw.json",
    color: "#38bdf8",
  },
  {
    name: "SMS (Twilio)",
    status: "disconnected",
    detail: "Requires Twilio credentials",
    color: "#f87171",
  },
];

const envVars = [
  { key: "AGENT_DATA_PATH", desc: "Path to agent workspaces", required: true },
  { key: "OPENCLAW_GATEWAY_URL", desc: "WebSocket URL for OpenClaw Gateway", required: true },
  { key: "MOLTBOOK_API_KEY", desc: "Moltbook API token (moltbook_sk_...)", required: false },
  { key: "GOOGLE_PLACES_API_KEY", desc: "For Scout prospect discovery", required: false },
  { key: "TAVILY_API_KEY", desc: "For Scout web research", required: false },
];

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    dailySummary: true,
    weeklyReport: true,
    negativeReviews: true,
    leadAlerts: false,
  });

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-muted mt-1">
          Agent configuration, channels, notifications, and environment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Agent Configuration */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Agent Configuration
            </h2>
          </div>
          <div className="space-y-4">
            <p className="text-xs text-text-muted leading-relaxed">
              Agent identity and behavior are configured via SOUL.md files in each agent&apos;s workspace directory. Use the onboarding CLI to generate new agent workspaces.
            </p>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-border">
              <p className="text-xs font-mono text-text-muted mb-2">Create a new agent:</p>
              <code className="text-xs font-mono text-accent">npm run onboard</code>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-border">
              <p className="text-xs font-mono text-text-muted mb-2">Generate from config file:</p>
              <code className="text-xs font-mono text-accent">npm run generate -- config.json</code>
            </div>
          </div>
        </div>

        {/* Connected Channels */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Wifi size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Messaging Channels
            </h2>
          </div>
          <p className="text-xs text-text-muted mb-4 leading-relaxed">
            Channels are configured per-agent in <code className="text-accent">openclaw.json</code>. See the <a href="https://docs.openclaw.ai" className="text-accent hover:underline" target="_blank" rel="noopener">OpenClaw docs</a> for setup guides.
          </p>
          <div className="space-y-2">
            {channels.map((ch) => (
              <div
                key={ch.name}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        ch.status === "connected" ? "#22c55e" : "#6b6b7b",
                    }}
                  />
                  <div>
                    <p className="text-sm text-text">{ch.name}</p>
                    <p className="text-[11px] font-mono text-text-muted">
                      {ch.detail}
                    </p>
                  </div>
                </div>
                {ch.status === "connected" ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                    <Check size={10} />
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-text-muted bg-white/5 px-2 py-1 rounded-md">
                    Not configured
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Bell size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Notification Preferences
            </h2>
          </div>
          <div className="space-y-3">
            {[
              {
                key: "dailySummary" as const,
                label: "Daily Summary",
                desc: "Receive a nightly recap of the day's activity",
              },
              {
                key: "weeklyReport" as const,
                label: "Weekly Report",
                desc: "Performance report generated every Monday",
              },
              {
                key: "negativeReviews" as const,
                label: "Negative Review Alerts",
                desc: "Get notified when a 1-2 star review is posted",
              },
              {
                key: "leadAlerts" as const,
                label: "New Lead Alerts",
                desc: "Notification when a high-value inquiry comes in",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-border"
              >
                <div>
                  <p className="text-sm text-text">{item.label}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {item.desc}
                  </p>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
                    notifications[item.key]
                      ? "bg-accent"
                      : "bg-white/10"
                  }`}
                >
                  <div
                    className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                      notifications[item.key]
                        ? "translate-x-[22px]"
                        : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Environment */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Environment Variables
            </h2>
          </div>
          <p className="text-xs text-text-muted mb-4 leading-relaxed">
            Configured in <code className="text-accent">.env.local</code>. Run <code className="text-accent">npm run setup</code> to configure interactively.
          </p>
          <div className="space-y-2">
            {envVars.map((v) => (
              <div
                key={v.key}
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-border"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-mono text-text">{v.key}</p>
                    {v.required && (
                      <span className="text-[9px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                        required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {v.desc}
                  </p>
                </div>
                <Terminal size={12} className="text-text-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
