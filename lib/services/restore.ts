import "server-only";
import { randomUUID } from "node:crypto";
import {
  cancelRestore,
  requestRestore,
  respondRestore,
  type ActionResult,
  type EngineError,
  type RestoreRequest,
} from "@/lib/engine";
import { withPlayerLock } from "./lock";
import { deliverNotifications } from "./notify";
import { loadPlayer, type Admin, type LoadedPlayer } from "./player";
import { saveEngineResult } from "./save";

// Restore actions (techspec §7.6). The engine enforces the rules; this layer
// takes the lease lock on the player who missed (invariant 7), loads their
// state, saves the result atomically and delivers notifications.

export type RestoreOutcome =
  | { ok: true; request: RestoreRequest }
  | { ok: false; error: EngineError | "locked" | "not_ready" };

const ERROR_STATUS: Record<EngineError | "locked" | "not_ready", number> = {
  not_at_risk: 409,
  window_closed: 409,
  already_requested: 409,
  request_not_found: 404,
  request_not_pending: 409,
  run_changed: 409,
  locked: 409,
  not_ready: 409,
};

export const ERROR_MESSAGES: Record<
  EngineError | "locked" | "not_ready",
  string
> = {
  not_at_risk: "Your streak isn't on ice, so there's nothing to restore.",
  window_closed: "The restore window has closed.",
  already_requested: "A restore was already asked for this day.",
  request_not_found: "That restore request doesn't exist.",
  request_not_pending: "That request has already been answered.",
  run_changed: "That streak has already moved on.",
  locked: "Bloom is syncing right now. Try again in a moment.",
  not_ready: "Your pair hasn't started yet.",
};

export const statusFor = (error: EngineError | "locked" | "not_ready") =>
  ERROR_STATUS[error];

/** Runs one engine action for `playerId` under their lock and saves it. */
async function act(
  admin: Admin,
  playerId: string,
  purpose: string,
  run: (player: LoadedPlayer, now: Date) => ActionResult<RestoreRequest>,
): Promise<RestoreOutcome> {
  const now = new Date();
  const locked = await withPlayerLock(admin, playerId, purpose, async () => {
    const player = await loadPlayer(admin, playerId);
    if (!player) return { ok: false, error: "not_ready" } as const;
    const result = run(player, now);
    if (!result.ok) return { ok: false, error: result.error } as const;
    const sent = await saveEngineResult(admin, {
      refs: player,
      state: result.state,
      effects: result.effects,
      submissions: [],
      now,
    });
    await deliverNotifications(admin, sent);
    return { ok: true, request: result.value } as const;
  });
  return locked.locked ? { ok: false, error: "locked" } : locked.value;
}

const ctx = (now: Date) => ({ now, newId: randomUUID });

export function requestRestoreFor(
  admin: Admin,
  playerId: string,
  message?: string,
) {
  return act(admin, playerId, "restore_request", (p, now) =>
    requestRestore(p.state, ctx(now), { message }),
  );
}

export function cancelRestoreFor(
  admin: Admin,
  playerId: string,
  requestId: string,
) {
  return act(admin, playerId, "restore_cancel", (p, now) =>
    cancelRestore(p.state, ctx(now), requestId),
  );
}

/** The approver answers. The engine runs on the requester's state, so the
 *  requester's lock is taken. */
export async function respondRestoreFor(
  admin: Admin,
  input: {
    approverId: string;
    requestId: string;
    approve: boolean;
    reply?: string;
  },
): Promise<RestoreOutcome | { ok: false; error: "forbidden" }> {
  const { data: request, error } = await admin
    .from("restore_requests")
    .select("player_id, approver_id")
    .eq("id", input.requestId)
    .maybeSingle();
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  if (!request) return { ok: false, error: "request_not_found" };
  // Only the partner answers a restore (invariant 9).
  if (request.approver_id !== input.approverId)
    return { ok: false, error: "forbidden" };

  const [{ count, error: countError }, { data: badges, error: badgeError }] =
    await Promise.all([
      admin
        .from("restore_requests")
        .select("id", { count: "exact", head: true })
        .eq("approver_id", input.approverId)
        .eq("status", "approved"),
      admin
        .from("badges_earned")
        .select("badge_key")
        .eq("player_id", input.approverId),
    ]);
  if (countError || badgeError) {
    throw new Error(
      `Supabase query failed: ${(countError ?? badgeError)?.message}`,
    );
  }

  return act(admin, request.player_id, "restore_respond", (p, now) =>
    respondRestore(p.state, ctx(now), {
      requestId: input.requestId,
      approve: input.approve,
      reply: input.reply,
      approver: {
        approvalsGiven: count ?? 0,
        badges: (badges ?? []).map((b) => b.badge_key),
      },
    }),
  );
}
