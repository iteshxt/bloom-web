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
    </div>
  );
}

function IslandBase({ frozen }: { frozen: boolean }) {
  const u = svgId(useId());
  return (
    <svg viewBox="0 0 170 62" className="w-full" aria-hidden>
      <defs>
        <SoftBlur id={`${u}s`} std={2} />
      </defs>
      <Puff
        id={`${u}b`}
        tone="soil"
        shade={[-3, -4]}
        shape={(p) => (
          <path d="M12 20C22 44 54 60 85 60C116 60 148 44 158 20Z" {...p} />
        )}
      />
      <path
        d="M66 52q2 5-1 8M104 52q-1 5 2 8"
        stroke="var(--soil-deep)"
        strokeOpacity={0.4}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
      <Puff
        id={`${u}g`}
        tone="leaf"
        shade={[-2, -3]}
        shape={(p) => (
          <path d="M6 22C6 8 164 8 164 22C164 31 6 31 6 22Z" {...p} />
        )}
      />
      <Shine filter={`${u}s`} cx={40} cy={14} rx={18} ry={2.5} rotate={-3} />
      {/* grass tufts and tiny wildflowers on the rim */}
      <path
        d="M22 16l-2-6M25 16l1-7M144 15l2-6M148 16l-1-5"
        stroke="var(--leaf-deep)"
        strokeOpacity={0.55}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={30} cy={13} r={2.2} fill="var(--butter)" />
      <circle cx={138} cy={12} r={2.2} fill="var(--white)" />
      {frozen && (
        <g>
          <path
            d="M6 22C6 8 164 8 164 22C164 31 6 31 6 22Z"
            fill="var(--frost)"
            opacity={0.55}
          />
          <path d={sparklePath(28, 18, 5)} fill="var(--white)" />
          <path d={sparklePath(132, 16, 4)} fill="var(--white)" />
          <path d={sparklePath(86, 24, 3)} fill="var(--white)" opacity={0.8} />
        </g>
      )}
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
