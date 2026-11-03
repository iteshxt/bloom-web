"use client";

import { useId, type ReactNode } from "react";
import { heartPath, sparklePath } from "@/components/icons/geometry";
import { Puff, Shine, SoftBlur, svgId } from "@/components/icons/Puff";
import { growthFor, type BloomStage } from "@/lib/bloom";

// A player's flower (design §7). The streak picks the stage; every day in a
// stage adds something visible (a leaf, a bigger bud, one more bloom).
// Petals take the player colour from the nearest data-player-color.

const BASE = 112;
/** Rounded so server and browser render identical attributes. */
const n2 = (x: number) => Math.round(x * 100) / 100; // ground line on the 120 × 120 canvas
const CX = 60;

export function Bloom({
  streak,
  size = 96,
  frozen = false,
  restored = false,
  label,
  className = "",
}: {
  streak: number;
  size?: number;
  /** On ice: desaturated, in a frost shell, leaves drooping (§7). */
  frozen?: boolean;
  /** Restored today: a small stitched heart on a leaf. */
  restored?: boolean;
  /** Screen-reader text; decorative when omitted. */
  label?: string;
  className?: string;
}) {
  const u = svgId(useId());
  const { stage, step } = growthFor(streak);
  const art = new Art(u, frozen ? 6 : 0);
  const plant = draw(art, stage, step);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <SoftBlur id={`${u}s`} />
      </defs>
      <g style={frozen ? { filter: "saturate(0.6)" } : undefined}>{plant}</g>
      {restored && stage !== "seed" && (
        <path
          d={heartPath(art.heartAt[0], art.heartAt[1], 9)}
          fill="var(--blush)"
          stroke="var(--frost-deep)"
          strokeWidth={1}
          strokeDasharray="1.6 1.4"
        />
      )}
      {frozen && <FrostShell stage={stage} />}
    </svg>
  );
}

/** Collects parts with unique clip ids; `droop` tilts leaves toward the
 *  ground when frozen. */
class Art {
  parts: ReactNode[] = [];
  n = 0;
  heartAt: [number, number] = [CX, 90];
  constructor(
    readonly u: string,
    readonly droop: number,
  ) {}
  id() {
    return `${this.u}p${this.n++}`;
  }
  push(node: ReactNode) {
    this.parts.push(<g key={this.parts.length}>{node}</g>);
  }

