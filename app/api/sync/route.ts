import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { tickPlayer } from "@/lib/services/tick";

// "Sync now" (techspec §10): an on-demand tick for me, at most once per 60 s.
// sync_state is server-only, so the dashboard also reads sync times here.

const MIN_INTERVAL_MS = 60_000;

export const maxDuration = 30;

/** Last successful sync for both players in my pair. */
export async function GET() {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const { admin, profile } = guard;
  if (!profile.pair_id) return apiError(409, "no_pair", "Join a pair first");

  const { data: members, error } = await admin
    .from("profiles")
    .select("id")
    .eq("pair_id", profile.pair_id);
  if (error) return apiError(500, "database", error.message);
  const ids = (members ?? []).map((m) => m.id);

  const { data: rows, error: syncError } = await admin
    .from("sync_state")
    .select("player_id, last_success_at, last_attempt_at")
    .in("player_id", ids);
  if (syncError) return apiError(500, "database", syncError.message);

  return NextResponse.json({
    players: ids.map((id) => {
      const row = rows?.find((r) => r.player_id === id);
      return {
        playerId: id,
        lastSuccessAt: row?.last_success_at ?? null,
        lastAttemptAt: row?.last_attempt_at ?? null,
      };
    }),
  });
}

/** Syncs my LeetCode now and finalizes any overdue days. */
export async function POST() {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const { admin, profile } = guard;
  if (!profile.pair_id) return apiError(409, "no_pair", "Join a pair first");

  const { data: sync, error } = await admin
    .from("sync_state")
    .select("last_attempt_at")
    .eq("player_id", profile.id)
    .maybeSingle();
  if (error) return apiError(500, "database", error.message);

  const now = new Date();
  const last = sync?.last_attempt_at ? new Date(sync.last_attempt_at) : null;
  if (last && now.getTime() - last.getTime() < MIN_INTERVAL_MS) {
    const retryAfter = Math.ceil(
      (MIN_INTERVAL_MS - (now.getTime() - last.getTime())) / 1000,
    );
    return NextResponse.json(
      {
        error: {
          code: "too_soon",
          message: `Synced moments ago. Try again in ${retryAfter}s.`,
        },
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const result = await tickPlayer(admin, profile.id, now);
  if (result.status === "locked") {
    return apiError(
      409,
      "busy",
      "A sync is already running. Try again in a moment.",
    );
  }
  return NextResponse.json({
    sync: result.sync ?? "skipped",
    newSolves: result.newSolves ?? 0,
    error: result.syncError ?? null,
  });
}
