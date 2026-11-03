"use client";

import { useState } from "react";
import { PuffyIcon } from "@/components/icons/puffy";
import { Chip, StatChip } from "@/components/ui/Chip";
import { SectionTitle } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { humanizeSlug, istClock, shortDate } from "@/lib/format/ist";
import { computeStats, tileFor } from "@/lib/game/heatmap";
import { usePlayerHistory, useRestoreHistory } from "@/lib/game/queries";
import type { DayKey } from "@/lib/time";
import { Heatmap } from "./Heatmap";

// A profile's history (PRD 5.4, design §11.4): stat chips, the difficulty
// split as three little jars, top topics, the heatmap, and a sheet with a
// day's details when a tile is tapped.

export function ProfileHistory({
  playerId,
  name,
  color,
  streak,
  today,
  startDate,
}: {
  playerId: string;
  name: string;
  color: string;
  streak: number;
  today: DayKey;
  startDate: DayKey;
}) {
  const history = usePlayerHistory(playerId);
  const restores = useRestoreHistory();
  const [open, setOpen] = useState<DayKey | null>(null);

  if (!history.data) {
    return history.isError ? (
      <p className="text-ink-2">Couldn’t load the history. Try again.</p>
    ) : (
      <>
        <Skeleton className="h-16" />
        <Skeleton className="h-44 rounded-lg" />
      </>
    );
  }

  const { rows, solves, runLengths } = history.data;
  const stats = computeStats({ rows, solves, runLengths, today });
  const preseason: Record<DayKey, number> = {};
  for (const s of solves) {
    if (s.day < startDate) preseason[s.day] = (preseason[s.day] ?? 0) + 1;
  }
  const row = open ? rows.find((r) => r.day === open) : undefined;
  const daySolves = open ? solves.filter((s) => s.day === open) : [];
  const restore = open
    ? restores.data?.find(
        (r) => r.playerId === playerId && r.missedDay === open,
      )
    : undefined;
  const tile = open
    ? tileFor({
        day: open,
        today,
        startDate,
        row,
        preseasonSolves: preseason[open],
      })
    : "empty";

  return (
    <>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <StatChip icon="bloom" value={streak} label="day streak" />
        <StatChip icon="trophy" value={stats.bestStreak} label="best streak" />
        <StatChip icon="check" value={stats.totalSolved} label="solved" />
        <StatChip
          icon="calendar"
          value={stats.completion === null ? "—" : `${stats.completion}%`}
          label="days done"
        />
      </div>

      <Heatmap
        today={today}
        startDate={startDate}
        rows={rows}
        preseason={preseason}
        onSelect={setOpen}
      />

      <section className="flex flex-col gap-3">
        <SectionTitle>Difficulty</SectionTitle>
        <div className="bg-surface shadow-soft grid grid-cols-3 gap-3 rounded-lg p-4">
          <Jar
            label="Easy"
            count={stats.easy}
            total={stats.totalSolved}
            tone="mint"
          />
          <Jar
            label="Medium"
            count={stats.medium}
            total={stats.totalSolved}
            tone="butter"
          />
          <Jar
            label="Hard"
            count={stats.hard}
            total={stats.totalSolved}
            tone="blush"
          />
        </div>
        {stats.topTopics.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Top topics">
            {stats.topTopics.map((t) => (
              <Chip key={t.topic} tone="muted">
                {humanizeSlug(t.topic)} · {t.count}
              </Chip>
            ))}
          </div>
        )}
      </section>

      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? shortDate(open) : ""}
        color={color}
      >
        {open && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex flex-wrap gap-2">
              <Chip tone={STATUS_TONE[tile]}>{STATUS_TEXT[tile]}</Chip>
              {row && (
                <Chip tone="muted">
                  Target {row.target}
                  {row.makeup ? ` + ${row.makeup} make-up` : ""}
                </Chip>
              )}
            </div>
            {daySolves.length === 0 ? (
              <p className="text-ink-2">
                {open > today
                  ? "This day hasn’t happened yet."
                  : `No solves from ${name} this day.`}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {daySolves.map((s) => (
                  <li
                    key={s.submittedAt + s.slug}
                    className="bg-cloud flex items-center gap-2 rounded-md px-3 py-2.5"
                  >
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{s.title}</span>
                      <span className="text-ink-2 text-xs">
                        {istClock(s.submittedAt)}
                        {!s.counted && s.day >= startDate
                          ? " · already counted"
                          : ""}
                        {s.day < startDate ? " · pre-season" : ""}
                      </span>
                    </span>
                    {s.difficulty && (
                      <Chip
                        tone={DIFF_TONE[s.difficulty.toLowerCase()] ?? "muted"}
                      >
                        {s.difficulty}
                      </Chip>
                    )}
                    {s.xp > 0 && (
                      <span className="text-butter-ink text-sm font-semibold">
                        +{s.xp}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {restore && (
              <p className="bg-frost-soft text-frost-deep flex items-center gap-2 rounded-md p-3 text-sm font-semibold">
                <PuffyIcon name="ice" size={32} className="shrink-0" />
                Restore{" "}
                {restore.status === "approved"
                  ? "approved"
                  : restore.status === "pending"
                    ? "requested"
                    : restore.status === "rejected"
                      ? "declined"
                      : restore.status}
                {restore.message ? `: “${restore.message}”` : ""}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

const STATUS_TEXT = {
  empty: "Nothing yet",
  pending: "In progress",
  bloom: "Bloomed",
  extra: "Extra bloom",
  double: "Double bloom",
  restored: "Restored",
  missed: "Missed",
  preseason: "Pre-season",
} as const;

const STATUS_TONE = {
  empty: "muted",
  pending: "p",
  bloom: "mint",
  extra: "mint",
  double: "mint",
  restored: "frost",
  missed: "peach",
  preseason: "butter",
} as const;

const DIFF_TONE: Record<string, "mint" | "butter" | "blush"> = {
  easy: "mint",
  medium: "butter",
  hard: "blush",
};

/** design §11.4: a puffy jar that fills to its share. */
function Jar({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "mint" | "butter" | "blush";
}) {
  const pct = total ? count / total : 0;
  const fill = {
    mint: "var(--mint)",
    butter: "var(--butter)",
    blush: "var(--blush)",
  }[tone];
  const deep = {
    mint: "var(--mint-deep)",
    butter: "var(--butter-deep)",
    blush: "var(--blush-deep)",
  }[tone];
  const h = Math.round(46 * pct);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 48 64" width={48} height={64} aria-hidden>
        <rect
          x={14}
          y={4}
          width={20}
          height={7}
          rx={3}
          fill={deep}
          opacity={0.35}
        />
        <path
          d="M10 14Q10 10 14 10H34Q38 10 38 14V54Q38 60 32 60H16Q10 60 10 54Z"
          fill="var(--cloud)"
          stroke={deep}
          strokeOpacity={0.25}
          strokeWidth={2}
        />
        <clipPath id={`jar-${tone}`}>
          <path d="M11 15Q11 11 15 11H33Q37 11 37 15V54Q37 59 32 59H16Q11 59 11 54Z" />
        </clipPath>
        <rect
          x={10}
          y={59 - h}
          width={28}
          height={h}
          fill={fill}
          clipPath={`url(#jar-${tone})`}
        />
        <ellipse
          cx={17}
          cy={22}
          rx={2.5}
          ry={6}
          fill="var(--white)"
          opacity={0.5}
        />
      </svg>
      <span className="font-display tabular text-lg leading-none font-bold">
        {count}
      </span>
      <span className="text-ink-2 text-xs">{label}</span>
    </div>
  );
}
