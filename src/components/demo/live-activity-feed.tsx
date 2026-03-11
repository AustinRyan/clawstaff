"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Star, ShoppingCart, Calendar, MessageSquare, UserPlus } from "lucide-react";

interface ActivityEntry {
  id: number;
  text: string;
  agent: string;
  agentColor: string;
  icon: typeof Send;
  time: string;
}

const ACTIVITY_POOL: Omit<ActivityEntry, "id" | "time">[] = [
  {
    text: "Responded to Google review from Mike T. — 1.2min response time",
    agent: "Maya",
    agentColor: "#ff6b35",
    icon: Star,
  },
  {
    text: "Scheduled showing for Jennifer R. at 123 Oak St — 3pm tomorrow",
    agent: "Cole",
    agentColor: "#3b82f6",
    icon: Calendar,
  },
  {
    text: "Confirmed tomorrow's 9am appointment with David K.",
    agent: "Sophia",
    agentColor: "#a78bfa",
    icon: Calendar,
  },
  {
    text: "Recovered abandoned cart — $127.50 order completed",
    agent: "Zoe",
    agentColor: "#22c55e",
    icon: ShoppingCart,
  },
  {
    text: "Re-engaged Sarah M. — booked Thursday 6pm yoga class",
    agent: "Alex",
    agentColor: "#f7c948",
    icon: UserPlus,
  },
  {
    text: "Handled reservation request for party of 8 — Friday 7pm",
    agent: "Maya",
    agentColor: "#ff6b35",
    icon: MessageSquare,
  },
  {
    text: "Sent follow-up to cold lead Marcus W. — property at 456 Elm",
    agent: "Cole",
    agentColor: "#3b82f6",
    icon: Send,
  },
  {
    text: "Rescheduled 3 patient appointments due to Dr. Chen's conflict",
    agent: "Sophia",
    agentColor: "#a78bfa",
    icon: Calendar,
  },
  {
    text: "Processed return for order #4821 — customer satisfied",
    agent: "Zoe",
    agentColor: "#22c55e",
    icon: ShoppingCart,
  },
  {
    text: "Sent class reminder to 14 members — tomorrow's 7am bootcamp",
    agent: "Alex",
    agentColor: "#f7c948",
    icon: Send,
  },
  {
    text: "Drafted response to 1-star Yelp review — flagged for owner review",
    agent: "Maya",
    agentColor: "#ff6b35",
    icon: Star,
  },
  {
    text: "Qualified new lead: Sarah P. looking for 3br in Westside, $850k budget",
    agent: "Cole",
    agentColor: "#3b82f6",
    icon: UserPlus,
  },
  {
    text: "Answered insurance coverage question from new patient Linda R.",
    agent: "Sophia",
    agentColor: "#a78bfa",
    icon: MessageSquare,
  },
  {
    text: "Upsold premium membership to Jake M. — $49/mo → $89/mo",
    agent: "Alex",
    agentColor: "#f7c948",
    icon: ShoppingCart,
  },
  {
    text: "Handled HVAC emergency dispatch — technician arriving in 45min",
    agent: "Jake",
    agentColor: "#ef4444",
    icon: Send,
  },
  {
    text: "Sent post-service follow-up survey to 6 completed jobs",
    agent: "Jake",
    agentColor: "#ef4444",
    icon: Star,
  },
];

export function LiveActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const counterRef = useRef(0);

  const addEntry = useCallback(() => {
    const idx = counterRef.current % ACTIVITY_POOL.length;
    const template = ACTIVITY_POOL[idx];
    const newEntry: ActivityEntry = {
      ...template,
      id: Date.now() + counterRef.current,
      time: "just now",
    };
    counterRef.current += 1;
    setEntries((current) => [newEntry, ...current].slice(0, 12));
  }, []);

  // Seed with 5 initial entries
  useEffect(() => {
    const seeded: ActivityEntry[] = ACTIVITY_POOL.slice(0, 5).map((t, i) => ({
      ...t,
      id: i,
      time: `${(i + 1) * 2}m ago`,
    }));
    setEntries(seeded);
  }, []);

  // Add new entry every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(addEntry, 2500);
    return () => clearInterval(interval);
  }, [addEntry]);

  return (
    <div className="flex-1 overflow-hidden space-y-1 pr-1">
      <AnimatePresence mode="popLayout" initial={false}>
        {entries.map((entry) => {
          const Icon = entry.icon;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <div
                className="mt-0.5 w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${entry.agentColor}15`, color: entry.agentColor }}
              >
                <Icon size={13} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-text leading-snug">
                  <span className="font-semibold" style={{ color: entry.agentColor }}>
                    {entry.agent}
                  </span>{" "}
                  {entry.text.split(" — ")[0].replace(`${entry.agent} `, "")}
                  {entry.text.includes(" — ") && (
                    <span className="text-text-muted"> — {entry.text.split(" — ")[1]}</span>
                  )}
                </p>
                <p className="text-[11px] font-mono text-text-muted mt-0.5">
                  {entry.time}
                </p>
              </div>
              {entry.time === "just now" && (
                <motion.div
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 2 }}
                  className="absolute inset-0 rounded-lg pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 20px ${entry.agentColor}10`,
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