  stem(x1: number, y1: number, x2: number, y2: number, bend = 0) {
    const mx = (x1 + x2) / 2 + bend;
    const my = (y1 + y2) / 2;
    this.push(
      <path
        d={`M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`}
        stroke="var(--leaf-deep)"
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }

  /** A leaf from (x, y) pointing at `angle` degrees (−90 is straight up). */
  leaf(x: number, y: number, angle: number, len: number, wid = len * 0.5) {
    const left = angle < -90 || angle > 90;
    const a = angle + (left ? -this.droop : this.droop);
    const t = `translate(${x} ${y}) rotate(${a})`;
    const [l, w] = [n2(len), n2(wid)];
    const d = `M0 0C${n2(l * 0.3)} ${-w} ${n2(l * 0.85)} ${n2(-w * 0.75)} ${l} 0C${n2(l * 0.85)} ${n2(w * 0.75)} ${n2(l * 0.3)} ${w} 0 0Z`;
    const id = this.id();
    this.push(
      <>
        <Puff
          id={id}
          tone="leaf"
          shade={[-1, -1.6]}
          shape={(p) => <path d={d} transform={t} {...p} />}
        />
        <path
          d={`M${len * 0.12} 0L${len * 0.72} 0`}
          transform={t}
          stroke="var(--leaf-deep)"
          strokeOpacity={0.35}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </>,
    );
  }

  flower(cx: number, cy: number, r: number, turn = 0) {
    const id = this.id();
    const c = this.id();
    this.push(
      <>
        <Puff
          id={id}
          tone="p"
          shade={[-r * 0.08, -r * 0.13]}
          shape={(p) =>
            [0, 1, 2, 3, 4].map((i) => {
              const a = ((turn - 90 + i * 72) * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  cx={n2(cx + r * 0.56 * Math.cos(a))}
                  cy={n2(cy + r * 0.56 * Math.sin(a))}
                  r={n2(r * 0.5)}
                  {...(p as object)}
                />
              );
            })
          }
        />
        <Puff
          id={c}
          tone="butter"
          shade={[-r * 0.05, -r * 0.08]}
          shape={(p) => (
            <circle cx={cx} cy={cy} r={r * 0.36} {...(p as object)} />
          )}
        />
        <Shine
          filter={`${this.u}s`}
          cx={cx - r * 0.5}
          cy={cy - r * 0.62}
          rx={r * 0.22}
          ry={r * 0.13}
        />
      </>,
    );
  }

  bud(cx: number, cy: number, s: number) {
    const id = this.id();
    const q = (k: number) => n2(s * k);
    const d = `M${cx} ${n2(cy - s)}C${n2(cx + q(0.75))} ${n2(cy - q(0.35))} ${n2(cx + q(0.7))} ${n2(cy + q(0.45))} ${cx} ${n2(cy + q(0.5))}C${n2(cx - q(0.7))} ${n2(cy + q(0.45))} ${n2(cx - q(0.75))} ${n2(cy - q(0.35))} ${cx} ${n2(cy - s)}Z`;
    this.leaf(cx, cy + s * 0.45, -40, s * 0.75, s * 0.32);
    this.leaf(cx, cy + s * 0.45, -140, s * 0.75, s * 0.32);
    this.push(
      <Puff
        id={id}
        tone="p"
        shade={[-s * 0.08, -s * 0.12]}
        shape={(p) => <path d={d} {...p} />}
      />,
    );
  }

  mound(rx = 24) {
    const id = this.id();
    this.push(
      <Puff
        id={id}
        tone="soil"
        shape={(p) => (
          <path
            d={`M${CX - rx} ${BASE}Q${CX - rx * 0.5} ${BASE - 13} ${CX} ${BASE - 13}Q${CX + rx * 0.5} ${BASE - 13} ${CX + rx} ${BASE}Z`}
            {...p}
          />
        )}
      />,
    );
  }
}

function draw(a: Art, stage: BloomStage, step: number): ReactNode[] {
  switch (stage) {
    case "seed": {
      a.mound(26);
      const id = a.id();
      a.push(
        <>
          <Puff
            id={id}
            tone="wood"
            shape={(p) => (
              <ellipse
                cx={CX}
                cy={BASE - 13}
                rx={6.5}
                ry={4.8}
                transform={`rotate(-20 ${CX} ${BASE - 13})`}
                {...(p as object)}
              />
            )}
          />
          <path
            d={sparklePath(CX + 9, BASE - 26, 4)}
            fill="var(--butter)"
            className="animate-twinkle"
          />
        </>,
      );
      break;
    }
    case "sprout": {
      // Days 1–6: the stem rises, the two round leaves grow, and small
      // notch leaves appear on day 3 and day 5.
      a.mound(22);
      const top = BASE - 24 - step * 4;
      a.stem(CX, BASE - 8, CX, top);
      if (step >= 2) a.leaf(CX, top + 14, -165, 9, 5);
      if (step >= 4) a.leaf(CX, top + 9, -15, 9, 5);
      a.leaf(CX, top, -145, 14 + step * 1.4, 8 + step * 0.6);
      a.leaf(CX, top, -35, 14 + step * 1.4, 8 + step * 0.6);
      a.heartAt = [CX - 12 - step, top - 7];
      break;
    }
    case "bud": {
      // Days 7–14: the bud swells and a leaf joins every other day.
      const top = BASE - 64;
      a.stem(CX, BASE, CX, top, 4);
      a.leaf(CX + 1, BASE - 22, -160, 20, 10);
      a.leaf(CX + 2, BASE - 32, -20, 20, 10);
      if (step >= 2) a.leaf(CX + 2, BASE - 44, -150, 14, 7);
      if (step >= 4) a.leaf(CX + 2, BASE - 50, -30, 13, 6.5);
      if (step >= 6) a.leaf(CX + 1, BASE - 14, -25, 12, 6);
      a.bud(CX, top - 2, 12 + step * 1.1);
      a.heartAt = [CX - 12, BASE - 27];
      break;
    }
    case "bloom": {
      // Days 15–29: the flower opens wider; a side bud and leaves follow.
      const top = BASE - 70;
      a.stem(CX, BASE, CX, top, -4);
      a.leaf(CX - 1, BASE - 20, -160, 21, 10.5);
      a.leaf(CX - 1, BASE - 30, -20, 21, 10.5);
      if (step >= 3) a.leaf(CX - 2, BASE - 44, -150, 15, 7.5);
      if (step >= 6) {
        a.stem(CX - 1, BASE - 46, CX + 18, BASE - 62, 4);
        a.bud(CX + 19, BASE - 66, 6 + Math.min(step - 6, 8) * 0.5);
      }
      if (step >= 10) a.leaf(CX, BASE - 12, -30, 13, 6.5);
      a.flower(CX, top - 2, 27 + step * 0.45, 8);
      a.heartAt = [CX - 13, BASE - 25];
      break;
    }
    case "bouquet": {
      // Days 30–49: three flowers of different sizes, filling out.
      const g = step * 0.25;
      a.stem(CX, BASE, CX - 24, BASE - 54, -6);
      a.stem(CX, BASE, CX + 24, BASE - 60, 6);
      a.stem(CX, BASE, CX, BASE - 76);
      a.leaf(CX, BASE - 18, -160, 20, 10);
      a.leaf(CX, BASE - 24, -20, 20, 10);
      if (step >= 6) a.leaf(CX - 14, BASE - 36, -165, 13, 6.5);
      if (step >= 12) a.leaf(CX + 14, BASE - 40, -15, 13, 6.5);
      a.flower(CX - 25, BASE - 58, 20 + g, 20);
      a.flower(CX + 25, BASE - 64, 22 + g, -12);
      a.flower(CX, BASE - 80, 26 + g, 4);
      if (step >= 16) a.bud(CX + 40, BASE - 40, 6);
      a.heartAt = [CX - 12, BASE - 22];
      break;
    }
    case "bush":
    case "garden": {
      // A round bush that collects one more small flower every few days;
      // the garden adds tall flowers and two butterflies.
      const id = a.id();
      const bush = (
        p: React.SVGProps<SVGPathElement>,
      ): ReactNode =>
        [
          [CX - 26, BASE - 22, 22],
          [CX + 26, BASE - 22, 22],
          [CX, BASE - 38, 28],
          [CX - 14, BASE - 16, 18],
          [CX + 14, BASE - 16, 18],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} {...(p as object)} />
        ));
      if (stage === "garden") {
        a.stem(CX - 30, BASE - 30, CX - 36, BASE - 72, -4);
        a.stem(CX + 30, BASE - 30, CX + 38, BASE - 78, 4);
        a.flower(CX - 36, BASE - 76, 20, 14);
        a.flower(CX + 38, BASE - 82, 21, -10);
      }
      a.push(<Puff id={id} tone="leaf" shade={[-3, -4]} shape={bush} />);
      const spots = [
        [CX, BASE - 54],
        [CX - 24, BASE - 34],
        [CX + 24, BASE - 34],
        [CX - 10, BASE - 22],
        [CX + 12, BASE - 46],
        [CX - 38, BASE - 18],
        [CX + 38, BASE - 18],
        [CX - 14, BASE - 48],
        [CX + 18, BASE - 20],
        [CX - 30, BASE - 46],
        [CX + 32, BASE - 48],
        [CX, BASE - 34],
        [CX - 4, BASE - 8],
        [CX + 44, BASE - 30],
      ];
      const count =
        stage === "bush"
          ? Math.min(spots.length, 5 + Math.floor(step / 5))
          : spots.length;
      spots
        .slice(0, count)
        .forEach(([x, y], i) => a.flower(x, y, 13 + (i % 3) * 2, i * 23));
      a.heartAt = [CX + 30, BASE - 10];
      if (stage === "garden") {
        a.push(<Butterflies />);
        for (let i = 0; i < Math.min(6, Math.floor(step / 10)); i++) {
          a.flower(CX - 50 + i * 20, BASE - 2, 9, i * 40);
        }
      }
      break;
    }
  }
  return a.parts;
}

