"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { svgId } from "@/components/icons/Puff";
import { useReducedMotionPref } from "@/lib/prefs";
import { dur, ease } from "@/lib/motion";
import { SKY_GRADIENTS, type SkyBand } from "@/lib/sky";
import { Aurora } from "./Aurora";
import { Clouds } from "./Clouds";
import { PetalDrift } from "./PetalDrift";
import { at, H, W, wide } from "./stage";

// The living sky at the top of every main screen (design §6). Inline SVG on
// a 390 × 360 canvas, anchored to the bottom so taller screens show more
// sky. Layers, back to front: gradient, celestial, far hills, clouds, then
// whatever the screen places on top (islands, chips).
//
// The still parts are one SVG, painted once. Everything that moves (stars,
// clouds, birds, aurora, petals) is a small HTML layer on a "stage" laid
// over the same canvas, so the browser animates it on the compositor
// instead of repainting the whole sky every frame.

/** Deterministic scatter, so stars don't jump between renders. */
function scatter(n: number, seed: number) {
  let t = seed;
  const rand = () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: n }, () => ({
    x: rand() * W,
    y: 12 + rand() * 170,
    r: 0.7 + rand() * 1.2,
    d: 2 + rand() * 3,
    delay: rand() * 4,
  }));
}

const STARS: Partial<Record<SkyBand, ReturnType<typeof scatter>>> = {
  night: scatter(18, 7),
  grace: scatter(22, 11),
  deep: scatter(32, 23),
};

export function SkyScene({
  band,
  petals = false,
  dim = false,
  className = "",
  children,
}: {
  band: SkyBand | null;
  /** Milestone day: petals drift across the sky (§6.3). */
  petals?: boolean;
  /** Offline: the sky dims slightly (§11.15). */
  dim?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const reduced = useReducedMotionPref();
  // Unique per scene: two skies can be mounted at once (the desktop
  // backdrop), and a gradient id in a hidden one would blank the other.
  const u = svgId(useId());
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMax slice"
      >
        <AnimatePresence initial={false}>
          {band && (
            <motion.g
              key={band}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: reduced ? 0 : dur.sky,
                ease: ease.inOut,
              }}
            >
              <BandLayer band={band} u={u} />
            </motion.g>
          )}
        </AnimatePresence>
        <Hills night={band !== null && isDark(band)} />
      </svg>
      {/* The stage covers the canvas exactly as the SVG's "xMidYMax slice"
          does: as wide as the box or as tall as it, whichever is bigger,
          centred and sitting on the bottom edge. Children place themselves
          in canvas percentages. */}
      <div
        aria-hidden
        className="[container-type:size] pointer-events-none absolute inset-0"
      >
        <div className="absolute bottom-0 left-1/2 aspect-[390/360] w-[max(100cqw,calc(100cqh*390/360))] -translate-x-1/2">
          {band && <Twinkles band={band} />}
          {band && <Clouds night={isDark(band)} />}
          {band === "grace" && <Aurora u={u} />}
          {petals && <PetalDrift />}
        </div>
      </div>
      {dim && (
        <div className="bg-ink/15 pointer-events-none absolute inset-0" />
      )}
      {children}
    </div>
  );
}

const isDark = (b: SkyBand) => b === "night" || b === "grace" || b === "deep";

function BandLayer({ band, u }: { band: SkyBand; u: string }) {
  const [top, bottom] = SKY_GRADIENTS[band];
  const id = `${u}-${band}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="var(--white)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--white)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />

      {band === "dawn" && (
        <g>
          <circle cx={92} cy={236} r={64} fill="var(--peach)" opacity={0.35} />
          <circle cx={92} cy={236} r={26} fill="var(--butter)" />
        </g>
      )}
      {band === "day" && (
        <g>
          <circle cx={196} cy={74} r={42} fill={`url(#${id}-halo)`} />
          <circle cx={196} cy={74} r={19} fill="var(--butter)" />
        </g>
      )}
      {band === "dusk" && (
        <g>
          <circle cx={300} cy={262} r={58} fill="var(--peach)" opacity={0.3} />
          <circle cx={300} cy={262} r={24} fill="var(--peach)" />
        </g>
      )}
      {isDark(band) && (
        <g>
          <circle
            cx={196}
            cy={72}
            r={44}
            fill={`url(#${id}-halo)`}
            opacity={0.4}
          />
          <circle cx={196} cy={72} r={18} fill="var(--butter-soft)" />
          <circle cx={190} cy={68} r={3.2} fill="var(--butter)" opacity={0.5} />
          <circle cx={202} cy={79} r={2.2} fill="var(--butter)" opacity={0.5} />
        </g>
      )}
    </>
  );
}

/** Hills follow the sky band, not the app theme. */
function Hills({ night }: { night: boolean }) {
  return (
    <g className="transition-[fill] duration-[2s]">
      <path
        d="M0 292C60 246 140 236 202 270C252 298 322 240 390 260V360H0Z"
        fill={night ? "var(--hill-far-night)" : "var(--hill-far)"}
      />
      <path
        d="M0 326C80 290 162 298 232 318C292 334 340 300 390 308V360H0Z"
        fill={night ? "var(--hill-near-night)" : "var(--hill-near)"}
        opacity={0.75}
      />
    </g>
  );
}

/** Everything that twinkles or bobs in the band: stars, the dusk star,
 *  night fireflies and the daytime birds. */
function Twinkles({ band }: { band: SkyBand }) {
  const dots: {
    x: number;
    y: number;
    r: number;
    c: string;
    d: number;
    delay: number;
  }[] = [
    ...(STARS[band] ?? []).map((s) => ({ ...s, c: "var(--white)" })),
    ...(band === "dusk"
      ? [{ x: 74, y: 62, r: 1.8, c: "var(--white)", d: 3, delay: 0 }]
      : []),
    ...(band === "night"
      ? [
          [60, 250],
          [140, 228],
          [228, 258],
          [334, 236],
          [190, 214],
        ].map(([x, y], i) => ({
          x,
          y,
          r: 2,
          c: "var(--butter)",
          d: 3.4,
          delay: i * 0.9,
        }))
      : []),
  ];
  return (
    <>
      {dots.map((s, i) => (
        <span
          key={i}
          className="animate-twinkle absolute block aspect-square -translate-1/2 rounded-full"
          style={{
            ...at(s.x, s.y),
            width: wide(s.r * 2),
            background: s.c,
            animationDuration: `${s.d}s`,
            animationDelay: `-${s.delay}s`,
          }}
        />
      ))}
      {band === "day" && (
        <svg
          viewBox="84 56 42 20"
          className="animate-bob absolute overflow-visible"
          style={{ ...at(84, 56), width: wide(42), animationDuration: "7s" }}
        >
          <path
            d="M86 74q5-5 9 0q4-5 9 0M110 62q4-4 7 0q3-4 7 0"
            stroke="var(--ink-2)"
            strokeOpacity={0.45}
            strokeWidth={1.6}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </>
  );
}
