import type { DayKey } from "@/lib/time";

// Which signature moments (design §12.4) to play when the app opens or
// updates. Pure: it compares what this device has already shown ("seen")
// with the current state. The first run only records a baseline, so
// installing the app never replays history.

export type Moment =
  | { kind: "thaw"; day: DayKey }
  | { kind: "shatter"; day: DayKey; streak: number }
  | { kind: "day"; streak: number }
  | { kind: "rainbow" }
  | { kind: "milestone"; milestone: number }
  | { kind: "level"; level: number }
  | { kind: "ice"; day: DayKey };

export interface Seen {
  doneDay: DayKey | null;
  bothDay: DayKey | null;
  iceDay: DayKey | null;
  level: number;
  milestones: number[];
  /** Restore requests whose answer has been shown. */
  restores: string[];
}

export interface Snapshot {
  today: DayKey;
  /** Today (not a grace-hour yesterday) is complete. */
  doneToday: boolean;
  bothDoneToday: boolean;
  streak: number;
  onIceDay: DayKey | null;
  level: number;
  milestonesReached: number[];
  /** My restore requests that have an answer. */
  answered: {
    id: string;
    day: DayKey;
    status: "approved" | "rejected" | "expired";
    /** The streak the request was protecting. */
    streak: number;
  }[];
}

export function baseline(s: Snapshot): Seen {
  return {
    doneDay: s.doneToday ? s.today : null,
    bothDay: s.bothDoneToday ? s.today : null,
    iceDay: s.onIceDay,
    level: s.level,
    milestones: [...s.milestonesReached],
    restores: s.answered.map((a) => a.id),
  };
}

export function detectMoments(
  seen: Seen | null,
  s: Snapshot,
): { moments: Moment[]; seen: Seen } {
  if (!seen) return { moments: [], seen: baseline(s) };
  const moments: Moment[] = [];
  const next: Seen = {
    ...seen,
    milestones: [...seen.milestones],
    restores: [...seen.restores],
  };

  // A restore answer explains everything after it, so it plays first.
  for (const a of s.answered) {
    if (next.restores.includes(a.id)) continue;
    next.restores.push(a.id);
    moments.push(
      a.status === "approved"
        ? { kind: "thaw", day: a.day }
        : { kind: "shatter", day: a.day, streak: a.streak },
    );
  }

  if (s.doneToday && next.doneDay !== s.today) {
    next.doneDay = s.today;
    moments.push({ kind: "day", streak: s.streak });
  }
  if (s.bothDoneToday && next.bothDay !== s.today) {
    next.bothDay = s.today;
    moments.push({ kind: "rainbow" });
  }

  for (const m of [...s.milestonesReached].sort((a, b) => a - b)) {
    if (next.milestones.includes(m)) continue;
    next.milestones.push(m);
    moments.push({ kind: "milestone", milestone: m });
  }

  if (s.level > next.level) moments.push({ kind: "level", level: s.level });
  next.level = Math.max(next.level, s.level);

  if (s.onIceDay && next.iceDay !== s.onIceDay) {
    moments.push({ kind: "ice", day: s.onIceDay });
  }
  next.iceDay = s.onIceDay;

  return { moments, seen: next };
}