function Butterflies() {
  const wing = (fill: string) => (
    <g>
      <ellipse cx={-3.5} cy={-2} rx={4} ry={5} fill={fill} transform="rotate(-25 -3.5 -2)" />
      <ellipse cx={3.5} cy={-2} rx={4} ry={5} fill={fill} transform="rotate(25 3.5 -2)" />
      <rect x={-0.8} y={-5} width={1.6} height={8} rx={0.8} fill="var(--plum)" />
    </g>
  );
  return (
    <g
      style={{ transformOrigin: `${CX}px 52px` }}
      className="animate-[spin_14s_linear_infinite]"
    >
      <g transform={`translate(${CX - 34} 34)`}>{wing("var(--lilac)")}</g>
      <g transform={`translate(${CX + 34} 66)`}>{wing("var(--butter)")}</g>
    </g>
  );
}

/** A translucent frost shell with crystal highlights (§7). */
function FrostShell({ stage }: { stage: BloomStage }) {
  const tall = stage === "seed" || stage === "sprout" ? 46 : 96;
  const top = BASE - tall;
  return (
    <g>
      <rect
        x={14}
        y={top}
        width={92}
        height={tall + 2}
        rx={22}
        fill="var(--frost)"
        opacity={0.38}
        stroke="var(--white)"
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
      <path d={`M24 ${top + 14}L32 ${top + 8}`} stroke="var(--white)" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <path d={sparklePath(94, top + 12, 5)} fill="var(--white)" />
      <path d={sparklePath(26, BASE - 14, 3.5)} fill="var(--white)" opacity={0.85} />
    </g>
  );
}
