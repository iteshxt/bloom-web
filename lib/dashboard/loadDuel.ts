import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayStatus } from "@/lib/engine/types";
import type { Database } from "@/lib/supabase/types";
import { addDays, todayIST, type DayKey } from "@/lib/time";
import type { DayRow, PairInput, PlayerInput } from "./derive";

// Everything the dashboard needs for both players (useDuelState() in
// techspec §10), read under RLS. Shared by the browser's query and the
// server, which renders home with it already filled in.

export interface Solve {
  title: string;
  difficulty: string | null;
  submittedAt: string;
  xp: number;
  /** A manual check-in, shown as unverified (PRD 5.13). */
  manual: boolean;
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

/** Each pair member's LeetCode sync status (GET /api/sync). */
export interface SyncStatus {
  players: {
    playerId: string;
    lastSuccessAt: string | null;
    checkInOpen?: boolean;
  }[];
}

export async function loadDuel(
  supabase: SupabaseClient<Database>,
  userId: string,
  syncStatus: (pairId: string) => Promise<SyncStatus | null>,
  now: Date,
): Promise<DuelData | null> {
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

  const today = todayIST(now);
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
        "player_id, assigned_day, submitted_at, xp, source, problems(title, difficulty)",
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
    syncStatus(pairId),
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
        manual: s.source === "manual",
      });
    }
    const syncRow = sync?.players.find((p) => p.playerId === row.id);
    const lastSync = syncRow?.lastSuccessAt;
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
      checkInOpen: syncRow?.checkInOpen ?? false,
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
