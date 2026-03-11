"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Toast {
  id: number;
  message: string;
}

const TOAST_MESSAGES = [
  "🔥 New lead responded — Cole following up",
  "⭐ 5-star review received — Maya drafting response",
  "📈 Reputation score increased +3 points",
  "💬 WhatsApp inquiry from new customer — Maya handling",
  "📅 3 showings confirmed for tomorrow — Cole",
  "🏋️ Trial class booked — Alex sending confirmation",
  "🏥 No-show recovered — Sophia rescheduled for Thursday",
  "🛒 Cart recovered — $89.99 order completed by Zoe",
  "⚡ Emergency service request routed — Jake dispatching",
  "📊 Weekly performance report generated",
  "🎯 Hot lead scored 94/100 — priority outreach queued",
  "✅ All 6 agents operating — 99.7% uptime this month",
];

export function ToastNotifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback(() => {
    const idx = counterRef.current % TOAST_MESSAGES.length;
    const toast: Toast = {
      id: Date.now(),
      message: TOAST_MESSAGES[idx],
    };
    counterRef.current += 1;
    setToasts((current) => [...current, toast]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== toast.id));
    }, 3000);
  }, []);

  useEffect(() => {
    // Random interval between 5-8 seconds
    const scheduleNext = () => {
      const delay = 5000 + Math.random() * 3000;
      return setTimeout(() => {
        addToast();
        timerRef = scheduleNext();
      }, delay);
    };

    // First toast after 3 seconds
    let timerRef = setTimeout(() => {
      addToast();
      timerRef = scheduleNext();
    }, 3000);

    return () => clearTimeout(timerRef);
  }, [addToast]);

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            transition={{
              duration: 0.35,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="bg-card border border-border rounded-xl px-4 py-3 shadow-xl shadow-black/20 pointer-events-auto"
          >
            <p className="text-sm text-text">{toast.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
