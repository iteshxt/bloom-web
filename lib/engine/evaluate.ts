// Day completion and finalization (PRD 4.5–4.6, techspec §7.3 and §7.5).
//
// Completion and counting are separate steps. A day becomes `complete` live,
// as soon as it has enough distinct solves (unless the run is on ice). It is
// then *attached* to the active run only when every earlier day of the run is
// settled, so run length, XP and milestones always advance in day order, even
// when a later day fills up first (a grace-hour duplicate) or when a sync
// catches up after downtime.

import { addDays, dayEndsAt, type DayKey } from "@/lib/time";
import { onStreakLength } from "./milestones";
import {
  activeRun,
  activity,
  addXp,
  awardBadge,
  beginTx,
  ensureDay,
  notify,
  startRun,
  type Tx,
} from "./tx";
import { DAY_COMPLETE_XP, MAKEUP_COMPLETE_XP } from "./xp";
import {
  required,
  type Day,
  type EngineContext,
  type EngineResult,
  type PlayerState,
  type Run,
  type RunEndReason,
} from "./types";

/** Grace for late syncs before a day is finalized with what we have. */
export const FINALIZE_FALLBACK_MS = 6 * 60 * 60 * 1000;

/** Marks a pending day complete once it has enough distinct solves. While
 *  the run is on ice, completion is held until the restore resolves. */
export function markComplete(tx: Tx, d: Day): void {
  if (d.status !== "pending") return;
  if (activeRun(tx).atRiskDay !== undefined) return;
  if (d.solvedSlugs.length < required(d)) return;
  d.status = "complete";
  d.completedAt = tx.now;
}

const nextExpectedDay = (run: Run): DayKey =>
  run.lastCountedDay ? addDays(run.lastCountedDay, 1) : run.startedOn;

/** Counts settled days into the active run, in order, until the first gap. */
export function advance(tx: Tx): void {
  for (;;) {
    const run = activeRun(tx);
    const d = tx.s.days[nextExpectedDay(run)];
    if (!d || d.runId !== undefined) return;
    markComplete(tx, d);
    if (d.status !== "complete") return;
    attach(tx, run, d);
  }
}

function attach(tx: Tx, run: Run, d: Day): void {
  d.runId = run.id;
  run.length += 1;
  run.lastCountedDay = d.day;

  addXp(tx, DAY_COMPLETE_XP, "day_complete", d.day);
  if (d.makeupRequired > 0) {
    addXp(tx, MAKEUP_COMPLETE_XP, "makeup_complete", d.day);
    awardBadge(tx, "comeback");
  }
  notify(tx, "partner", "partner_done", d.day, { day: d.day });
  activity(tx, "day_complete", {
    day: d.day,
    solved: d.solvedSlugs.length,
    required: required(d),
    streak: run.length,
  });
  onStreakLength(tx, run, d.day);
}

export function endRun(
  tx: Tx,
  run: Run,
  endedOn: DayKey,
  reason: RunEndReason,
  notifyBroken: boolean,
): void {
  run.endedOn = endedOn;
  run.endReason = reason;
  run.atRiskDay = undefined;
  // A 0-day run ending isn't news: no feed entry and no push.
  if (run.length === 0) return;
  activity(tx, "run_ended", {
    runId: run.id,
    length: run.length,
    reason,
    endedOn,
  });
  if (notifyBroken) {
    notify(tx, "both", "streak_broken", run.id, { length: run.length, reason });
  }
}

/** Starts a fresh run on `day` and counts any days that already settled. */
export function beginRun(tx: Tx, day: DayKey): Run {
  const run = startRun(tx, day);
  advance(tx);
  return run;
}

/** Can day D be finalized? Only after it ends, and once a sync has run after
 *  the boundary (so grace-hour solves are in) or 6 h have passed. */
