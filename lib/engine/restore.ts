// Restore actions (PRD 4.6, techspec §7.6). Services check who is acting
// (only the player who missed requests or cancels; only the partner responds)
// and take the lease lock; these functions enforce the game rules.

import { addDays, dayEndsAt } from "@/lib/time";
import { advance, beginRun, endRun } from "./evaluate";
import { onStreakLength } from "./milestones";
import { activeRun, activity, beginTx, ensureDay, notify } from "./tx";
import type {
  ActionResult,
  EngineContext,
  PlayerState,
  RestoreRequest,
} from "./types";

export const MAX_MESSAGE_LENGTH = 280;
const BIG_HEART_APPROVALS = 3;

export function requestRestore(
  state: PlayerState,
  ctx: EngineContext,
  input: { message?: string },
): ActionResult<RestoreRequest> {
  const tx = beginTx(state, ctx);
  const run = activeRun(tx);
  const missedDay = run.atRiskDay;
  if (missedDay === undefined) return { ok: false, error: "not_at_risk" };

  const expiresAt = dayEndsAt(addDays(missedDay, 1), tx.s.rules.graceMinutes);
  if (ctx.now.getTime() >= expiresAt.getTime()) {
    return { ok: false, error: "window_closed" };
  }
  // One live request per missed day; a cancelled one may be replaced.
  if (
    tx.s.restores.some(
      (r) =>
        r.missedDay === missedDay &&
        r.runId === run.id &&
        r.status !== "cancelled",
    )
  ) {
    return { ok: false, error: "already_requested" };
  }

  const request: RestoreRequest = {
    id: ctx.newId(),
    runId: run.id,
    missedDay,
    message: input.message,
    status: "pending",
    expiresAt,
    createdAt: ctx.now,
  };
  tx.s.restores.push(request);
  notify(tx, "partner", "restore_requested", request.id, {
    requestId: request.id,
    missedDay,
    message: input.message ?? null,
    tokensRemaining: run.tokensRemaining,
  });
  activity(tx, "restore_requested", { requestId: request.id, missedDay });
  return { ok: true, state: tx.s, effects: tx.effects, value: request };
}

/** A pending request can be cancelled by the player who sent it. */
export function cancelRestore(
  state: PlayerState,
  ctx: EngineContext,
  requestId: string,
): ActionResult<RestoreRequest> {
  const tx = beginTx(state, ctx);
  const request = tx.s.restores.find((r) => r.id === requestId);
  if (!request) return { ok: false, error: "request_not_found" };
  if (request.status !== "pending")
    return { ok: false, error: "request_not_pending" };

  request.status = "cancelled";
  activity(tx, "restore_cancelled", {
    requestId,
    missedDay: request.missedDay,
  });
  return { ok: true, state: tx.s, effects: tx.effects, value: request };
}

/** The partner approves or rejects. `state` is the requesting player's state;
 *  `approver` is what the engine needs to know about the partner. */
export function respondRestore(
  state: PlayerState,
  ctx: EngineContext,
  input: {
    requestId: string;
    approve: boolean;
    reply?: string;
    approver: { approvalsGiven: number; badges: string[] };
  },
): ActionResult<RestoreRequest> {
  const tx = beginTx(state, ctx);
  const request = tx.s.restores.find((r) => r.id === input.requestId);
  if (!request) return { ok: false, error: "request_not_found" };
  if (request.status !== "pending")
    return { ok: false, error: "request_not_pending" };
  if (ctx.now.getTime() >= request.expiresAt.getTime()) {
    return { ok: false, error: "window_closed" };
  }
  const run = activeRun(tx);
  if (run.id !== request.runId || run.atRiskDay !== request.missedDay) {
    return { ok: false, error: "run_changed" };
  }

  const missed = request.missedDay;
  request.status = input.approve ? "approved" : "rejected";
  request.responseMessage = input.reply;
  request.respondedAt = ctx.now;

  if (input.approve) {
    const missedRow = ensureDay(tx, missed);
    run.tokensRemaining -= 1;
    run.restoresUsed += 1;
    run.atRiskDay = undefined;
    missedRow.status = "restored";
    missedRow.runId = run.id;
    run.length += 1;
    run.lastCountedDay = missed;

    const makeup = tx.s.rules.makeupEnabled ? missedRow.target : 0;
    if (makeup > 0) ensureDay(tx, addDays(missed, 1)).makeupRequired = makeup;

    activity(tx, "restore_approved", {
      requestId: request.id,
      missedDay: missed,
      makeup,
    });
    onStreakLength(tx, run, missed); // a restored day can reach a milestone
    advance(tx); // the window day is released from hold

    const approvals = input.approver.approvalsGiven + 1;
    if (
      approvals >= BIG_HEART_APPROVALS &&
      !input.approver.badges.includes("big_heart")
    ) {
      tx.effects.push({ kind: "badge", key: "big_heart", player: "partner" });
      notify(tx, "partner", "badge_earned", "big_heart:approver", {
        badge: "big_heart",
      });
    }
    notify(tx, "self", "restore_answered", request.id, {
      requestId: request.id,
      approved: true,
      makeup,
      reply: input.reply ?? null,
    });
  } else {
    // The streak ends; the reply notification already says a new seed is
    // planted, so there is no separate streak_broken push.
    activity(tx, "restore_rejected", {
      requestId: request.id,
      missedDay: missed,
    });
    endRun(tx, run, missed, "restore_rejected", false);
    beginRun(tx, addDays(missed, 1));
    notify(tx, "self", "restore_answered", request.id, {
      requestId: request.id,
      approved: false,
      reply: input.reply ?? null,
    });
  }

  return { ok: true, state: tx.s, effects: tx.effects, value: request };
}
