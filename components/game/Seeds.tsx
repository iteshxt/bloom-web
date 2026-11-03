"use client";

import { AnimatePresence, motion } from "motion/react";
import { spring } from "@/lib/motion";

// design §10.4: one seed per required problem. Empty seeds are outlined in
// the player's colour; filled ones sprout a tiny leaf with a pop. Make-up
// seeds are frost. More than 6 switch to a segmented pill bar.

export function Seeds({
  solved,
  target,
  makeup,
}: {
  solved: number;
  target: number;
  makeup: number;
}) {
  const total = target + makeup;
  const filled = Math.min(solved, total);
  if (total > 6) {
    return (
      <div className="flex h-3 w-44 gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`rounded-pill flex-1 transition-colors ${
              i < filled
                ? i >= target
                  ? "bg-frost"
                  : "bg-p"
                : i >= target
                  ? "bg-frost-soft"
                  : "bg-p-soft"
            }`}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <Seed key={i} on={i < filled} makeup={i >= target} />
      ))}
    </div>
  );
}

function Seed({ on, makeup }: { on: boolean; makeup: boolean }) {
  const fill = makeup ? "var(--frost)" : "var(--p)";
  const ring = makeup ? "var(--frost-deep)" : "var(--p)";
  return (
    <svg
      viewBox="0 0 32 32"
      width={30}
      height={30}
      className="overflow-visible"
    >
      <circle
        cx={16}
        cy={18}
        r={11}
        fill="var(--surface)"
        stroke={ring}
        strokeWidth={2.4}
        strokeDasharray={makeup && !on ? "3 3" : undefined}
      />
      <AnimatePresence>
        {on && (
          <motion.g
            key="on"
            className="svg-origin-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={spring.bouncy}
          >
            <circle cx={16} cy={18} r={11} fill={fill} />
            <circle
              cx={12.5}
              cy={14}
              r={2.6}
              fill="var(--white)"
              opacity={0.55}
            />
            {/* the leaf it sprouts */}
            <path
              d="M16 8C16 4 19 1.5 23 2C23 6 20 8.5 16 8Z"
              fill="var(--leaf)"
            />
            <path
              d="M16 8V5"
              stroke="var(--leaf-deep)"
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}
