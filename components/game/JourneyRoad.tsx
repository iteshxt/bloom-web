"use client";

import { useEffect, useRef } from "react";
import { Companion } from "@/components/companions/Companion";
import { PuffyIcon } from "@/components/icons/puffy";
import { prefersReducedMotion } from "@/lib/prefs";
import type { Companion as Kind } from "@/lib/validation/onboarding";

// The journey as a garden road (design §11.5): a long vertical scene that
// winds upward from the start. Its scenery changes by stage (meadow, flower
// fields, a pond, a blossom grove, a hilltop garden); each milestone is a
// gift on a pedestal, flagged in the colour of whoever reached it. Both
// creatures stand on their own lane at their current streak, and the road
// scrolls to centre on you when it opens.

export interface Traveller {
  id: string;
  name: string;
  kind: Kind;
  color: string;
  streak: number;
  onIce: boolean;
}

const W = 358;
const PAD_TOP = 70;
const PAD_BOTTOM = 70;

const SECTIONS = [
  { from: 0, to: 15, fill: "var(--leaf)", deco: "meadow" },
  { from: 15, to: 30, fill: "var(--blush)", deco: "fields" },
  { from: 30, to: 50, fill: "var(--sky)", deco: "pond" },
  { from: 50, to: 100, fill: "var(--lilac)", deco: "grove" },
  { from: 100, to: Infinity, fill: "var(--butter)", deco: "garden" },
] as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function JourneyRoad({
  milestones,
  me,
  partner,
  reached,
}: {
  milestones: number[];
  me: Traveller;
  partner: Traveller | null;
  /** Who has ever reached each milestone. */
  reached: (playerId: string, milestone: number) => boolean;
}) {
  const sorted = [...milestones].sort((a, b) => a - b);
  const end =
    Math.max(sorted.at(-1) ?? 15, me.streak, partner?.streak ?? 0) + 8;
  const perDay = Math.min(12, Math.max(4, 1500 / end));
  const H = Math.round(PAD_TOP + PAD_BOTTOM + end * perDay);
  const y = (d: number) => r2(H - PAD_BOTTOM - d * perDay);
  const x = (d: number) => r2(W / 2 + W * 0.28 * Math.sin((d * Math.PI) / 14));

  const pts: string[] = [];
  for (let d = -4; d <= end + 4; d += 0.5) pts.push(`${x(d)} ${y(d)}`);
  const road = `M${pts.join("L")}`;

  const meRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    meRef.current?.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const together = partner && Math.abs(partner.streak - me.streak) < 2;

  return (
    <div
      className="bg-surface shadow-soft relative mx-auto overflow-hidden rounded-xl"
      style={{ width: W, height: H }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="absolute inset-0"
        aria-hidden
      >
        {SECTIONS.map((s) => {
          const top = y(Math.min(s.to, end + 10));
          const bottom = s.from === 0 ? H : y(s.from);
          if (s.from > end) return null;
          return (
            <g key={s.deco}>
              <rect
                x={0}
                y={top}
                width={W}
                height={bottom - top}
                fill={s.fill}
                opacity={0.16}
              />
              <Scenery kind={s.deco} top={top} bottom={bottom} x={x} y={y} />
            </g>
          );
        })}
        <path
          d={road}
          stroke="var(--surface)"
          strokeWidth={34}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.9}
        />
        <g data-player-color={me.color}>
          <path
            d={road}
            transform="translate(-7 0)"
            stroke="var(--p)"
            strokeWidth={3.5}
            strokeDasharray="2 9"
            strokeLinecap="round"
            fill="none"
          />
        </g>
        <g data-player-color={partner?.color ?? "sky"}>
          <path
            d={road}
            transform="translate(7 0)"
            stroke="var(--p)"
            strokeWidth={3.5}
            strokeDasharray="2 9"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>

      <Marker x={x(0)} y={y(0) + 26}>
        <span className="rounded-pill bg-mint-soft text-mint-deep px-3 py-1 text-xs font-semibold">
          Start
        </span>
      </Marker>

      {sorted.map((m, i) => {
        const side = Math.sin((m * Math.PI) / 14) > 0 ? -1 : 1;
        const mine = reached(me.id, m);
        const theirs = partner ? reached(partner.id, m) : false;
        return (
          <Marker key={m} x={x(m) + side * 62} y={y(m)}>
            <div className="flex flex-col items-center">
              <div className="relative">
                <PuffyIcon
                  name={mine ? "giftOpen" : "gift"}
                  size={46}
                  title={`${m}-day gift`}
                />
                <div className="absolute -top-3 -right-5 flex gap-0.5">
                  {mine && <Flag color={me.color} />}
                  {theirs && partner && <Flag color={partner.color} />}
                </div>
              </div>
              <span className="bg-wood rounded-pill -mt-2 h-2.5 w-14" />
              <span
                className={`rounded-pill mt-1 px-2.5 py-0.5 text-xs font-semibold ${
                  mine
                    ? "bg-mint-soft text-mint-deep"
                    : "bg-butter-soft text-butter-deep"
                }`}
              >
                {m} days
                {!mine && i === sorted.findIndex((n) => n > me.streak)
                  ? ` · ${m - me.streak} to go`
                  : ""}
              </span>
            </div>
          </Marker>
        );
      })}

      {partner && (
        <Marker
          x={x(partner.streak) + (together ? 22 : 8)}
          y={y(partner.streak) - 22}
        >
          <Walker t={partner} />
        </Marker>
      )}
      <Marker x={x(me.streak) - (together ? 22 : 8)} y={y(me.streak) - 22}>
        <div ref={meRef}>
          <Walker t={me} you />
        </div>
      </Marker>
    </div>
  );
}

