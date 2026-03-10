"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedReputationRingProps {
  score: number;
}

// Animated reputation ring that fills from 0 to target score
export function AnimatedReputationRing({ score }: AnimatedReputationRingProps) {
  const radius = 72;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  const springValue = useSpring(0, {
    duration: 2000,
    bounce: 0,
  });

  const displayScore = useTransform(springValue, (v) => Math.round(v));
  const dashOffset = useTransform(springValue, (v) => {
    const progress = (v / 100) * circumference;
    return circumference - progress;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      springValue.set(score);
    }, 300);
    return () => clearTimeout(timer);
  }, [score, springValue]);

  return (
    <div className="relative w-44 h-44">
      <svg viewBox="0 0 164 164" className="w-full h-full -rotate-90">
        <circle cx="82" cy="82" r={radius} fill="none" stroke="#1a1a2e" strokeWidth={strokeWidth} />
        <defs>
          <linearGradient id="scoreGradientDemo" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f7c948" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="82"
          cy="82"
          r={radius}
          fill="none"
          stroke="url(#scoreGradientDemo)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-4xl font-bold font-mono text-text">
          {displayScore}
        </motion.span>
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  );
}
