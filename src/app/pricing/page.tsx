"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, Loader2, Zap, Crown, Building } from "lucide-react";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: 299,
    icon: Zap,
    description: "Perfect for a single-location business getting started with AI staffing.",
    features: [
      "1 dedicated AI agent",
      "1 channel (WhatsApp or Slack)",
      "Basic skill stack",
      "Daily summaries",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 499,
    icon: Crown,
    description:
      "For businesses that need multi-channel coverage and a fully customized agent.",
    features: [
      "1 dedicated AI agent",
      "3 connected channels",
      "Full skill stack",
      "Custom SOUL.md tuning",
      "Priority support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: 799,
    icon: Building,
    description:
      "Multi-agent deployments with custom development and dedicated account management.",
    features: [
      "Multiple AI agents",
      "All channels",
      "Custom skill development",
      "Dedicated account management",
      "SLA guarantee",
      "Custom integrations",
    ],
    cta: "Get Started",
    highlighted: false,
  },
] as const;

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-accent">Claw</span>
              <span className="text-text">Staff</span>
            </h1>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-4xl font-bold text-text">
            Your AI employee, starting at{" "}
            <span className="text-accent">$299/mo</span>
          </h2>
          <p className="text-text-muted mt-4 max-w-xl mx-auto leading-relaxed">
            Every plan includes a dedicated AI agent that works 24/7 — handling
            reviews, leads, scheduling, and customer follow-up so you don&apos;t
            have to.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-accent/[0.08] to-card border-2 border-accent/30"
                    : "bg-card border border-border"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      plan.highlighted
                        ? "bg-accent/20 text-accent"
                        : "bg-white/5 text-text-muted"
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <h3 className="text-lg font-bold text-text">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-bold font-mono text-text">
                    ${plan.price}
                  </span>
                  <span className="text-text-muted text-sm">/month</span>
                </div>

                <p className="text-sm text-text-muted leading-relaxed mb-6">
                  {plan.description}
                </p>

                <div className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${
                          plan.highlighted
                            ? "text-accent"
                            : "text-emerald-400"
                        }`}
                      />
                      <span className="text-sm text-text-muted">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleCheckout(plan.key)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl text-sm font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                    plan.highlighted
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "bg-white/5 text-text hover:bg-white/10 border border-border"
                  }`}
                >
                  {loading === plan.key ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Setup fee note */}
        <div className="text-center mt-12">
          <p className="text-xs text-text-muted font-mono">
            One-time setup fee of $250 &ndash; $500 for onboarding and SOUL.md
            configuration.
          </p>
          <p className="text-xs text-text-muted font-mono mt-1">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
