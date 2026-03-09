"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Wifi,
  Bell,
  CreditCard,
  Check,
  ExternalLink,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

const channels = [
  {
    name: "WhatsApp",
    status: "connected" as const,
    detail: "+1 (555) 012-3456",
    color: "#22c55e",
  },
  {
    name: "Google Reviews",
    status: "connected" as const,
    detail: "Bella Cucina — 4.6 stars",
    color: "#3b82f6",
  },
  {
    name: "Yelp",
    status: "connected" as const,
    detail: "Bella Cucina DC",
    color: "#ef4444",
  },
  {
    name: "Email",
    status: "connected" as const,
    detail: "hello@bellacucinadc.com",
    color: "#a78bfa",
  },
  {
    name: "Slack",
    status: "disconnected" as const,
    detail: "Not configured",
    color: "#6b6b7b",
  },
];

// Mock subscription data — will come from API/database once connected
const mockSubscription = {
  plan: "Pro" as const,
  price: 499,
  status: "active" as const,
  currentPeriodEnd: "2026-04-03T00:00:00Z",
  customerId: "cus_mock_123",
  features: [
    "1 dedicated AI agent",
    "3 connected channels",
    "Full skill stack",
    "Custom SOUL.md tuning",
    "Priority support",
  ],
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    dailySummary: true,
    weeklyReport: true,
    negativeReviews: true,
    leadAlerts: false,
  });
  const [portalLoading, setPortalLoading] = useState(false);

  const toggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: mockSubscription.customerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Portal unavailable
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-sm text-text-muted mt-1">
          Business info, channels, notifications, and billing.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Business Information */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Business Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                defaultValue="Bella Cucina"
                className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                Business Type
              </label>
              <input
                type="text"
                defaultValue="Restaurant — Italian Fine Dining"
                className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                Address
              </label>
              <input
                type="text"
                defaultValue="1247 Wisconsin Ave NW, Washington, DC 20007"
                className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Owner Name
                </label>
                <input
                  type="text"
                  defaultValue="Marco Bellini"
                  className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  defaultValue="(202) 555-0189"
                  className="w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>
            </div>
            <button className="px-4 py-2 rounded-lg bg-accent/15 text-accent text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent/25 transition-colors">
              Save Changes
            </button>
          </div>
        </div>

        {/* Connected Channels */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Wifi size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Connected Channels
            </h2>
          </div>
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
                  <button className="flex items-center gap-1 text-[10px] font-mono text-text-muted bg-white/5 px-2 py-1 rounded-md hover:text-text hover:bg-white/10 transition-colors">
                    Connect
                  </button>
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
                label: "WhatsApp Daily Summary",
                desc: "Receive a nightly recap of the day's activity via WhatsApp",
              },
              {
                key: "weeklyReport" as const,
                label: "Email Weekly Report",
                desc: "Performance report delivered every Monday morning",
              },
              {
                key: "negativeReviews" as const,
                label: "Instant Negative Review Alerts",
                desc: "Get notified immediately when a 1-2 star review is posted",
              },
              {
                key: "leadAlerts" as const,
                label: "New Lead Alerts",
                desc: "Instant notification when a high-value inquiry comes in",
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

        {/* Billing */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text">
              Billing & Plan
            </h2>
          </div>

          {/* Current plan */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-accent/[0.06] to-secondary/[0.04] border border-accent/20 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-text-muted uppercase tracking-wider">
                  Current Plan
                </p>
                <p className="text-xl font-bold text-text mt-1">
                  {mockSubscription.plan}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-accent">
                  ${mockSubscription.price}
                </p>
                <p className="text-[11px] font-mono text-text-muted">/month</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-accent/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Status</span>
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  {mockSubscription.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-text-muted">Next billing date</span>
                <span className="font-mono text-text">
                  {formatDate(mockSubscription.currentPeriodEnd)}
                </span>
              </div>
            </div>
          </div>

          {/* Plan features */}
          <div className="space-y-2 mb-4">
            {mockSubscription.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check size={12} className="text-emerald-400" />
                <span className="text-xs text-text-muted">{feature}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent/15 text-accent text-xs font-mono font-bold uppercase tracking-wider hover:bg-accent/25 transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ExternalLink size={13} />
              )}
              Manage Billing
            </button>
            <Link
              href="/pricing"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 text-text text-xs font-mono font-bold uppercase tracking-wider hover:bg-white/10 transition-colors border border-border"
            >
              <ArrowUpRight size={13} />
              Upgrade Plan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
