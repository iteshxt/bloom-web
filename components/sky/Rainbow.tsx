"use client";

import { motion } from "motion/react";
import { dur, ease } from "@/lib/motion";

// Both done today: a faint rainbow arcs between the two islands (§6.3). It
// draws itself from island to island the first time it appears (§12.4).

const BANDS = [
  "var(--blush)",
  "var(--peach)",
  "var(--butter)",
  "var(--mint)",
  "var(--sky)",
  "var(--lilac)",
];

export function Rainbow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 110"
      className={`pointer-events-none ${className}`}
      aria-hidden
    >
      {BANDS.map((c, i) => (
        <motion.path
          key={c}
          d={`M${10 + i * 6} 108A${100 - i * 6} ${96 - i * 6} 0 0 1 ${210 - i * 6} 108`}
          stroke={c}
          strokeWidth={6.5}
          strokeLinecap="round"
          fill="none"
          opacity={0.55}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: dur.scene, ease: ease.inOut }}
        />
      ))}
    </svg>
  );
}
