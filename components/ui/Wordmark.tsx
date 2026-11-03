"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";

// The wordmark (design §2.1): lowercase "bloom" in Baloo 2 ExtraBold, the
// two o's drawn as overlapping Blush and Sky circles that blend to lilac.
// With `rollIn`, the o's roll in from the sides and settle together (the
// sign-in entrance, §11.1).

export function Wordmark({
  height = 48,
  rollIn = false,
  delay = 0,
  className = "",
}: {
  height?: number;
  rollIn?: boolean;
  /** Seconds before the o's roll in. */
  delay?: number;
  className?: string;
}) {
  const roll = (from: number) =>
    rollIn
      ? {
          initial: { x: from, rotate: from * 3, opacity: 0 },
          animate: { x: 0, rotate: 0, opacity: 1 },
          transition: { ...spring.bouncy, delay },
        }
      : {};
  return (
    <span
      role="img"
      aria-label="bloom"
      className={`font-display inline-flex items-baseline leading-none font-extrabold tracking-[-0.02em] ${className}`}
      style={{ fontSize: height }}
    >
      <span aria-hidden>bl</span>
      <svg
        aria-hidden
        viewBox="0 0 100 56"
        style={{ height: height * 0.56, width: height * 1.0 }}
        className="mx-[0.02em] self-baseline overflow-visible"
      >
        <motion.g className="svg-origin-center" {...roll(-60)}>
          <circle cx={28} cy={28} r={25} fill="var(--blush)" />
          <circle cx={20} cy={18} r={5} fill="var(--white)" opacity={0.5} />
        </motion.g>
        <motion.g className="svg-origin-center" {...roll(60)}>
          <circle cx={72} cy={28} r={25} fill="var(--sky)" />
          <circle cx={64} cy={18} r={5} fill="var(--white)" opacity={0.5} />
        </motion.g>
        <motion.path
          d="M50 16.13A25 25 0 0 1 50 39.87A25 25 0 0 1 50 16.13Z"
          fill="var(--overlap)"
          initial={rollIn ? { opacity: 0 } : undefined}
          animate={rollIn ? { opacity: 1 } : undefined}
          transition={{ delay: delay + 0.35, duration: 0.3 }}
        />
      </svg>
      <span aria-hidden>m</span>
    </span>
  );
}
