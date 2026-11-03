"use client";

import { motion } from "motion/react";
import { spring } from "@/lib/motion";

// design §10.12: 10 px pill track in the soft shade, fill in the colour,
// animated with the soft spring and a tiny liquid overshoot at the end.

const TONES = {
  butter: { track: "bg-butter-soft", fill: "bg-butter" },
  p: { track: "bg-p-soft", fill: "bg-p" },
  mint: { track: "bg-mint-soft", fill: "bg-mint" },
  peach: { track: "bg-peach-soft", fill: "bg-peach" },
} as const;

export function ProgressBar({
  value,
  max,
  tone = "p",
  label,
  className = "",
}: {
  value: number;
  max: number;
  tone?: keyof typeof TONES;
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const t = TONES[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`rounded-pill relative h-2.5 overflow-hidden ${t.track} ${className}`}
    >
      <motion.div
        className={`rounded-pill absolute inset-y-0 left-0 w-full origin-left ${t.fill}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct, scaleY: [1, 1.15, 1] }}
        transition={{
          scaleX: spring.soft,
          scaleY: { duration: 0.3, delay: 0.35 },
        }}
      >
        {tone === "butter" && (
          <span className="rounded-pill absolute inset-x-1 top-[1.5px] h-[2px] bg-white/70" />
        )}
      </motion.div>
    </div>
  );
}

/** design §10.14: five petals rotating and pulsing, in the player colour. */
export function PetalSpinner({ size = 22 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="animate-spin-slow"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={Math.round((12 + 6.5 * Math.cos(a)) * 100) / 100}
            cy={Math.round((12 + 6.5 * Math.sin(a)) * 100) / 100}
            r={3.6}
            fill="currentColor"
            className="animate-pulse-soft"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        );
      })}
      <circle cx={12} cy={12} r={2.6} fill="var(--butter)" />
    </svg>
  );
}

/** design §10.14: cloud-tone block with a slow shimmer. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-surface relative overflow-hidden rounded-md ${className}`}
    >
      <div className="animate-shimmer via-p/15 absolute inset-0 bg-linear-to-r from-transparent to-transparent" />
    </div>
  );
}
