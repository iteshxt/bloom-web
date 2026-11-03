import "server-only";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { readSyncStatus } from "@/lib/services/syncStatus";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DUEL_KEY } from "./keys";
import { loadDuel } from "./loadDuel";

/** The dashboard data for the signed-in player, read on the server so home
 *  renders filled in. Null when there's nothing to seed (signed out, no
 *  pair yet, or a read failed: the browser then fetches as usual). */
export async function loadHomeSeed() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (!userId) return null;
    const now = new Date();
    const duel = await loadDuel(
      supabase,
      userId,
      // The pair id comes from the player's own RLS-scoped profile.
      async (pairId) => ({
        players: await readSyncStatus(createAdminClient(), pairId, now),
      }),
      now,
    );
    if (!duel) return null;
    const client = new QueryClient();
    client.setQueryData(DUEL_KEY, duel, { updatedAt: now.getTime() });
    return { state: dehydrate(client), now: now.getTime() };
  } catch (e) {
    console.error("home seed: falling back to the browser's fetch", e);
    return null;
  }
}
