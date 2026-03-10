"use client";

import { motion } from "framer-motion";

// Subtle animated gradient mesh background — dark purples and deep oranges
export function GradientMesh() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,107,53,0.03) 0%, transparent 70%)",
          top: "10%",
          right: "15%",
        }}
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.02) 0%, transparent 70%)",
          bottom: "5%",
          left: "10%",
        }}
        animate={{
          x: [0, -30, 20, 0],
          y: [0, 20, -30, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(247,201,72,0.015) 0%, transparent 70%)",
          top: "50%",
          left: "40%",
        }}
        animate={{
          x: [0, 40, -10, 0],
          y: [0, -15, 25, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
