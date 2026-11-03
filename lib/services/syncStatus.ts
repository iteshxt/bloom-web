import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkInOpen } from "@/lib/checkin";
import type { Database } from "@/lib/supabase/types";

// Last sync per pair member (sync_state is server-only). Read by
// GET /api/sync and by the server render of home.

export interface PlayerSyncStatus {
  playerId: string;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  /** Manual check-in is open for this player (PRD 5.13). */
  checkInOpen: boolean;
}

export async function readSyncStatus(
  admin: SupabaseClient<Database>,
  pairId: string,
  now: Date,
): Promise<PlayerSyncStatus[]> {
  const { data: members, error } = await admin
    .from("profiles")
    .select("id")
    .eq("pair_id", pairId);
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.id);

  const { data: rows, error: syncError } = await admin
    .from("sync_state")
    .select("player_id, last_success_at, last_attempt_at, consecutive_failures")
    .in("player_id", ids);
  if (syncError) throw syncError;

  return ids.map((id) => {
    const row = rows?.find((r) => r.player_id === id);
    return {
      playerId: id,
      lastSuccessAt: row?.last_success_at ?? null,
      lastAttemptAt: row?.last_attempt_at ?? null,
      checkInOpen: checkInOpen({
        lastSuccessAt: row?.last_success_at ?? null,
        consecutiveFailures: row?.consecutive_failures ?? 0,
        now,
      }),
    };
  });
}
