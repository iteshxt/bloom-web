"use client";

import { useId, type ReactNode } from "react";
import { Puff, Shine, SoftBlur, svgId } from "@/components/icons/Puff";
import { sparklePath } from "@/components/icons/geometry";

// A small floating grassy island (design §6.2, layer 5): a grass top with a
// soft soil underside. It holds one player's flower and companion. On ice,
// it gets frost crystals and its own little snow cloud (§6.3).

export function Island({
  width = 170,
  frozen = false,
  bobDelay = 0,
  children,
}: {
  width?: number;
  frozen?: boolean;
  bobDelay?: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="animate-bob relative flex flex-col items-center"
      style={{
        width,
        animationDuration: "6s",
        animationDelay: `-${bobDelay}s`,
      }}
    >
      {frozen && <SnowCloud />}
      <div className="relative z-10 -mb-[14px] flex items-end justify-center">
        {children}
      </div>
      <IslandBase frozen={frozen} />
      <Pebbles />
    </div>
  );
}

function IslandBase({ frozen }: { frozen: boolean }) {
  const u = svgId(useId());
  return (
    <svg viewBox="0 0 170 96" className="w-full overflow-visible" aria-hidden>
      <defs>
        <SoftBlur id={`${u}s`} std={2} />
        <SoftBlur id={`${u}g`} std={5} />
      </defs>

      {/* a soft glow below, so it reads as floating */}
      <ellipse
        cx={85}
        cy={92}
        rx={44}
        ry={4}
        fill="var(--plum)"
        opacity={0.12}
        filter={`url(#${u}g)`}
      />

      {/* the rocky underside, tapering to a point, with a darker stratum */}
      <Puff
        id={`${u}b`}
        tone="soil"
        shade={[-4, -5]}
        shape={(p) => (
          <path
            d="M8 22C14 40 34 52 50 60C62 66 72 80 84 86C96 80 106 66 120 60C136 52 156 40 162 22Z"
            {...p}
          />
        )}
      />
      <path
        d="M16 34C34 44 58 46 85 46C112 46 136 44 154 34C148 42 132 50 118 54C104 58 66 58 52 54C38 50 22 42 16 34Z"
        fill="var(--soil-dark)"
        opacity={0.55}
      />
      <path
        d="M58 62C68 64 78 66 86 66C96 66 104 64 112 62"
        stroke="var(--soil-deep)"
        strokeOpacity={0.3}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />

      {/* stones and a little crystal tucked in the soil */}
      <Puff
        id={`${u}r1`}
        fill="var(--stone)"
        deep="var(--stone-deep)"
        shape={(p) => (
          <ellipse cx={40} cy={40} rx={7} ry={5} {...(p as object)} />
        )}
      />
      <Puff
        id={`${u}r2`}
        fill="var(--stone)"
        deep="var(--stone-deep)"
        shape={(p) => (
          <ellipse cx={122} cy={46} rx={5.5} ry={4} {...(p as object)} />
        )}
      />
      <Puff
        id={`${u}r3`}
        fill="var(--stone)"
        deep="var(--stone-deep)"
        shape={(p) => (
          <ellipse cx={92} cy={70} rx={4} ry={3} {...(p as object)} />
        )}
      />
      <path d="M68 50L72 41L76 50L72 55Z" fill="var(--frost)" />
      <path d="M72 41L74 50L72 55Z" fill="var(--white)" opacity={0.6} />

      {/* hanging roots and a vine with leaves */}
      <path
        d="M44 56q-3 10 2 18M128 54q4 8 0 16M84 84q1 6-2 10"
        stroke="var(--soil-deep)"
        strokeOpacity={0.55}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M104 58q4 12-2 22"
        stroke="var(--leaf-deep)"
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx={106}
        cy={66}
        rx={3.2}
        ry={1.8}
        fill="var(--leaf)"
        transform="rotate(30 106 66)"
      />
      <ellipse
        cx={101}
        cy={74}
        rx={3}
        ry={1.7}
        fill="var(--leaf)"
        transform="rotate(-30 101 74)"
      />

      {/* the grass cap: a light top, a deeper rim, and blades drooping over */}
      <Puff
        id={`${u}g2`}
        tone="leaf"
        shade={[-2, -3]}
        shape={(p) => (
          <path d="M4 22C4 7 166 7 166 22C166 32 4 32 4 22Z" {...p} />
        )}
      />
      <path
        d="M6 24C10 30 16 31 20 28C24 33 30 33 34 29C40 34 48 33 52 29C58 34 66 33 70 29C78 34 86 34 92 29C98 34 106 33 112 29C118 34 126 33 130 28C136 33 144 32 148 28C154 31 160 29 164 24C150 32 20 32 6 24Z"
        fill="var(--leaf-deep)"
        opacity={0.45}
      />
      <ellipse
        cx={80}
        cy={15}
        rx={58}
        ry={5}
        fill="var(--grass-light)"
        opacity={0.7}
      />
      <Shine filter={`${u}s`} cx={42} cy={13} rx={18} ry={2.4} rotate={-3} />

      {/* life on top: tufts, flowers, a pebble and a little mushroom */}
      <path
        d="M20 18l-2-7M23 18l1-8M26 18l3-6M142 17l2-6M146 17l-1-7M110 14l-1-5M113 14l2-5"
        stroke="var(--leaf-deep)"
        strokeOpacity={0.6}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={31} cy={14} r={2.4} fill="var(--butter)" />
      <circle cx={136} cy={13} r={2.4} fill="var(--white)" />
      <circle cx={140} cy={15} r={1.8} fill="var(--blush)" />
      <ellipse cx={58} cy={16} rx={4} ry={2.4} fill="var(--stone)" />
      <g>
        <rect
          x={150}
          y={11}
          width={3}
          height={6}
          rx={1.5}
          fill="var(--white)"
        />
        <path d="M146 12C146 7 157 7 157 12Z" fill="var(--peach)" />
        <circle cx={150} cy={9.6} r={0.9} fill="var(--white)" />
        <circle cx={154} cy={10.4} r={0.8} fill="var(--white)" />
      </g>

      {frozen && (
        <g>
          <path
            d="M4 22C4 7 166 7 166 22C166 32 4 32 4 22Z"
            fill="var(--frost)"
            opacity={0.55}
          />
          <path
            d="M14 26l6 10 4-9 5 8 4-8"
            stroke="var(--white)"
            strokeWidth={1.6}
            strokeLinejoin="round"
            fill="none"
            opacity={0.8}
          />
          <path d={sparklePath(28, 18, 5)} fill="var(--white)" />
          <path d={sparklePath(132, 16, 4)} fill="var(--white)" />
          <path d={sparklePath(86, 24, 3)} fill="var(--white)" opacity={0.8} />
        </g>
      )}
    </svg>
  );
}

