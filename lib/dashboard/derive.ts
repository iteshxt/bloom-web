// Pure view model for the duel dashboard (PRD 5.2, design §10.3–10.5, §11.3).
// Everything the page shows is derived here from database rows and `now`, so
// it can be unit-tested and always matches the engine's rules.

import { SYNC_FAILING_AFTER_MS, targetFor } from "@/lib/engine";
import type { DayStatus, TargetChange } from "@/lib/engine/types";
import { xpForLevel } from "@/lib/engine/xp";
import {
  addDays,
  dayEndsAt,
  daysBetween,
  istMidnight,
  istParts,
  type DayKey,
} from "@/lib/time";

export interface DayRow {
  target: number;
  makeupRequired: number;
  solvedCount: number;
  status: DayStatus;
  finalized: boolean;
}

export interface PlayerInput {
  id: string;
  name: string;
  color: string;
  xpTotal: number;
  level: number;
  run: {
    length: number;
    tokensRemaining: number;
    atRiskDay: DayKey | null;
  } | null;
  /** Day rows keyed by day; only today's and yesterday's are needed. */
  days: Record<DayKey, DayRow>;
  targets: TargetChange[];
  lastSyncAt: Date | null;
}

export interface PairInput {
  startDate: DayKey;
  milestones: number[];
  tokensPerRun: number;
  graceMinutes: number;
}

export interface FocusDay {
  day: DayKey;
  /** "yesterday" only during the grace hour while yesterday can still be saved. */
  which: "today" | "yesterday";
  solved: number;
  target: number;
  makeup: number;
  required: number;
  done: boolean;
  /** When this day's countdown runs out: midnight for today, 01:00 for a
   *  grace-hour yesterday. */
  deadline: Date;
  msLeft: number;
}

export interface PlayerView {
  id: string;
  name: string;
  color: string;
  streak: number;
  onIce: boolean;
  atRiskDay: DayKey | null;
  tokens: number;
  tokensMax: number;
  nextMilestone: { milestone: number; daysToGo: number } | null;
  level: number;
  xpIntoLevel: number;
  xpLevelSpan: number;
  focus: FocusDay | null;
  /** Days until the challenge starts, when it hasn't yet. */
  startsInDays: number | null;
  syncFailing: boolean;
}

export function derivePlayer(
  p: PlayerInput,
  pair: PairInput,
  now: Date,
): PlayerView {
  const { day: today, minuteOfDay } = istParts(now);
  const streak = p.run?.length ?? 0;
  const atRiskDay = p.run?.atRiskDay ?? null;
  const started = today >= pair.startDate;

  const nextMilestoneValue = [...pair.milestones]
    .sort((a, b) => a - b)
    .find((m) => m > streak);
  const levelStart = xpForLevel(p.level);

  return {
    id: p.id,
    name: p.name,
    color: p.color,
    streak,
    onIce: atRiskDay !== null,
    atRiskDay,
    tokens: p.run?.tokensRemaining ?? pair.tokensPerRun,
    tokensMax: pair.tokensPerRun,
    nextMilestone:
      nextMilestoneValue === undefined
        ? null
        : {
            milestone: nextMilestoneValue,
            daysToGo: nextMilestoneValue - streak,
          },
    level: p.level,
    xpIntoLevel: p.xpTotal - levelStart,
    xpLevelSpan: xpForLevel(p.level + 1) - levelStart,
    focus: started ? focusDay(p, pair, today, minuteOfDay, now) : null,
    startsInDays: started ? null : daysBetween(today, pair.startDate),
    syncFailing:
      p.lastSyncAt !== null &&
      now.getTime() - p.lastSyncAt.getTime() > SYNC_FAILING_AFTER_MS,
  };
}

function focusDay(
  p: PlayerInput,
  pair: PairInput,
  today: DayKey,
  minuteOfDay: number,
  now: Date,
): FocusDay {
  // Grace hour (design §11.3): yesterday comes first while it can still be saved.
  const yesterday = addDays(today, -1);
  if (minuteOfDay < pair.graceMinutes && yesterday >= pair.startDate) {
    const y = dayView(p, yesterday);
    const row = p.days[yesterday];
    const open = !row || (row.status === "pending" && !row.finalized);
    if (open && !y.done) {
      const deadline = dayEndsAt(yesterday, pair.graceMinutes);
      return {
        ...y,
        which: "yesterday",
        deadline,
        msLeft: deadline.getTime() - now.getTime(),
      };
    }
  }
  const deadline = istMidnight(addDays(today, 1));
  return {
    ...dayView(p, today),
    which: "today",
    deadline,
    msLeft: deadline.getTime() - now.getTime(),
  };
}

function dayView(p: PlayerInput, day: DayKey) {
  const row = p.days[day];
  const target = row?.target ?? targetFor(p.targets, day);
  const makeup = row?.makeupRequired ?? 0;
  const solved = row?.solvedCount ?? 0;
  return {
    day,
    solved,
    target,
    makeup,
    required: target + makeup,
    done: row?.status === "complete" || row?.status === "restored",
  };
}

// ───────── Labels (design §10.3, §14.4) ─────────

/** "3h 12m left", "42m left", or the grace-hour form "Grace hour · 42m". */
export function countdownLabel(focus: FocusDay): string {
  if (focus.done) return "Done for today";
  const mins = Math.max(0, Math.ceil(focus.msLeft / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const left = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return focus.which === "yesterday" ? `Grace hour · ${left}` : `${left} left`;
}

export type Urgency = "calm" | "soon" | "urgent" | "grace" | "done";

/** Peach under 3 h, stronger under 1 h, frost in the grace hour (§10.3). */
export function urgency(focus: FocusDay): Urgency {
  if (focus.done) return "done";
  if (focus.which === "yesterday") return "grace";
  if (focus.msLeft < 60 * 60_000) return "urgent";
  if (focus.msLeft < 3 * 60 * 60_000) return "soon";
  return "calm";
}

export type Banner =
  | { kind: "restore_request"; requestId: string }
  | { kind: "on_ice"; missedDay: DayKey }
  | { kind: "gift_owed"; milestone: number }
  | { kind: "sync_failing" };

/** At most one banner, in priority order: a request to you, your frost,
 *  a gift you owe, then sync trouble (design §10.8). */
export function pickBanner(input: {
  me: PlayerView;
  pendingRequestFromPartner: { id: string } | null;
  /** A partner's milestone reached with no gift chosen yet. */
  giftOwed?: { milestone: number } | null;
}): Banner | null {
  if (input.pendingRequestFromPartner) {
    return {
      kind: "restore_request",
      requestId: input.pendingRequestFromPartner.id,
    };
  }
  if (input.me.onIce && input.me.atRiskDay) {
    return { kind: "on_ice", missedDay: input.me.atRiskDay };
  }
  if (input.giftOwed) {
    return { kind: "gift_owed", milestone: input.giftOwed.milestone };
  }
  if (input.me.syncFailing) return { kind: "sync_failing" };
  return null;
}
