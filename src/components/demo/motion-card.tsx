"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface MotionCardProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

// Stagger-animated card wrapper — each card materializes with fade-up + scale
export function MotionCard({ children, index = 0, className = "" }: MotionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 30px rgba(255, 107, 53, 0.08)",
        borderColor: "rgba(255, 107, 53, 0.2)",
        transition: { duration: 0.2 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Section-level fade-up for headers and content blocks
export function MotionSection({ children, index = 0, className = "" }: MotionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
