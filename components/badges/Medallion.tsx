"use client";

import { useId } from "react";
import {
  Puff,
  Shine,
  SoftBlur,
  svgId,
  type Tone,
} from "@/components/icons/Puff";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";

// Badge medallions (design §11.10, §17): a round puffy coin in the badge's
// colour, a scalloped rim, two ribbon tails and the badge's emblem. Locked
// badges are a frosted silhouette.

const LOOK: Record<string, { tone: Tone; emblem: PuffyName }> = {
  first_blood: { tone: "mint", emblem: "sprout" },
  hat_trick: { tone: "butter", emblem: "crown" },
  hard_hitter: { tone: "blush", emblem: "star" },
  hard_mode: { tone: "blush", emblem: "trophy" },
  night_owl: { tone: "lilac", emblem: "moon" },
  early_bird: { tone: "peach", emblem: "sun" },
  perfect_week: { tone: "sky", emblem: "calendar" },
  iron_will: { tone: "frost", emblem: "coin" },
  comeback: { tone: "blush", emblem: "heart" },
  big_heart: { tone: "peach", emblem: "giftOpen" },
  explorer: { tone: "sky", emblem: "map" },
  century: { tone: "mint", emblem: "check" },
  ms_15: { tone: "blush", emblem: "bloom" },
  ms_30: { tone: "lilac", emblem: "bloom" },
  ms_50: { tone: "mint", emblem: "bloom" },
  ms_100: { tone: "butter", emblem: "bloom" },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function Medallion({
  badge,
  size = 80,
  locked = false,
}: {
  badge: string;
  size?: number;
  locked?: boolean;
}) {
  const u = svgId(useId());
  const look = LOOK[badge] ?? { tone: "butter", emblem: "star" };
  // A scalloped rim: 14 bumps around the coin.
  const rim = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return [r2(50 + 36 * Math.cos(a)), r2(46 + 36 * Math.sin(a))] as const;
  });
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <defs>
          <SoftBlur id={`${u}s`} />
        </defs>
        <g
          style={
            locked
              ? { filter: "saturate(0) brightness(1.15)", opacity: 0.45 }
              : undefined
          }
        >
          {/* ribbon tails */}
          <path d="M34 70L26 96L38 90L44 98L48 74Z" fill="var(--blush)" />
          <path d="M66 70L74 96L62 90L56 98L52 74Z" fill="var(--sky)" />
          <Puff
            id={`${u}r`}
            tone={look.tone}
            shade={[-3, -4]}
            shape={(p) => (
              <>
                {rim.map(([x, y], i) => (
                  <circle key={i} cx={x} cy={y} r={9} {...(p as object)} />
                ))}
                <circle cx={50} cy={46} r={36} {...(p as object)} />
              </>
            )}
          />
          <circle cx={50} cy={46} r={27} fill="var(--white)" opacity={0.75} />
          <Shine filter={`${u}s`} cx={32} cy={24} rx={9} ry={4} />
        </g>
        {locked && (
          <circle
            cx={50}
            cy={46}
            r={40}
            fill="var(--frost)"
            opacity={0.35}
            stroke="var(--white)"
            strokeOpacity={0.6}
            strokeWidth={2}
          />
        )}
      </svg>
      <span
        className="absolute"
        style={{
          top: size * 0.2,
          opacity: locked ? 0.35 : 1,
          filter: locked ? "saturate(0)" : undefined,
        }}
      >
        <PuffyIcon
          name={locked ? "lock" : look.emblem}
          size={Math.round(size * 0.42)}
        />
      </span>
    </span>
  );
}
