import type { DayStatus } from "@/lib/engine/types";
import { addDays, type DayKey } from "@/lib/time";

// The heatmap and stats on a profile (PRD 5.4, design §10.11 and §11.4).
// Pure: everything comes from day rows, submissions and runs.

export type Tile =
  | "empty" // future, or before the start with nothing solved
  | "pending" // today, not done yet
  | "bloom" // complete, solved = target
  | "extra" // complete, solved ≥ 1.5 × target
  | "double" // complete, solved ≥ 2 × target
  | "restored"
  | "missed"
  | "preseason"; // solves before the start date

export interface DayRowLite {
  day: DayKey;
  status: DayStatus;
  solved: number;
  target: number;
  makeup: number;
}

export function tileFor(input: {
  day: DayKey;
  today: DayKey;
  startDate: DayKey;
  row?: DayRowLite;
  preseasonSolves?: number;
}): Tile {
  const { day, today, startDate, row } = input;
  if (day > today) return "empty";
  if (day < startDate)
    return (input.preseasonSolves ?? 0) > 0 ? "preseason" : "empty";
  if (!row) return day === today ? "pending" : "missed";
  switch (row.status) {
    case "restored":
      return "restored";
    case "missed":
      return "missed";
    case "pending":
      // A past day still waiting to be finalized looks like today.
      return "pending";
    case "complete": {
      const target = Math.max(1, row.target + row.makeup);
      if (row.solved >= target * 2) return "double";
      if (row.solved >= target * 1.5) return "extra";
      return "bloom";
    }
  }
}

/** Monday-first weeks (columns of 7) covering `weeks` weeks up to today.
 *  Days after today are null so the last column can be partial. */
export function yearWeeks(today: DayKey, weeks = 53): (DayKey | null)[][] {
  // Day of week with Monday = 0, computed from the date itself (IST day
  // keys, no device timezone).
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const firstMonday = addDays(today, -dow - (weeks - 1) * 7);
  const cols: (DayKey | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: (DayKey | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(firstMonday, w * 7 + d);
      col.push(day > today ? null : day);
    }
    cols.push(col);
  }
  return cols;
}

/** The days of a month as a Monday-first grid with leading blanks. */
export function monthGrid(month: string): (DayKey | null)[] {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (DayKey | null)[] = Array.from({ length: lead }, () => null);
  for (let day = first; day.startsWith(month); day = addDays(day, 1)) {
    cells.push(day);
  }
  return cells;
}

export interface SolveLite {
  slug: string;
  day: DayKey;
  counted: boolean;
  difficulty: string | null;
  topics: string[];
}

export interface Stats {
  totalSolved: number;
  easy: number;
  medium: number;
  hard: number;
  bestStreak: number;
  /** Share of finished days that were completed or restored, 0–100. */
  completion: number | null;
  topTopics: { topic: string; count: number }[];
}

export function computeStats(input: {
  rows: DayRowLite[];
  solves: SolveLite[];
  runLengths: number[];
  today: DayKey;
}): Stats {
  // Distinct problems ever solved, counted or pre-season.
  const bySlug = new Map<string, SolveLite>();
  for (const s of input.solves) if (!bySlug.has(s.slug)) bySlug.set(s.slug, s);
  const distinct = [...bySlug.values()];
  const level = (d: string) =>
    distinct.filter((s) => s.difficulty?.toLowerCase() === d).length;

  const topics = new Map<string, number>();
  for (const s of distinct) {
    for (const t of s.topics) topics.set(t, (topics.get(t) ?? 0) + 1);
  }

  const finished = input.rows.filter(
    (r) => r.day < input.today && r.status !== "pending",
  );
  const good = finished.filter(
    (r) => r.status === "complete" || r.status === "restored",
  ).length;

  return {
    totalSolved: distinct.length,
    easy: level("easy"),
    medium: level("medium"),
    hard: level("hard"),
    bestStreak: Math.max(0, ...input.runLengths),
    completion: finished.length
      ? Math.round((good / finished.length) * 100)
      : null,
    topTopics: [...topics]
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
      .slice(0, 6),
  };
}