export function canFinalize(
  day: DayKey,
  now: Date,
  lastSyncSuccessAt: Date | undefined,
  graceMinutes: number,
): boolean {
  const ends = dayEndsAt(day, graceMinutes).getTime();
  if (now.getTime() < ends) return false;
  if (lastSyncSuccessAt && lastSyncSuccessAt.getTime() >= ends) return true;
  return now.getTime() >= ends + FINALIZE_FALLBACK_MS;
}

export function finalizeDay(tx: Tx, D: DayKey): void {
  const d = ensureDay(tx, D);
  if (d.finalized) return;
  const { rules } = tx.s;
  let run = activeRun(tx);

  // 1) The restore window for yesterday's miss closes with day D.
  if (run.atRiskDay !== undefined && run.atRiskDay === addDays(D, -1)) {
    const missed = run.atRiskDay;
    const pending = tx.s.restores.find(
      (r) =>
        r.missedDay === missed && r.runId === run.id && r.status === "pending",
    );
    if (pending) {
      pending.status = "expired";
      activity(tx, "restore_expired", {
        requestId: pending.id,
        missedDay: missed,
      });
    }
    endRun(tx, run, missed, pending ? "restore_expired" : "missed", true);
    run = beginRun(tx, D); // released from hold; D may count right away
    if (d.status === "complete") {
      d.finalized = true;
      return;
    }
  }

  if (d.status === "complete") {
    d.finalized = true;
    return;
  }

  // 2) D ended incomplete.
  const prev = tx.s.days[addDays(D, -1)];
  if (prev?.status === "restored" && prev.runId === run.id) {
    // The restore didn't stick (PRD 4.6.5–4.6.6): undo it, with or without
    // make-up. The token stays spent and no second restore is offered.
    d.status = "missed";
    d.runId = run.id;
    prev.status = "missed";
    run.length -= 1;
    run.lastCountedDay = run.length > 0 ? addDays(D, -2) : undefined;
    d.finalized = true;
    endRun(tx, run, D, "makeup_failed", true);
    beginRun(tx, addDays(D, 1));
    return;
  }

  d.status = "missed";
  d.runId = run.id;
  d.finalized = true;

  if (run.tokensRemaining === 0 || run.length === 0) {
    endRun(
      tx,
      run,
      D,
      run.tokensRemaining === 0 ? "no_tokens" : "missed",
      true,
    );
    beginRun(tx, addDays(D, 1));
    return;
  }

  // On ice: the restore window runs until the end of D+1.
  run.atRiskDay = D;
  holdLaterDays(tx, D);
  const windowEndsAt = dayEndsAt(addDays(D, 1), rules.graceMinutes);
  notify(tx, "self", "streak_on_ice", D, {
    missedDay: D,
    windowEndsAt: windowEndsAt.toISOString(),
    tokensRemaining: run.tokensRemaining,
  });
  activity(tx, "streak_on_ice", { missedDay: D });
}

/** A later day that filled up before D was missed hasn't been counted yet;
 *  put it back on hold until the restore resolves (PRD 4.5 exception). */
function holdLaterDays(tx: Tx, D: DayKey): void {
  for (const day of Object.values(tx.s.days)) {
    if (day.day > D && day.status === "complete" && day.runId === undefined) {
      day.status = "pending";
      day.completedAt = undefined;
    }
  }
}

/** Finalizes every overdue day in ascending order (CLAUDE.md invariant 8).
 *  Catching up after downtime gives the same result as never going down. */
export function finalizeOverdue(
  state: PlayerState,
  ctx: EngineContext & { lastSyncSuccessAt?: Date },
): EngineResult<DayKey[]> {
  const tx = beginTx(state, ctx);
  const { rules } = tx.s;
  const finalized: DayKey[] = [];
  let D = tx.s.lastFinalizedDay
    ? addDays(tx.s.lastFinalizedDay, 1)
    : rules.startDate;

  while (canFinalize(D, ctx.now, ctx.lastSyncSuccessAt, rules.graceMinutes)) {
    finalizeDay(tx, D);
    tx.s.lastFinalizedDay = D;
    finalized.push(D);
    D = addDays(D, 1);
  }
  return { state: tx.s, effects: tx.effects, value: finalized };
}
