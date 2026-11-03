"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { sparklePath } from "@/components/icons/geometry";
import { Puff, svgId } from "@/components/icons/Puff";
import { spring } from "@/lib/motion";
import { useReducedMotionPref } from "@/lib/prefs";
import type { Companion as Kind } from "@/lib/validation/onboarding";
import { KINDS, type KindArt } from "./kinds";

// The mood engine (design §9.3). Every creature shares these moods; the
// kind only supplies body parts. Ambient loops are CSS (they stop with
// reduced motion and in the background); one-off moves use Motion springs.

export type Mood =
  | "idle"
  | "waiting"
  | "urgent"
  | "happy"
  | "sleeping"
  | "frozen"
  | "celebrate"
  | "sad"
  | "wave";

export function Companion({
  kind,
  mood = "idle",
  size = 140,
  color,
  streak = 0,
  facing = "right",
  label,
  className = "",
}: {
  kind: Kind;
  mood?: Mood;
  size?: number;
  /** The player colour for the scarf; inherits data-player-color if unset. */
  color?: string;
  /** Sprig's flowers bloom with the streak. */
  streak?: number;
  /** Which way "waiting" glances (toward the partner's island). */
  facing?: "left" | "right";
  label?: string;
  className?: string;
}) {
  const u = svgId(useId());
  const k = KINDS[kind] ?? KINDS.mochi;
  const reduced = useReducedMotionPref();
  const blink = useBlink(!reduced && eyesOpen(mood));
  const glance = useGlance(!reduced && (mood === "waiting" || mood === "frozen"));
  const hop = useAnimationControls();

  // Happy hops once when it arrives; celebrate keeps jumping.
  useEffect(() => {
    if (reduced) return;
    if (mood === "happy") {
      hop.start({
        y: [0, 3, -16, 0, 0],
        scaleY: [1, 0.86, 1.08, 0.94, 1],
        transition: { duration: 0.7, times: [0, 0.15, 0.45, 0.8, 1] },
      });
    } else if (mood === "celebrate") {
      hop.start({
        y: [0, 4, -26, 0, 0],
        scaleY: [1, 0.85, 1.1, 0.9, 1],
        scaleX: [1, 1.1, 0.94, 1.08, 1],
        transition: {
          duration: 1,
          times: [0, 0.15, 0.45, 0.75, 1],
          repeat: Infinity,
          repeatDelay: 0.6,
        },
      });
    } else {
      hop.start({ y: 0, scaleY: 1, scaleX: 1, transition: spring.soft });
    }
  }, [mood, reduced, hop]);

  const ctx = { u, droop: mood === "sad", streak };
  const dx = glance * (facing === "right" ? 1.6 : -1.6);
  const ambient =
    mood === "urgent"
      ? "animate-[tap_0.5s_ease-in-out_infinite]"
      : mood === "frozen"
        ? "animate-[shiver_5s_linear_infinite]"
        : mood === "sleeping" || mood === "sad"
          ? ""
          : "animate-breathe";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      data-player-color={color}
      className={`overflow-visible ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* contact shadow; floaters hover above theirs */}
      <ellipse
        cx={60}
        cy={114}
        rx={k.floats ? 22 : 34}
        ry={3.5}
        fill="var(--plum)"
        opacity={0.12}
      />
      <motion.g animate={hop} className="svg-origin-bottom">
        <g
          className={`${k.floats ? "animate-bob" : ""}`}
          style={k.floats ? { animationDuration: "3.6s" } : undefined}
        >
          <g
            className={`svg-origin-bottom ${ambient}`}
            transform={mood === "sad" ? "translate(0 2)" : undefined}
          >
            {k.back?.(ctx)}
            {k.body(ctx)}
            {k.front?.(ctx)}
            <Scarf u={u} k={k} />
            <Face k={k} mood={mood} blink={blink} dx={dx} big={size >= 96} />
            <Paw k={k} mood={mood} />
          </g>
        </g>
      </motion.g>
      <Extras k={k} mood={mood} />
      {mood === "frozen" && <IceCube />}
    </svg>
  );
}

const eyesOpen = (m: Mood) =>
  m !== "happy" && m !== "sleeping" && m !== "celebrate";

/** Blinks at random every 3–6 s. */
function useBlink(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          setClosed(true);
          t = setTimeout(() => {
            setClosed(false);
            loop();
          }, 140);
        },
        3000 + Math.random() * 3000,
      );
    };
    loop();
    return () => clearTimeout(t);
  }, [enabled]);
  return enabled && closed;
}

/** Now and then looks toward the partner (0 → 1 → 0). */
function useGlance(enabled: boolean): number {
  const [g, setG] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setG(1);
      setTimeout(() => setG(0), 1400);
    }, 6000);
    return () => clearInterval(id);
  }, [enabled]);
  return enabled ? g : 0;
}

function Scarf({ u, k }: { u: string; k: KindArt }) {
  const { y, half } = k.scarf;
  const l = 60 - half;
  const r = 60 + half;
  return (
    <g>
      <Puff
        id={`${u}sc`}
        tone="p"
        shade={[-1, -1.8]}
        shape={(p) => (
          <>
            <path
              d={`M${l} ${y - 4}Q60 ${y + 4} ${r} ${y - 4}L${r - 1} ${y + 3}Q60 ${y + 11} ${l + 1} ${y + 3}Z`}
              {...p}
            />
            <path
              d={`M${r - 12} ${y + 3}L${r - 4} ${y + 16}L${r - 13} ${y + 18}L${r - 18} ${y + 5}Z`}
              {...p}
            />
          </>
        )}
      />
      <path
        d={`M${r - 9} ${y + 13}l3 -1M${l + 8} ${y + 2}l3 1.2`}
        stroke="var(--p-deep)"
        strokeOpacity={0.4}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </g>
  );
}

function Face({
  k,
  mood,
  blink,
  dx,
  big,
}: {
  k: KindArt;
  mood: Mood;
  blink: boolean;
  dx: number;
  big: boolean;
}) {
  const ink = "var(--plum)";
  const line = {
    stroke: ink,
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  const [mx, my] = k.mouth;
  let eyes: ReactNode;
  if (mood === "happy" || mood === "celebrate") {
    // content "^ ^"
    eyes = k.eyes.map(([x, y], i) => (
      <path key={i} d={`M${x - 4} ${y + 1.5}Q${x} ${y - 4} ${x + 4} ${y + 1.5}`} {...line} />
    ));
  } else if (mood === "sleeping") {
    eyes = k.eyes.map(([x, y], i) => (
      <path key={i} d={`M${x - 4} ${y}Q${x} ${y + 3.5} ${x + 4} ${y}`} {...line} />
    ));
  } else {
    eyes = k.eyes.map(([x, y], i) => (
      <g key={i} transform={`translate(${x + dx} ${y})`}>
        <g
          className="svg-origin-center"
          style={{
            transform: blink ? "scaleY(0.12)" : undefined,
            transition: "transform 70ms",
          }}
        >
          <ellipse rx={3.6} ry={mood === "sad" ? 4 : 4.6} fill={ink} />
          <circle cx={-1.1} cy={-1.7} r={1.3} fill="var(--white)" />
        </g>
        {mood === "sad" && (
          <path
            d={i === 0 ? "M-5 -7L2 -9" : "M5 -7L-2 -9"}
            {...line}
            strokeWidth={1.8}
          />
        )}
      </g>
    ));
  }

  let mouth: ReactNode;
  switch (mood) {
    case "happy":
    case "celebrate":
      mouth = (
        <path
          d={`M${mx - 5} ${my}Q${mx} ${my + 7} ${mx + 5} ${my}Z`}
          fill="var(--blush-deep)"
          stroke={ink}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      );
      break;
    case "sad":
      mouth = <path d={`M${mx - 3.5} ${my + 3}Q${mx} ${my - 0.5} ${mx + 3.5} ${my + 3}`} {...line} strokeWidth={2} />;
      break;
    case "urgent":
    case "sleeping":
      mouth = <ellipse cx={mx} cy={my + 1.5} rx={2} ry={2.4} fill={ink} />;
      break;
    case "frozen":
      mouth = <path d={`M${mx - 3.5} ${my + 1}q1.75 -1.5 3.5 0t3.5 0`} {...line} strokeWidth={1.8} />;
      break;
    default:
      // a small "w"
      mouth = (
        <path
          d={`M${mx - 4} ${my}q2 2.6 4 0q2 2.6 4 0`}
          {...line}
          strokeWidth={1.9}
        />
      );
  }

  return (
    <g>
      {k.cheeks.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={5} ry={3} fill="var(--blush)" opacity={0.6} />
      ))}
      {eyes}
      {mouth}
      {mood === "sad" && big && (
        <path
          d={`M${k.eyes[1][0] + 1} ${k.eyes[1][1] + 6}q-2.4 3.6 0 5.2q2.4 -1.6 0 -5.2Z`}
          fill="var(--sky)"
        />
      )}
    </g>
  );
}

/** A little paw: waves for "wave", holds up a flower for "celebrate". */
function Paw({ k, mood }: { k: KindArt; mood: Mood }) {
  if (mood !== "wave" && mood !== "celebrate") return null;
  // Raised beside the head, so the wave reads even when it's still.
  const [x, y] = mood === "wave" ? [k.paw[0] + 4, k.paw[1] - 16] : k.paw;
  return (
    <g
      className={
        mood === "wave"
          ? "animate-[wave-paw_0.5s_ease-in-out_3]"
          : undefined
      }
      style={{ transformBox: "view-box", transformOrigin: `${x - 8}px ${y + 6}px` }}
    >
      <ellipse
        cx={x}
        cy={y - 4}
        rx={6.5}
        ry={9}
        fill={k.fill}
        stroke={k.deep}
        strokeOpacity={0.18}
        strokeWidth={1.5}
        transform={`rotate(-25 ${x} ${y - 4})`}
      />
      {mood === "celebrate" && (
        <g transform={`translate(${x + 2} ${y - 22})`}>
          <path d="M0 4V18" stroke="var(--leaf-deep)" strokeWidth={2.4} strokeLinecap="round" />
          {[0, 1, 2, 3, 4].map((i) => {
            const a = ((-90 + i * 72) * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={Math.round(4.2 * Math.cos(a) * 100) / 100}
                cy={Math.round(4.2 * Math.sin(a) * 100) / 100}
                r={3.8}
                fill="var(--p)"
              />
            );
          })}
          <circle r={2.6} fill="var(--butter)" />
        </g>
      )}
    </g>
  );
}

/** Things around the creature: sweat drop, z's, sparkles. */
function Extras({ k, mood }: { k: KindArt; mood: Mood }) {
  const [ex, ey] = k.eyes[1];
  if (mood === "urgent") {
    return (
      <path
        d={`M${ex + 12} ${ey - 14}q-3.5 5 0 7.5q3.5 -2.5 0 -7.5Z`}
        fill="var(--sky)"
        className="animate-[tap_0.5s_ease-in-out_infinite]"
      />
    );
  }
  if (mood === "sleeping") {
    return (
      <g className="particle" fill="var(--ink-2)" fontFamily="var(--font-baloo)" fontWeight={700}>
        {[0, 1, 2].map((i) => (
          <text
            key={i}
            x={ex + 10 + i * 5}
            y={ey - 10 - i * 4}
            fontSize={9 + i * 2}
            className="animate-[float-up_4s_ease-out_infinite]"
            style={{ animationDelay: `${i * 1.3}s` }}
          >
            z
          </text>
        ))}
      </g>
    );
  }
  if (mood === "celebrate") {
    return (
      <g fill="var(--butter)" className="particle">
        {[
          [18, 30, 5],
          [102, 24, 6],
          [10, 70, 3.5],
          [108, 66, 4],
        ].map(([x, y, s], i) => (
          <path
            key={i}
            d={sparklePath(x, y, s)}
            className="animate-twinkle"
            style={{ animationDuration: "1.2s", animationDelay: `-${i * 0.3}s` }}
          />
        ))}
      </g>
    );
  }
  return null;
}

/** On ice: inside a translucent cube, only the eyes move (design §9.3). */
function IceCube() {
  return (
    <g>
      <rect
        x={12}
        y={20}
        width={96}
        height={94}
        rx={18}
        fill="var(--frost)"
        opacity={0.42}
        stroke="var(--white)"
        strokeOpacity={0.75}
        strokeWidth={2}
      />
      <path d="M22 36L32 28M22 46L27 42" stroke="var(--white)" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
      <path d={sparklePath(98, 32, 5)} fill="var(--white)" />
      <path d={sparklePath(22, 100, 3.5)} fill="var(--white)" opacity={0.8} />
    </g>
  );
}
