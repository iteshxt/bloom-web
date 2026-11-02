// Scheduled notifications (techspec §9.5), evaluated on every tick. Pure:
// each rule emits at most one notify effect per dedupe key, and the 10-minute
// tick means each fires within 10 minutes of its nominal time.

import { addDays, istParts } from "@/lib/time";
import { activeRun, beginTx, notify } from "./tx";
import {
  required,
  type EngineContext,
  type EngineResult,
  type PlayerState,
} from "./types";

const H = 60;
export const SYNC_FAILING_AFTER_MS = 3 * 60 * 60 * 1000;
const RESTORE_CLOSING_MS = 2 * 60 * 60 * 1000;

export function scheduledNotifications(
  state: PlayerState,
  ctx: EngineContext & { lastSyncSuccessAt?: Date },
): EngineResult<void> {
  const tx = beginTx(state, ctx);
  const { s, now } = tx;
  const { day: today, minuteOfDay: t } = istParts(now);
  const started = today >= s.rules.startDate;

  if (started) {
    const day = s.days[today];
    const solved = day?.solvedSlugs.length ?? 0;
    const need = day ? required(day) : 1;
    const incomplete = day?.status !== "complete";
    if (incomplete && t >= 21 * H && t < 23 * H) {
      notify(tx, "self", "reminder_evening", today, { solved, required: need });
    }
    if (incomplete && t >= 23 * H) {
      notify(tx, "self", "reminder_late", today, { solved, required: need });
    }

    const yesterday = addDays(today, -1);
    const prev = s.days[yesterday];
    const yesterdayOpen =
      yesterday >= s.rules.startDate &&
      (prev === undefined || (prev.status === "pending" && !prev.finalized));
    if (yesterdayOpen && t >= 15 && t < s.rules.graceMinutes) {
      notify(tx, "self", "reminder_grace", yesterday, {
        solved: prev?.solvedSlugs.length ?? 0,
        required: prev ? required(prev) : 1,
        minutesLeft: s.rules.graceMinutes - t,
      });
    }
  }

  const run = activeRun(tx);
  if (run.atRiskDay !== undefined) {
    const missed = run.atRiskDay;
    const live = s.restores.filter(
      (r) =>
        r.runId === run.id &&
        r.missedDay === missed &&
        r.status !== "cancelled",
    );
    // Nudge the player to ask, at 20:00 on the window day.
    if (live.length === 0 && today === addDays(missed, 1) && t >= 20 * H) {
      notify(tx, "self", "restore_ask", missed, { missedDay: missed });
    }
    // Remind the partner when a pending request has 2 h or less left.
    for (const r of live) {
      const left = r.expiresAt.getTime() - now.getTime();
      if (r.status === "pending" && left > 0 && left <= RESTORE_CLOSING_MS) {
        notify(tx, "partner", "restore_closing", r.id, {
          requestId: r.id,
          missedDay: missed,
        });
      }
    }
  }

  if (
    ctx.lastSyncSuccessAt &&
    now.getTime() - ctx.lastSyncSuccessAt.getTime() > SYNC_FAILING_AFTER_MS
  ) {
    notify(tx, "self", "sync_failing", today, {
      lastSuccessAt: ctx.lastSyncSuccessAt.toISOString(),
    });
  }

  return { state: tx.s, effects: tx.effects, value: undefined };
}
