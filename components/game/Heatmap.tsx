"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { heartPath, sparklePath } from "@/components/icons/geometry";
import { LineIcon } from "@/components/icons/line";
import { spring } from "@/lib/motion";
import {
  monthGrid,
  tileFor,
  yearWeeks,
  type DayRowLite,
  type Tile,
} from "@/lib/game/heatmap";
import type { DayKey } from "@/lib/time";

// The heatmap (design §10.11, §11.4): a year of 14 px squircles, GitHub
// style, or a month of 40 px tiles with the date inside. Tiles use the
// player's colour; states differ by pattern too, never colour alone.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const LABEL: Record<Tile, string> = {
  empty: "nothing yet",
  pending: "today, in progress",
  bloom: "bloomed",
  extra: "extra bloom",
  double: "double bloom",
  restored: "restored",
  missed: "missed",
  preseason: "pre-season solves",
};

export function Heatmap({
  today,
  startDate,
  rows,
  preseason,
  onSelect,
}: {
  today: DayKey;
  startDate: DayKey;
  rows: DayRowLite[];
  /** Solves per day before the start date. */
  preseason: Record<DayKey, number>;
  onSelect: (day: DayKey) => void;
}) {
  const [mode, setMode] = useState<"year" | "month">("year");
  const [month, setMonth] = useState(today.slice(0, 7));
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const tile = (day: DayKey) =>
    tileFor({
      day,
      today,
      startDate,
      row: byDay.get(day),
      preseasonSolves: preseason[day],
    });

  return (
    <section className="bg-surface shadow-soft flex flex-col gap-3 rounded-lg p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">
          {mode === "year" ? "This year" : monthTitle(month)}
        </h2>
        <div
          role="radiogroup"
          aria-label="Heatmap view"
          className="bg-cloud rounded-pill flex gap-1 p-1"
        >
          {(["month", "year"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-pill relative h-9 px-3 text-sm font-semibold ${mode === m ? "text-p-deep" : "text-ink-2"}`}
            >
              {mode === m && (
                <motion.span
                  layoutId="heat-mode"
                  className="bg-p rounded-pill absolute inset-0"
                  transition={spring.soft}
                />
              )}
              <span className="relative">
                {m === "year" ? "Year" : "Month"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mode === "year" ? (
        <YearGrid today={today} tile={tile} onSelect={onSelect} />
      ) : (
        <MonthGrid
          month={month}
          today={today}
          tile={tile}
          onSelect={onSelect}
          onMonth={(delta) => setMonth(shiftMonth(month, delta))}
          canNext={month < today.slice(0, 7)}
        />
      )}

      <ul
        className="text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        aria-label="Legend"
      >
        {(["bloom", "extra", "restored", "missed"] as const).map((t) => (
          <li key={t} className="flex items-center gap-1">
            <TileBox state={t} size={12} />
            {t === "bloom"
              ? "Bloomed"
              : t === "extra"
                ? "Extra bloom"
                : t === "restored"
                  ? "Restored"
                  : "Missed"}
          </li>
        ))}
      </ul>
    </section>
  );
}

function YearGrid({
  today,
  tile,
  onSelect,
}: {
  today: DayKey;
  tile: (d: DayKey) => Tile;
  onSelect: (d: DayKey) => void;
}) {
  const weeks = yearWeeks(today);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start at the most recent weeks.
    if (scroller.current)
      scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);
  return (
    <div className="flex gap-1.5">
      <div
        className="text-ink-3 grid shrink-0 grid-rows-[14px_repeat(7,14px)] gap-1 text-[10px] leading-[14px]"
        aria-hidden
      >
        <span />
        {["M", "", "W", "", "F", "", ""].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div
        ref={scroller}
        className="no-scrollbar -mr-2 overflow-x-auto pr-2 pb-1"
      >
        <div className="flex gap-1">
          {weeks.map((col, w) => {
            const first =
              col.find((d) => d && d.endsWith("-01")) ??
              (w === 0 ? col[0] : null);
            return (
              <div
                key={w}
                className="grid grid-rows-[14px_repeat(7,14px)] gap-1"
              >
                <span
                  className="text-ink-3 h-[14px] w-[14px] overflow-visible text-[10px] leading-[14px] whitespace-nowrap"
                  aria-hidden
                >
                  {first ? MONTHS[Number(first.slice(5, 7)) - 1] : ""}
                </span>
                {col.map((day, i) =>
                  day ? (
                    <button
                      key={day}
                      type="button"
                      onClick={() => onSelect(day)}
                      aria-label={`${day}: ${LABEL[tile(day)]}`}
                      className="rounded-tile"
                    >
                      <TileBox state={tile(day)} size={14} />
                    </button>
                  ) : (
                    <span key={i} />
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  today,
  tile,
  onSelect,
  onMonth,
  canNext,
}: {
  month: string;
  today: DayKey;
  tile: (d: DayKey) => Tile;
  onSelect: (d: DayKey) => void;
  onMonth: (delta: number) => void;
  canNext: boolean;
}) {
  const cells = monthGrid(month);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonth(-1)}
          className="text-ink-2 rounded-pill flex h-11 w-11 items-center justify-center"
        >
          <LineIcon name="back" />
        </button>
        <div
          className="text-ink-3 grid flex-1 grid-cols-7 text-center text-xs"
          aria-hidden
        >
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => onMonth(1)}
          className="text-ink-2 rounded-pill flex h-11 w-11 items-center justify-center disabled:opacity-30"
        >
          <LineIcon name="next" />
        </button>
      </div>
      {/* swipe sideways to change month */}
      <motion.div
        key={month}
        className="grid touch-pan-y grid-cols-7 gap-1.5 px-11"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (info.offset.x > 60) onMonth(-1);
          else if (info.offset.x < -60 && canNext) onMonth(1);
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {cells.map((day, i) =>
          day ? (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-label={`${day}: ${LABEL[tile(day)]}`}
              className="relative flex aspect-square items-center justify-center"
            >
              <TileBox state={tile(day)} size={40} />
              <span
                className={`absolute text-xs font-semibold ${
                  ["double", "extra"].includes(tile(day))
                    ? "text-p-deep"
                    : day === today
                      ? "text-p-ink"
                      : "text-ink-2"
                }`}
              >
                {Number(day.slice(8))}
              </span>
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </motion.div>
    </div>
  );
}

/** One squircle tile. Patterns back up colour (design §15). */
export function TileBox({ state, size }: { state: Tile; size: number }) {
  const r = size * 0.3;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    "aria-hidden": true,
  } as const;
  switch (state) {
    case "empty":
      return (
        <svg {...common}>
          <rect x={1} y={1} width={18} height={18} rx={6} fill="var(--line)" />
        </svg>
      );
    case "pending":
      return (
        <svg
          {...common}
          className="animate-pulse-soft [animation-duration:2.4s]"
        >
          <rect
            x={1.5}
            y={1.5}
            width={17}
            height={17}
            rx={6}
            fill="none"
            stroke="var(--p)"
            strokeWidth={2.4}
          />
        </svg>
      );
    case "missed":
      return (
        <svg {...common}>
          <rect
            x={1.5}
            y={1.5}
            width={17}
            height={17}
            rx={6}
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth={1.5}
            strokeDasharray="3 2.4"
          />
        </svg>
      );
    case "preseason":
      return (
        <svg {...common}>
          <rect x={1} y={1} width={18} height={18} rx={6} fill="var(--line)" />
          <circle cx={10} cy={10} r={3.4} fill="var(--butter)" />
        </svg>
      );
    default: {
      const opacity = state === "double" ? 1 : state === "extra" ? 0.8 : 0.55;
      return (
        <svg {...common} style={{ borderRadius: r }}>
          <rect
            x={1}
            y={1}
            width={18}
            height={18}
            rx={6}
            fill="var(--p)"
            opacity={opacity}
          />
          {state === "double" && (
            <path d={sparklePath(14, 6, 3)} fill="var(--white)" />
          )}
          {state === "restored" && (
            <path
              d={heartPath(10, 10.5, 10)}
              fill="none"
              stroke="var(--frost-deep)"
              strokeWidth={1.3}
              strokeDasharray="1.6 1.2"
            />
          )}
        </svg>
      );
    }
  }
}

function shiftMonth(month: string, delta: number): string {
  let y = Number(month.slice(0, 4));
  let m = Number(month.slice(5, 7)) - 1 + delta;
  y += Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function monthTitle(month: string): string {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}