/** A few pebbles floating under the island, bobbing on their own. */
function Pebbles() {
  return (
    <svg
      viewBox="0 0 170 30"
      className="pointer-events-none -mt-3 w-full"
      aria-hidden
    >
      {[
        [62, 10, 4, 0],
        [104, 16, 3, 1.6],
        [80, 24, 2.4, 0.8],
      ].map(([x, y, r, d], i) => (
        <g
          key={i}
          className="animate-bob"
          style={{ animationDuration: `${4 + i}s`, animationDelay: `-${d}s` }}
        >
          <ellipse cx={x} cy={y} rx={r * 1.3} ry={r} fill="var(--soil)" />
          <ellipse
            cx={x - r * 0.3}
            cy={y - r * 0.35}
            rx={r * 0.5}
            ry={r * 0.3}
            fill="var(--white)"
            opacity={0.35}
          />
        </g>
      ))}
    </svg>
  );
}

/** A single tiny snow cloud dropping slow flakes over a frozen island. */
function SnowCloud() {
  return (
    <svg
      viewBox="0 0 80 52"
      className="absolute -top-14 left-1/2 z-20 w-20 -translate-x-1/2"
      aria-hidden
    >
      <g fill="var(--frost)">
        <circle cx={22} cy={18} r={10} />
        <circle cx={38} cy={12} r={12} />
        <circle cx={55} cy={18} r={10} />
        <rect x={12} y={16} width={56} height={12} rx={6} />
      </g>
      <g fill="var(--white)" className="particle">
        {[20, 34, 48, 60].map((x, i) => (
          <circle
            key={x}
            cx={x}
            cy={32}
            r={1.8}
            className="animate-[flake-fall_3.2s_linear_infinite]"
            style={{ animationDelay: `-${i * 0.8}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
