"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api/client";
import { partnerOpened } from "@/lib/presence";
import { createClient } from "@/lib/supabase/browser";
import { loadDuel, type DuelData, type SyncStatus } from "./loadDuel";

// useDuelState() from techspec §10: everything the dashboard needs for both
// players (see loadDuel.ts). Realtime changes in the pair invalidate it.

export { DUEL_KEY } from "./keys";
import { DUEL_KEY } from "./keys";

export type { ActivityItem, DuelData, PlayerData, Solve } from "./loadDuel";

const REALTIME_TABLES = [
  "days",
  "runs",
  "restore_requests",
  "activity",
  "profiles",
  "daily_targets",
  "badges_earned",
] as const;

async function fetchDuel(): Promise<DuelData | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  return loadDuel(
    supabase,
    userId,
    // sync_state is server-only; the route reads it for my pair.
    async () => {
      const r = await api<SyncStatus>("/api/sync");
      return r.ok ? r.data : null;
    },
    new Date(),
  );
}

/** Both players' dashboard data. <DuelRealtime /> keeps it live. */
export function useDuel() {
  return useQuery({ queryKey: DUEL_KEY, queryFn: fetchDuel });
}

/** Subscribes once (from the app layout) to the pair's Realtime changes and
 *  invalidates every query when anything in the pair changes. */
export function useDuelRealtime() {
  const queryClient = useQueryClient();
  const duel = useDuel().data;
  const pairId = duel?.pair.id;
  const meId = duel?.me.id;
  const partnerId = duel?.partner?.id;

  useEffect(() => {
    if (!pairId || !meId) return;
    const supabase = createClient();
    // Presence keyed by player, so a partner opening the app shows up as a
    // join (their creature waves, design §9.3).
    const channel = supabase.channel(`pair:${pairId}`, {
      config: { presence: { key: meId } },
    });
    channel.on("presence", { event: "join" }, ({ key }) => {
      if (partnerId && key === partnerId) partnerOpened(partnerId);
    });
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `pair_id=eq.${pairId}` },
        // Any pair change can affect any screen (gifts signal through activity).
        () => queryClient.invalidateQueries(),
      );
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") channel.track({ at: Date.now() });
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId, meId, partnerId, queryClient]);
}