function Marker({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      {children}
    </div>
  );
}

function Walker({ t, you = false }: { t: Traveller; you?: boolean }) {
  return (
    <div
      className="relative flex flex-col items-center"
      data-player-color={t.color}
    >
      {t.onIce && (
        <span className="bg-frost absolute bottom-3 h-3 w-14 rounded-[50%] opacity-80" />
      )}
      <div className={t.onIce ? "" : "animate-[tap_0.6s_ease-in-out_4]"}>
        <Companion
          kind={t.kind}
          mood={t.onIce ? "frozen" : "idle"}
          size={58}
          streak={t.streak}
          label={`${you ? "You" : t.name}, day ${t.streak}`}
        />
      </div>
      <span className="bg-p text-p-deep rounded-pill -mt-1 px-2 text-[11px] font-semibold whitespace-nowrap">
        {you ? "You" : t.name} · {t.streak}
      </span>
    </div>
  );
}

function Flag({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 16 22"
      width={14}
      height={20}
      data-player-color={color}
      aria-hidden
    >
      <path
        d="M3 21V2"
        stroke="var(--mint-deep)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path d="M4 2.5L14 6L4 10Z" fill="var(--p)" />
    </svg>
  );
}

/** Light, stage-specific details along the road edges. */
function Scenery({
  kind,
  top,
  bottom,
  x,
  y,
}: {
  kind: (typeof SECTIONS)[number]["deco"];
  top: number;
  bottom: number;
  x: (d: number) => number;
  y: (d: number) => number;
}) {
  const span = bottom - top;
  const rows = Math.max(1, Math.floor(span / 46));
  const items = Array.from({ length: rows }, (_, i) => {
    const yy = r2(bottom - 24 - i * (span / rows));
    // Opposite the road's bend, so scenery never sits on the path.
    const d = dayAt(yy, y);
    const roadX = x(d);
    const left = roadX > W / 2;
    const xx = r2(left ? 28 + (i % 3) * 14 : W - 28 - (i % 3) * 14);
    return { xx, yy, i };
  });
  return (
    <g>
      {items.map(({ xx, yy, i }) => {
        switch (kind) {
          case "meadow":
            return (
              <path
                key={i}
                d={`M${xx - 5} ${yy}l-2 -8M${xx} ${yy}l1 -10M${xx + 5} ${yy}l3 -7`}
                stroke="var(--leaf-deep)"
                strokeOpacity={0.45}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          case "fields":
            return (
              <g key={i}>
                <circle cx={xx} cy={yy} r={4} fill="var(--blush)" />
                <circle cx={xx + 10} cy={yy + 6} r={3} fill="var(--butter)" />
                <circle cx={xx - 9} cy={yy + 7} r={3} fill="var(--white)" />
              </g>
            );
          case "pond":
            return i % 2 === 0 ? (
              <g key={i}>
                <ellipse
                  cx={xx}
                  cy={yy}
                  rx={30}
                  ry={12}
                  fill="var(--sky)"
                  opacity={0.45}
                />
                <circle cx={xx - 8} cy={yy - 1} r={4.5} fill="var(--leaf)" />
                <circle cx={xx + 9} cy={yy + 3} r={3.5} fill="var(--leaf)" />
              </g>
            ) : (
              <path
                key={i}
                d={`M${xx} ${yy}l0 -12`}
                stroke="var(--leaf-deep)"
                strokeOpacity={0.5}
                strokeWidth={2}
                strokeLinecap="round"
              />
            );
          case "grove":
            return (
              <g key={i}>
                <rect
                  x={xx - 1.5}
                  y={yy - 6}
                  width={3}
                  height={10}
                  fill="var(--wood-deep)"
                  opacity={0.6}
                />
                <circle
                  cx={xx}
                  cy={yy - 12}
                  r={10}
                  fill="var(--lilac)"
                  opacity={0.85}
                />
                <circle cx={xx - 4} cy={yy - 15} r={2} fill="var(--white)" />
                <circle cx={xx + 4} cy={yy - 9} r={1.8} fill="var(--blush)" />
              </g>
            );
          case "garden":
            return (
              <g key={i}>
                {[0, 1, 2, 3, 4].map((k) => (
                  <circle
                    key={k}
                    cx={r2(xx + 4 * Math.cos((k * 72 * Math.PI) / 180))}
                    cy={r2(yy + 4 * Math.sin((k * 72 * Math.PI) / 180))}
                    r={3.5}
                    fill="var(--butter)"
                  />
                ))}
                <circle cx={xx} cy={yy} r={2.5} fill="var(--peach)" />
              </g>
            );
        }
      })}
    </g>
  );
}

/** The day at a given height on the road (inverse of y()). */
function dayAt(yy: number, y: (d: number) => number): number {
  const y0 = y(0);
  const y1 = y(1);
  return (yy - y0) / (y1 - y0);
}
