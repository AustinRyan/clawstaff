"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  delay?: number;
}

// Smooth count-up animation from 0 to target value
export function CountUp({
  end,
  duration = 1.5,
  prefix = "",
  suffix = "",
  className = "",
  delay = 0,
}: CountUpProps) {
  const [started, setStarted] = useState(false);
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const springValue = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(springValue, (v) => {
    const num = Math.round(v);
    return `${prefix}${num.toLocaleString()}${suffix}`;
  });

  useEffect(() => {
    if (started) {
      springValue.set(end);
    }
  }, [started, end, springValue]);

  return <motion.span ref={nodeRef} className={className}>{display}</motion.span>;
}

// Count-up that handles decimal values (e.g., "1.2m")
export function CountUpDecimal({
  end,
  decimals = 1,
  duration = 1.5,
  suffix = "",
  className = "",
  delay = 0,
}: CountUpProps & { decimals?: number }) {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  const springValue = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(springValue, (v) => {
    return `${v.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    if (started) {
      springValue.set(end);
    }
  }, [started, end, springValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
