import "server-only";
import { nextTargetEffectiveDate } from "@/lib/engine";
import type { DayKey } from "@/lib/time";
import { recordEvents } from "./events";
import { withPlayerLock } from "./lock";
import type { Admin } from "./player";

// Daily targets (PRD 4.3, techspec §7.7). Only the partner sets a player's
// target, and it applies from the next IST calendar date. Day rows snapshot
// their target when created, so today is never affected (invariant 10).

export async function setTarget(
  admin: Admin,
  input: { pairId: string; setterId: string; playerId: string; target: number },
): Promise<
  { ok: true; effectiveFrom: DayKey } | { ok: false; error: "locked" }
> {
  const now = new Date();
  const effectiveFrom = nextTargetEffectiveDate(now);

  const run = await withPlayerLock(
    admin,
    input.playerId,
    "target",
    async () => {
      const { error } = await admin.from("daily_targets").upsert(
        {
          pair_id: input.pairId,
          player_id: input.playerId,
          target: input.target,
          effective_from: effectiveFrom,
          set_by: input.setterId,
        },
        { onConflict: "player_id,effective_from" },
      );
      if (error)
        throw new Error(`daily_targets upsert failed: ${error.message}`);

      // Both see it in the feed; the player also gets a push (PRD §7).
      await recordEvents(admin, {
        pairId: input.pairId,
        actorId: input.setterId,
        activity: [
          {
            kind: "target_changed",
            payload: {
              playerId: input.playerId,
              target: input.target,
              effectiveFrom,
            },
          },
        ],
        notifications: [
          {
            player_id: input.playerId,
            kind: "target_changed",
            dedupe_key: `target_changed:${input.playerId}:${effectiveFrom}:${input.target}`,
            data: {
              target: input.target,
              effectiveFrom,
              setBy: input.setterId,
            },
          },
        ],
      });
    },
  );
  return run.locked
    ? { ok: false, error: "locked" }
    : { ok: true, effectiveFrom };
}
