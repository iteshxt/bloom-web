"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api/client";
import type { DayStatus } from "@/lib/engine/types";
import { createClient } from "@/lib/supabase/browser";
import { addDays, todayIST, type DayKey } from "@/lib/time";
import type { DayRow, PairInput, PlayerInput } from "./derive";

// useDuelState() from techspec §10: everything the dashboard needs for both
// players, read under RLS. Realtime changes in the pair invalidate it.

export const DUEL_KEY = ["duel"] as const;

export interface Solve {
  title: string;
  difficulty: string | null;
  submittedAt: string;
  xp: number;
}

export interface ActivityItem {
  id: number;
  actorId: string | null;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface PlayerData extends PlayerInput {
  avatarKey: string;
  leetcode: string | null;
  /** Counted solves today and yesterday, newest first. */
  recentSolves: Record<DayKey, Solve[]>;
}

export interface DuelData {
  me: PlayerData;
  partner: PlayerData | null;
  pair: PairInput & { id: string; inviteCode: string };
  pendingRequestFromPartner: { id: string } | null;
  activity: ActivityItem[];
}

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

  const { data: members, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, color, avatar_key, xp_total, level, leetcode_username, pair_id",
    );
  if (error) throw error;
  const meRow = members?.find((m) => m.id === userId);
  if (!meRow?.pair_id) return null;
  const pairId = meRow.pair_id;
  const partnerRow =
    members?.find((m) => m.id !== userId && m.pair_id === pairId) ?? null;

  const today = todayIST(new Date());
  const days = [addDays(today, -1), today];

  const [
    pair,
    runs,
    ended,
    dayRows,
    targets,
    solves,
    requests,
    activity,
    sync,
  ] = await Promise.all([
    supabase.from("pairs").select("*").eq("id", pairId).single(),
    supabase
      .from("runs")
      .select("player_id, length, tokens_remaining, at_risk_day")
      .is("ended_on", null),
    // The latest ended run per player, for the "sad" mood (design §9.3).
    supabase
      .from("runs")
      .select("player_id, length, ended_on")
      .not("ended_on", "is", null)
      .order("ended_on", { ascending: false })
      .limit(10),
    supabase.from("days").select("*").in("day", days),
    supabase.from("daily_targets").select("player_id, effective_from, target"),
    supabase
      .from("submissions")
      .select(
        "player_id, assigned_day, submitted_at, xp, problems(title, difficulty)",
      )
      .eq("counted", true)
      .in("assigned_day", days)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("restore_requests")
      .select("id, player_id, approver_id")
      .eq("status", "pending"),
    supabase
      .from("activity")
      .select("id, actor_id, kind, payload, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    api<{ players: { playerId: string; lastSuccessAt: string | null }[] }>(
      "/api/sync",
    ),
  ]);
  for (const r of [
    pair,
    runs,
    ended,
    dayRows,
    targets,
    solves,
    requests,
    activity,
  ]) {
    if (r.error) throw r.error;
  }
  if (!pair.data?.start_date) return null;

  const player = (row: NonNullable<typeof meRow>): PlayerData => {
    const run = runs.data?.find((r) => r.player_id === row.id);
    const myDays: Record<DayKey, DayRow> = {};
    for (const d of dayRows.data ?? []) {
      if (d.player_id !== row.id) continue;
      myDays[d.day] = {
        target: d.target,
        makeupRequired: d.makeup_required,
        solvedCount: d.solved_count,
        status: d.status as DayStatus,
        finalized: d.finalized_at !== null,
      };
    }
    const recentSolves: Record<DayKey, Solve[]> = {};
    for (const s of solves.data ?? []) {
      if (s.player_id !== row.id) continue;
      (recentSolves[s.assigned_day] ??= []).push({
        title: s.problems?.title ?? "A problem",
        difficulty: s.problems?.difficulty ?? null,
        submittedAt: s.submitted_at,
        xp: s.xp,
      });
    }
    const lastSync = sync.ok
      ? sync.data.players.find((p) => p.playerId === row.id)?.lastSuccessAt
      : null;
    return {
      id: row.id,
      name: row.display_name,
      color: row.color,
      avatarKey: row.avatar_key,
      leetcode: row.leetcode_username,
      xpTotal: row.xp_total,
      level: row.level,
      run: run
        ? {
            length: run.length,
            tokensRemaining: run.tokens_remaining,
            atRiskDay: run.at_risk_day,
          }
        : null,
      days: myDays,
      targets: (targets.data ?? [])
        .filter((t) => t.player_id === row.id)
        .map((t) => ({ effectiveFrom: t.effective_from, target: t.target })),
      // ISO text, not a Date, so the cache survives being saved offline.
      lastSyncAt: lastSync ?? null,
      lastEndedRunLength:
        ended.data?.find((r) => r.player_id === row.id)?.length ?? null,
      recentSolves,
    };
  };

  const request = requests.data?.find(
    (r) => r.approver_id === userId && r.player_id === partnerRow?.id,
  );

  return {
    me: player(meRow),
    partner: partnerRow ? player(partnerRow) : null,
    pair: {
      id: pairId,
      inviteCode: pair.data.invite_code,
      startDate: pair.data.start_date,
      milestones: pair.data.milestones,
      tokensPerRun: pair.data.tokens_per_run,
      graceMinutes: pair.data.grace_minutes,
    },
    pendingRequestFromPartner: request ? { id: request.id } : null,
    activity: (activity.data ?? []).map((a) => ({
      id: a.id,
      actorId: a.actor_id,
      kind: a.kind,
      payload: (a.payload ?? {}) as Record<string, unknown>,
      createdAt: a.created_at,
    })),
  };
}

/** Both players' dashboard data. <DuelRealtime /> keeps it live. */
export function useDuel() {
  return useQuery({ queryKey: DUEL_KEY, queryFn: fetchDuel });
}

/** Subscribes once (from the app layout) to the pair's Realtime changes and
 *  invalidates every query when anything in the pair changes. */
export function useDuelRealtime() {
  const queryClient = useQueryClient();
  const pairId = useDuel().data?.pair.id;

  useEffect(() => {
    if (!pairId) return;
    const supabase = createClient();
    const channel = supabase.channel(`pair:${pairId}`);
    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `pair_id=eq.${pairId}` },
        // Any pair change can affect any screen (gifts signal through activity).
        () => queryClient.invalidateQueries(),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairId, queryClient]);
}
