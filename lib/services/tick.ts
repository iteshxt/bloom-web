import "server-only";
import { randomUUID } from "node:crypto";
import {
  ensureToday,
  finalizeOverdue,
  processSubmissions,
  scheduledNotifications,
  type DayKey,
  type Effect,
  type EngineContext,
  type Submission,
} from "@/lib/engine";
import { getRecentAc, LeetCodeError } from "@/lib/leetcode/client";
import { withPlayerLock } from "./lock";
import { deliverNotifications } from "./notify";
import type { SyncOutcome } from "./persist";
import { loadPlayer, type Admin, type LoadedPlayer } from "./player";
import { ensureProblems } from "./problems";
import { saveEngineResult } from "./save";

export interface PlayerTickResult {
  playerId: string;
  status: "ok" | "locked" | "not_ready";
  sync?: "ok" | "failed" | "skipped";
  syncError?: string;
  newSolves?: number;
  finalized?: DayKey[];
  notifications?: number;
}

/** One heartbeat for one player (techspec §9.3): sync LeetCode, finalize
 *  overdue days, create today's row and run the scheduled reminders, then
 *  save it all in one transaction and deliver the new notifications. */
export async function tickPlayer(
  admin: Admin,
  playerId: string,
  now: Date,
): Promise<PlayerTickResult> {
  const run = await withPlayerLock(admin, playerId, "tick", async () => {
    const player = await loadPlayer(admin, playerId);
    if (!player) return { playerId, status: "not_ready" } as const;

    const { subs, sync } = await fetchNewSolves(admin, player, now);
    const ctx: EngineContext = { now, newId: randomUUID };
    const lastSyncSuccessAt = sync?.ok ? now : player.lastSyncSuccessAt;

    const processed = processSubmissions(player.state, subs, ctx);
    const finalized = finalizeOverdue(processed.state, {
      ...ctx,
      lastSyncSuccessAt,
    });
    const today = ensureToday(finalized.state, ctx);
    const reminders = scheduledNotifications(today.state, {
      ...ctx,
      lastSyncSuccessAt,
    });
    const effects: Effect[] = [
      ...processed.effects,
      ...finalized.effects,
      ...today.effects,
      ...reminders.effects,
    ];

    const sent = await saveEngineResult(admin, {
      refs: player,
      state: reminders.state,
      effects,
      submissions: processed.value,
      sync,
      now,
    });
    await deliverNotifications(sent);

    return {
      playerId,
      status: "ok",
      sync: sync ? (sync.ok ? "ok" : "failed") : "skipped",
      syncError: sync?.error,
      newSolves: subs.length,
      finalized: finalized.value,
      notifications: sent.length,
    } as const;
  });

  return run.locked ? { playerId, status: "locked" } : run.value;
}

/** Recent accepted solves not yet stored. A LeetCode failure is recorded as a
 *  failed sync, never thrown (techspec §8). */
async function fetchNewSolves(
  admin: Admin,
  player: LoadedPlayer,
  now: Date,
): Promise<{ subs: Submission[]; sync?: SyncOutcome }> {
  if (!player.leetcodeUsername) return { subs: [] };
  try {
    const recent = await getRecentAc(player.leetcodeUsername);
    const ids = recent.map((r) => r.id);
    const { data: known, error } = ids.length
      ? await admin
          .from("submissions")
          .select("lc_submission_id")
          .eq("player_id", player.playerId)
          .in("lc_submission_id", ids)
      : { data: [], error: null };
    if (error) throw new Error(`Supabase query failed: ${error.message}`);

    const seen = new Set((known ?? []).map((k) => k.lc_submission_id));
    const fresh = recent.filter((r) => !seen.has(r.id));
    const problems = await ensureProblems(
      admin,
      fresh.map((r) => r.slug),
    );
    const subs = fresh.map((r) => ({
      id: r.id,
      slug: r.slug,
      submittedAt: r.submittedAt,
      difficulty: problems[r.slug]?.difficulty,
      topics: problems[r.slug]?.topics ?? [],
    }));
    return { subs, sync: { ok: true, attemptedAt: now } };
  } catch (err) {
    if (!(err instanceof LeetCodeError)) throw err; // database errors fail the tick
    return { subs: [], sync: { ok: false, attemptedAt: now, error: err.code } };
  }
}
