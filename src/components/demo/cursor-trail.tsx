"use client";

import { useEffect, useState, useCallback } from "react";

interface TrailDot {
  id: number;
  x: number;
  y: number;
}

// Subtle, elegant cursor glow trail — faint warm glow follows the mouse
export function CursorTrail() {
  const [dots, setDots] = useState<TrailDot[]>([]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const dot: TrailDot = {
      id: Date.now(),
      x: e.clientX,
      y: e.clientY,
    };
    setDots((prev) => [...prev.slice(-8), dot]);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Clean up old dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length === 0) return prev;
        return prev.slice(-6);
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {dots.map((dot, i) => {
        const age = (dots.length - i) / dots.length;
        const opacity = (1 - age) * 0.15;
        const size = 12 + (1 - age) * 20;
        return (
          <div
            key={dot.id}
            className="absolute rounded-full"
            style={{
              left: dot.x - size / 2,
              top: dot.y - size / 2,
              width: size,
              height: size,
              background: `radial-gradient(circle, rgba(255,107,53,${opacity}) 0%, transparent 70%)`,
              transition: "opacity 0.15s ease-out",
            }}
          />
        );
      })}
      {/* Main cursor glow */}
      {dots.length > 0 && (
        <div
          className="absolute rounded-full"
          style={{
            left: dots[dots.length - 1].x - 20,
            top: dots[dots.length - 1].y - 20,
            width: 40,
            height: 40,
            background: "radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
}
