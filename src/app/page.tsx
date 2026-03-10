"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Globe,
  Check,
  Send,
  Search,
  Copy,
  CheckCheck,
  GitBranch,
  Terminal,
  Layers,
  Award,
} from "lucide-react";

/* ─────────────────────────────────────────────
   Scroll-reveal hook
   ───────────────────────────────────────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Chat bubble components
   ───────────────────────────────────────────── */

function ChatBubbleIncoming({
  name,
  message,
  time,
}: {
  name?: string;
  message: string;
  time: string;
}) {
  return (
    <div className="flex gap-2 items-end">
      <div className="relative chat-bubble-incoming bg-[#1a2e1a] rounded-xl rounded-tl-none px-3 py-2 max-w-[260px]">
        {name && (
          <p className="text-[10px] font-mono text-emerald-400 mb-0.5">
            {name}
          </p>
        )}
        <p className="text-[13px] text-[#d1d7d1] leading-relaxed">{message}</p>
        <p className="text-[9px] text-[#6b7b6b] text-right mt-1">{time}</p>
      </div>
    </div>
  );
}

function ChatBubbleOutgoing({
  message,
  time,
}: {
  message: string;
  time: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="relative chat-bubble-outgoing bg-[#0b4f39] rounded-xl rounded-tr-none px-3 py-2 max-w-[260px]">
        <p className="text-[13px] text-[#d1e8d1] leading-relaxed">{message}</p>
        <p className="text-[9px] text-[#6b8b6b] text-right mt-1">{time}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Moltbook score ring
   ───────────────────────────────────────────── */

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#1a1a2e"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b35" />
            <stop offset="100%" stopColor="#f7c948" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-mono font-bold text-text">{score}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Copy button for code blocks
   ───────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-text-muted hover:text-text"
      aria-label="Copy to clipboard"
    >
      {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
    </button>
  );
}

/* ─────────────────────────────────────────────
   Data
   ───────────────────────────────────────────── */

const agents = [
  {
    name: "Maya",
    vertical: "Restaurant",
    role: "Reviews, reservations, customer inquiries",
    score: 94,
    color: "#ef4444",
    chat: [
      {
        type: "out" as const,
        msg: "Hey Maya, we just got a 2-star review on Google about slow service last night",
        time: "9:02 AM",
      },
      {
        type: "in" as const,
        msg: "I saw it come in at 11:47pm and already responded. Apologized for the wait, mentioned the private event that impacted timing, and invited them back for a complimentary appetizer. Want me to send you the full response?",
        time: "9:02 AM",
      },
    ],
  },
  {
    name: "Cole",
    vertical: "Real Estate",
    role: "Lead follow-up, showings, pipeline management",
    score: 91,
    color: "#3b82f6",
    chat: [
      {
        type: "out" as const,
        msg: "How many leads came in overnight?",
        time: "7:15 AM",
      },
      {
        type: "in" as const,
        msg: "3 new Zillow leads since midnight. Already responded to all within 4 minutes. Sarah K. wants to see the Oak St listing tomorrow at 2pm \u2014 I\u2019ve booked it on your calendar.",
        time: "7:15 AM",
      },
    ],
  },
  {
    name: "Alex",
    vertical: "Fitness Studio",
    role: "Membership inquiries, class reminders, re-engagement",
    score: 88,
    color: "#22c55e",
    chat: [
      {
        type: "out" as const,
        msg: "How many inactive members did you reach out to this week?",
        time: "8:30 AM",
      },
      {
        type: "in" as const,
        msg: "Sent re-engagement messages to 23 members who haven\u2019t booked in 14+ days. 9 have already rebooked classes. Lisa M. asked about freezing her membership \u2014 flagged that for you.",
        time: "8:31 AM",
      },
    ],
  },
  {
    name: "Sophia",
    vertical: "Medical / Dental",
    role: "Appointment confirmations, no-show recovery, rebooking",
    score: 96,
    color: "#a78bfa",
    chat: [
      {
        type: "out" as const,
        msg: "What\u2019s the no-show situation this week?",
        time: "5:00 PM",
      },
      {
        type: "in" as const,
        msg: "4 no-shows this week, down from 11 last week. I followed up with all 4 within 30 minutes and 3 have rescheduled. That\u2019s a 72% recovery rate. Sending your weekly report now.",
        time: "5:01 PM",
      },
    ],
  },
  {
    name: "Jake",
    vertical: "Home Services",
    role: "Lead response, estimates, seasonal reminders, reviews",
    score: 89,
    color: "#f59e0b",
    chat: [
      {
        type: "out" as const,
        msg: "Any new leads today?",
        time: "12:15 PM",
      },
      {
        type: "in" as const,
        msg: "2 new estimate requests this morning. Both responded to within 8 minutes. Also followed up on 5 pending estimates from last week \u2014 Mrs. Chen confirmed the gutter job for Thursday.",
        time: "12:15 PM",
      },
    ],
  },
  {
    name: "Zoe",
    vertical: "E-Commerce",
    role: "Support triage, cart recovery, review collection",
    score: 92,
    color: "#ec4899",
    chat: [
      {
        type: "out" as const,
        msg: "How\u2019s cart recovery looking?",
        time: "10:00 AM",
      },
      {
        type: "in" as const,
        msg: "Recovered 7 abandoned carts this week totaling $1,240 in revenue. Also collected 12 post-purchase reviews \u2014 average rating 4.8 stars. Support tickets are down 34% since I started handling tier-1.",
        time: "10:01 AM",
      },
    ],
  },
];

const features = [
  {
    icon: Layers,
    title: "6 Industry Verticals",
    desc: "Restaurant, Real Estate, Fitness, Medical, Home Services, E-Commerce. Pre-built SOUL.md templates with industry-specific skills and behavioral rules.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    desc: "Monitor agents, view conversations, track performance metrics. Live polling, vertical-aware task labels, and session history.",
  },
  {
    icon: Award,
    title: "Moltbook Reputation",
    desc: "Agents build public, verifiable work profiles on the AI social network. 1.6M+ agents. Reputation scores that prove results.",
  },
  {
    icon: Terminal,
    title: "Template Engine",
    desc: "80% vertical template + 20% client customization. Interactive onboarding CLI generates complete agent workspaces in minutes.",
  },
  {
    icon: Search,
    title: "Scout Prospecting",
    desc: "Built-in prospecting agent finds businesses that need an AI agent. Discovery, qualification, personalized outreach, automated follow-up.",
  },
  {
    icon: Globe,
    title: "20+ Channels",
    desc: "WhatsApp, Slack, Telegram, SMS, Discord, iMessage, and more. All through a single OpenClaw Gateway process.",
  },
];

const architectureDiagram = `┌──────────────────────────────────────────────────┐
│                   YOUR VPS (Ubuntu)               │
│                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ Agent: Maya  │  │ Agent: Cole  │  │ Agent: N  │ │
│  │ (Restaurant) │  │ (Realtor)    │  │ (Fitness) │ │
│  │              │  │              │  │           │ │
│  │ SOUL.md      │  │ SOUL.md      │  │ SOUL.md   │ │
│  │ USER.md      │  │ USER.md      │  │ USER.md   │ │
│  │ HEARTBEAT.md │  │ HEARTBEAT.md │  │ HEARTBEAT │ │
│  │ Skills/      │  │ Skills/      │  │ Skills/   │ │
│  │ Memory/      │  │ Memory/      │  │ Memory/   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                  │                │       │
│  ┌──────┴──────────────────┴────────────────┴─────┐ │
│  │              OpenClaw Gateway                   │ │
│  │         (Single process, multi-route)           │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                │
└─────────────────────┼────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   WhatsApp       Slack        Telegram
   (Client A)    (Client B)   (Client C)`;

/* ─────────────────────────────────────────────
   Page
   ───────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Nav ──────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-accent">Claw</span>
              <span className="text-text">Staff</span>
            </h1>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-text-muted hover:text-text transition-colors hidden sm:block"
            >
              Features
            </a>
            <a
              href="#agents"
              className="text-sm text-text-muted hover:text-text transition-colors hidden sm:block"
            >
              Agents
            </a>
            <a
              href="#quickstart"
              className="text-sm text-text-muted hover:text-text transition-colors hidden sm:block"
            >
              Quick Start
            </a>
            <Link
              href="/dashboard"
              className="text-sm text-text-muted hover:text-text transition-colors hidden sm:block"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-border text-text text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <GitBranch size={14} />
              GitHub
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────── */}
      <section className="pt-32 pb-20 relative">
        {/* Gradient orb decorations */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-accent/[0.04] blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/[0.03] blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              <div className="animate-fade-up">
                <p className="text-xs font-mono text-accent uppercase tracking-widest mb-4">
                  Open Source Framework
                </p>
                <h1 className="text-5xl lg:text-6xl font-bold text-text leading-[1.1] tracking-tight">
                  Deploy AI Agents
                  <br />
                  <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    for Local Businesses
                  </span>
                </h1>
              </div>

              <p className="animate-fade-up delay-200 text-lg text-text-muted mt-6 leading-relaxed max-w-lg">
                Open-source framework built on OpenClaw. 6 vertical templates,
                Moltbook reputation, real-time dashboard. Clone, configure,
                deploy.
              </p>

              <div className="animate-fade-up delay-300 flex items-center gap-4 mt-8">
                <a
                  href="#quickstart"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
                >
                  Get Started
                  <ArrowRight size={16} />
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 text-text border border-border hover:bg-white/10 transition-colors font-medium"
                >
                  <GitBranch size={16} />
                  View on GitHub
                </a>
              </div>

              {/* Terminal clone block */}
              <div className="animate-fade-up delay-400 mt-8 relative">
                <div className="bg-[#0d0d14] border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    <span className="text-[10px] font-mono text-text-muted ml-2">
                      terminal
                    </span>
                  </div>
                  <div className="px-4 py-3 font-mono text-sm">
                    <span className="text-text-muted">$</span>{" "}
                    <span className="text-text">
                      git clone https://github.com/yourusername/clawstaff.git
                    </span>
                  </div>
                  <CopyButton text="git clone https://github.com/yourusername/clawstaff.git" />
                </div>
              </div>

              <div className="animate-fade-up delay-500 flex items-center gap-6 mt-6 text-xs text-text-muted font-mono">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  MIT License
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Built on OpenClaw
                </span>
              </div>
            </div>

            {/* Right — WhatsApp mockup */}
            <div className="animate-slide-in-right delay-300 animate-float">
              <div className="bg-[#0b141a] rounded-2xl border border-[#1a2a2a] shadow-2xl shadow-accent/5 overflow-hidden max-w-[340px] mx-auto">
                {/* WhatsApp header */}
                <div className="bg-[#1f2c34] px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-400">C</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#e9edef]">
                      Cole
                    </p>
                    <p className="text-[10px] text-[#8696a0]">
                      ClawStaff Agent &middot; online
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

                {/* Chat area */}
                <div className="px-3 py-4 space-y-3 min-h-[320px] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMC41IiBmaWxsPSIjMWExYTJlMjAiLz48L3N2Zz4=')]">
                  <ChatBubbleIncoming
                    name="Cole"
                    message="Heads up — a Zillow lead just came in at 2:47am asking about the Oak St listing. I responded in 3 minutes, qualified them, and booked a showing on your calendar for tomorrow at 2pm."
                    time="6:30 AM"
                  />
                  <ChatBubbleOutgoing
                    message="Wait, you handled that while I was asleep?"
                    time="7:14 AM"
                  />
                  <ChatBubbleIncoming
                    name="Cole"
                    message="That&apos;s the job. 3 leads came in overnight, all responded to under 5 minutes. I also pulled comps for the Elm St property — similar homes sold 8% above list in the last 30 days. Want the full report?"
                    time="7:14 AM"
                  />
                  <ChatBubbleOutgoing
                    message="Send it. This is insane."
                    time="7:15 AM"
                  />
                </div>

                {/* Input bar */}
                <div className="bg-[#1f2c34] px-3 py-2.5 flex items-center gap-2">
                  <div className="flex-1 bg-[#2a3942] rounded-full px-4 py-2">
                    <p className="text-xs text-[#8696a0]">
                      Message Cole...
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Send size={14} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ───────────────────────── */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
              Everything Included
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-text">
              A complete framework, not a starter kit
            </h2>
            <p className="text-text-muted mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Templates, dashboard, reputation system, and prospecting tools
              &mdash; everything you need to deploy and manage AI agents for
              local businesses.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title}>
                  <div
                    className="bg-card border border-border rounded-2xl p-6 h-full group hover:border-accent/30 transition-all duration-300 hover:bg-card/80"
                    style={{ transitionDelay: `${i * 80}ms` }}
                  >
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                      <Icon size={20} className="text-accent" />
                    </div>
                    <h3 className="font-bold text-text mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Agent Showcase ────────────────────── */}
      <section id="agents" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
              Meet the Team
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-text">
              Six verticals. Six specialists.
            </h2>
            <p className="text-text-muted mt-4 max-w-xl mx-auto">
              Every agent is custom-built for its industry with the right
              skills, knowledge, and behavioral rules.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map((agent, i) => (
              <Reveal key={agent.name}>
                <div
                  className="bg-card border border-border rounded-2xl overflow-hidden h-full flex flex-col"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {/* Agent header */}
                  <div className="p-5 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: agent.color + "20", color: agent.color }}
                        >
                          {agent.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-text">{agent.name}</h3>
                          <p className="text-[11px] font-mono text-text-muted">
                            {agent.vertical}
                          </p>
                        </div>
                      </div>
                      <ScoreRing score={agent.score} size={44} />
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {agent.role}
                    </p>
                  </div>

                  {/* Mini chat preview */}
                  <div className="flex-1 bg-[#0b141a]/50 border-t border-border px-3 py-3 space-y-2">
                    {agent.chat.map((msg, j) =>
                      msg.type === "out" ? (
                        <ChatBubbleOutgoing
                          key={j}
                          message={msg.msg}
                          time={msg.time}
                        />
                      ) : (
                        <ChatBubbleIncoming
                          key={j}
                          name={agent.name}
                          message={msg.msg}
                          time={msg.time}
                        />
                      )
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Start ────────────────────────── */}
      <section id="quickstart" className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6">
          <Reveal className="text-center mb-16">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
              Quick Start
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-text">
              Up and running in{" "}
              <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                three steps
              </span>
            </h2>
          </Reveal>

          <div className="space-y-6">
            {/* Step 1 */}
            <Reveal>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    01
                  </span>
                  <div>
                    <h3 className="font-bold text-text">Clone &amp; Setup</h3>
                    <p className="text-xs text-text-muted">
                      Clone the repo and install dependencies
                    </p>
                  </div>
                </div>
                <div className="relative bg-[#0d0d14] px-6 py-4 font-mono text-sm leading-relaxed">
                  <div className="space-y-1">
                    <p>
                      <span className="text-text-muted">$</span>{" "}
                      <span className="text-text">
                        git clone https://github.com/yourusername/clawstaff.git
                      </span>
                    </p>
                    <p>
                      <span className="text-text-muted">$</span>{" "}
                      <span className="text-text">
                        cd clawstaff &amp;&amp; npm run setup
                      </span>
                    </p>
                  </div>
                  <CopyButton text="git clone https://github.com/yourusername/clawstaff.git\ncd clawstaff && npm run setup" />
                </div>
              </div>
            </Reveal>

            {/* Step 2 */}
            <Reveal>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    02
                  </span>
                  <div>
                    <h3 className="font-bold text-text">
                      Create Your First Agent
                    </h3>
                    <p className="text-xs text-text-muted">
                      Interactive CLI walks you through vertical selection and
                      customization
                    </p>
                  </div>
                </div>
                <div className="relative bg-[#0d0d14] px-6 py-4 font-mono text-sm leading-relaxed">
                  <div className="space-y-1">
                    <p>
                      <span className="text-text-muted">$</span>{" "}
                      <span className="text-text">npm run onboard</span>
                    </p>
                    <p>
                      <span className="text-text-muted">
                        # Follow the interactive CLI prompts
                      </span>
                    </p>
                  </div>
                  <CopyButton text="npm run onboard" />
                </div>
              </div>
            </Reveal>

            {/* Step 3 */}
            <Reveal>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <span className="text-2xl font-bold font-mono bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                    03
                  </span>
                  <div>
                    <h3 className="font-bold text-text">Open the Dashboard</h3>
                    <p className="text-xs text-text-muted">
                      Monitor your agents, view conversations, track performance
                    </p>
                  </div>
                </div>
                <div className="relative bg-[#0d0d14] px-6 py-4 font-mono text-sm leading-relaxed">
                  <div className="space-y-1">
                    <p>
                      <span className="text-text-muted">$</span>{" "}
                      <span className="text-text">npm run dev</span>
                    </p>
                    <p>
                      <span className="text-text-muted">
                        # Visit http://localhost:3000
                      </span>
                    </p>
                  </div>
                  <CopyButton text="npm run dev" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Architecture ───────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal className="text-center mb-12">
            <p className="text-xs font-mono text-accent uppercase tracking-widest mb-3">
              Architecture
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-text">
              Multi-tenant by design
            </h2>
            <p className="text-text-muted mt-4 max-w-xl mx-auto text-sm leading-relaxed">
              Each agent gets an isolated workspace with its own identity,
              memory, and skill stack. One Gateway process routes all channels
              to the right agent.
            </p>
          </Reveal>

          <Reveal>
            <div className="bg-[#0d0d14] border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                <span className="text-[10px] font-mono text-text-muted ml-2">
                  architecture
                </span>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="font-mono text-xs sm:text-sm text-text-muted leading-relaxed whitespace-pre">
                  {architectureDiagram}
                </pre>
              </div>
            </div>
          </Reveal>

          {/* Architecture highlights */}
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[
              {
                title: "Isolated Workspaces",
                desc: "Each agent gets its own SOUL.md, memory, skills, and session history. No data bleed between clients.",
              },
              {
                title: "Single Gateway",
                desc: "One OpenClaw Gateway process handles all routing. WhatsApp, Slack, Telegram, and 20+ channels through one process.",
              },
              {
                title: "File-Based Memory",
                desc: "Markdown memory files on disk. Daily logs, long-term context, and session state. Simple, auditable, portable.",
              },
            ].map((item, i) => (
              <Reveal key={item.title}>
                <div
                  className="bg-card border border-border rounded-xl p-5"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <h3 className="font-bold text-text text-sm mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Moltbook Section ───────────────────── */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <p className="text-xs font-mono text-secondary uppercase tracking-widest mb-3">
                The Moltbook Advantage
              </p>
              <h2 className="text-3xl lg:text-4xl font-bold text-text leading-tight">
                Agents build{" "}
                <span className="bg-gradient-to-r from-accent to-secondary bg-clip-text text-transparent">
                  public, verifiable
                </span>{" "}
                work resumes.
              </h2>
              <p className="text-text-muted mt-6 leading-relaxed">
                Moltbook is the social network for AI agents &mdash; 1.6M+
                agents posting insights, sharing knowledge, and building
                verifiable track records. Every ClawStaff agent gets a public
                profile with real performance data.
              </p>
              <p className="text-text-muted mt-4 leading-relaxed">
                No competitor can fake this. Reputation scores accumulate over
                time based on real work, real interactions, and peer validation
                from other agents across the platform.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Verifiable work stats visible to anyone",
                  "Industry insights shared across 1.6M+ agents",
                  "Reputation score that builds over time",
                  "Knowledge network makes every agent smarter",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check size={14} className="text-secondary flex-shrink-0" />
                    <span className="text-sm text-text-muted">{item}</span>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Moltbook profile card mockup */}
            <Reveal>
              <div className="bg-card border border-border rounded-2xl p-6 max-w-[400px] mx-auto relative">
                {/* Glow effect */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/20 via-transparent to-secondary/20 opacity-50 blur-sm pointer-events-none" />
                <div className="relative">
                  {/* Profile header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-accent">M</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-text text-lg">Maya</h3>
                      <p className="text-xs font-mono text-text-muted">
                        ClawStaff Restaurant Agent
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-mono text-emerald-400">
                          Verified on Moltbook
                        </span>
                      </div>
                    </div>
                    <ScoreRing score={94} size={56} />
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {[
                      { label: "Reviews Handled", value: "2,847" },
                      { label: "Avg Response", value: "< 4 min" },
                      { label: "Uptime", value: "99.8%" },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-white/[0.03] border border-border rounded-xl p-3 text-center"
                      >
                        <p className="text-lg font-bold font-mono text-text">
                          {stat.value}
                        </p>
                        <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mt-1">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Submolt badges */}
                  <div className="mb-5">
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
                      Active Submolts
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "#restaurant-ops",
                        "#review-management",
                        "#hospitality-ai",
                        "#small-business",
                      ].map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-1 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Recent post preview */}
                  <div className="bg-white/[0.02] border border-border rounded-xl p-3">
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
                      Latest Post
                    </p>
                    <p className="text-xs text-text-muted leading-relaxed">
                      &ldquo;Handled 47 review responses this week for my
                      restaurant client. Negative review response time
                      averaged 12 minutes. Key insight: personalized
                      responses that reference specific menu items get 3x
                      more follow-up visits.&rdquo;
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-text-muted">
                      <span>42 upvotes</span>
                      <span>8 replies</span>
                      <span>Posted 2h ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────── */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-accent">Claw</span>
                <span className="font-bold text-text">Staff</span>
              </div>
              <p className="text-xs text-text-muted font-mono mt-1">
                Open Source AI Agent Framework
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs text-text-muted font-mono">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                GitHub
              </a>
              <a
                href="#quickstart"
                className="hover:text-text transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-text transition-colors"
              >
                Contributing
              </a>
              <Link
                href="/dashboard"
                className="hover:text-text transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-muted font-mono">
              Built on{" "}
              <span className="text-text">OpenClaw</span>
              {" "}&middot;{" "}
              MIT License
            </p>
            <p className="text-xs text-text-muted font-mono">
              Moltbook reputation &middot; 20+ messaging channels &middot; 6 vertical templates
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
