import "server-only";
import { randomUUID } from "node:crypto";
import {
  createPlayerState,
  type Day,
  type PlayerState,
  type RestoreRequest,
  type Run,
} from "@/lib/engine";
import { addDays, type DayKey } from "@/lib/time";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";
import type { PlayerRefs } from "./persist";

export type Admin = ReturnType<typeof createAdminClient>;

export interface LoadedPlayer extends PlayerRefs {
  state: PlayerState;
  leetcodeUsername: string | null;
  lastSyncSuccessAt?: Date;
}

const PAGE = 1000;

/** Loads everything the engine needs for one player, or null when the
 *  player isn't in a pair with a start date yet. */
export async function loadPlayer(
  admin: Admin,
  playerId: string,
): Promise<LoadedPlayer | null> {
  const profile = await row(
    admin.from("profiles").select("*").eq("id", playerId).single(),
  );
  if (!profile.pair_id) return null;
  const pairId = profile.pair_id;

  const [
    pair,
    partner,
    sync,
    targets,
    activeRuns,
    achievements,
    badges,
    history,
  ] = await Promise.all([
    row(admin.from("pairs").select("*").eq("id", pairId).single()),
    one(
      admin
        .from("profiles")
        .select("id")
        .eq("pair_id", pairId)
        .neq("id", playerId)
        .maybeSingle(),
    ),
    one(
      admin
        .from("sync_state")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
    ),
    many(
      admin
        .from("daily_targets")
        .select("effective_from, target")
        .eq("player_id", playerId),
    ),
    many(
      admin
        .from("runs")
        .select("*")
        .eq("player_id", playerId)
        .is("ended_on", null),
    ),
    many(
      admin
        .from("milestone_achievements")
        .select("milestone")
        .eq("player_id", playerId),
    ),
    many(
      admin.from("badges_earned").select("badge_key").eq("player_id", playerId),
    ),
    loadHistory(admin, playerId),
  ]);
  if (!pair.start_date) return null;

  const rules = {
    milestones: pair.milestones,
    tokensPerRun: pair.tokens_per_run,
    graceMinutes: pair.grace_minutes,
    makeupEnabled: pair.makeup_enabled,
    startDate: pair.start_date,
  };
  const targetChanges = targets.map((t) => ({
    effectiveFrom: t.effective_from,
    target: t.target,
  }));

  // First load: the engine creates the first run on the start date.
  const state: PlayerState =
    activeRuns.length === 0
      ? createPlayerState({
          playerId,
          rules,
          targets: targetChanges,
          newId: randomUUID,
        })
      : {
          playerId,
          rules,
          targets: targetChanges,
          days: {},
          runs: activeRuns.map(toRun),
          restores: [],
          achievements: [],
          bestStreak: profile.best_streak,
          xpTotal: profile.xp_total,
          level: profile.level,
          badges: [],
          history: { firstCountedDay: {}, hardSlugs: [], topics: [] },
        };

  state.achievements = achievements.map((a) => a.milestone);
  state.badges = badges.map((b) => b.badge_key);
  state.history = history;
  state.bestStreak = profile.best_streak;
  state.xpTotal = profile.xp_total;
  state.level = profile.level;
  state.lastFinalizedDay = sync?.last_finalized_day ?? undefined;

  // Days the engine may touch: the active run's, plus the day before the
  // first unfinalized one (grace-hour assignment and make-up checks).
  const run = state.runs[0];
  const firstOpen = state.lastFinalizedDay
    ? addDays(state.lastFinalizedDay, 1)
    : rules.startDate;
  const from = [run.startedOn, addDays(firstOpen, -1)].sort()[0];
  state.days = await loadDays(admin, playerId, from);

  if (activeRuns.length > 0) {
    const restores = await many(
      admin
        .from("restore_requests")
        .select("*")
        .eq("player_id", playerId)
        .eq("run_id", run.id),
    );
    state.restores = restores.map(toRestore);
  }

  return {
    playerId,
    pairId,
    partnerId: partner?.id ?? null,
    state,
    leetcodeUsername: profile.leetcode_username,
    lastSyncSuccessAt: sync?.last_success_at
      ? new Date(sync.last_success_at)
      : undefined,
  };
}

async function loadDays(
  admin: Admin,
  playerId: string,
  from: DayKey,
): Promise<Record<DayKey, Day>> {
  const [rows, solved] = await Promise.all([
    many(
      admin.from("days").select("*").eq("player_id", playerId).gte("day", from),
    ),
    pages((lo, hi) =>
      admin
        .from("submissions")
        .select("assigned_day, title_slug")
        .eq("player_id", playerId)
        .eq("counted", true)
        .gte("assigned_day", from)
        .order("submitted_at")
        .range(lo, hi),
    ),
  ]);
  const days: Record<DayKey, Day> = {};
  for (const r of rows) {
    days[r.day] = {
      day: r.day,
      target: r.target,
      makeupRequired: r.makeup_required,
      solvedSlugs: [],
      status: r.status,
      runId: r.run_id ?? undefined,
      completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
      finalized: r.finalized_at !== null,
    };
  }
  for (const s of solved) days[s.assigned_day]?.solvedSlugs.push(s.title_slug);
  return days;
}

/** Lifetime facts for re-solve XP and badges, from every counted solve. */
async function loadHistory(
  admin: Admin,
  playerId: string,
): Promise<PlayerState["history"]> {
  const rows = await pages((lo, hi) =>
    admin
      .from("submissions")
      .select("assigned_day, title_slug, problems(difficulty, topic_tags)")
      .eq("player_id", playerId)
      .eq("counted", true)
      .order("submitted_at")
      .range(lo, hi),
  );
  const history: PlayerState["history"] = {
    firstCountedDay: {},
    hardSlugs: [],
    topics: [],
  };
  const hard = new Set<string>();
  const topics = new Set<string>();
  for (const r of rows) {
    const first = history.firstCountedDay[r.title_slug];
    if (first === undefined || r.assigned_day < first) {
      history.firstCountedDay[r.title_slug] = r.assigned_day;
    }
    if (r.problems?.difficulty === "Hard") hard.add(r.title_slug);
    for (const t of r.problems?.topic_tags ?? []) topics.add(t);
  }
  history.hardSlugs = [...hard];
  history.topics = [...topics];
  return history;
}

const toRun = (r: Tables<"runs">): Run => ({
  id: r.id,
  startedOn: r.started_on,
  length: r.length,
  lastCountedDay: r.last_counted_day ?? undefined,
  tokensRemaining: r.tokens_remaining,
  restoresUsed: r.restores_used,
  atRiskDay: r.at_risk_day ?? undefined,
  endedOn: r.ended_on ?? undefined,
  endReason: r.end_reason ?? undefined,
});

const toRestore = (r: Tables<"restore_requests">): RestoreRequest => ({
  id: r.id,
  runId: r.run_id,
  missedDay: r.missed_day,
  message: r.message ?? undefined,
  status: r.status,
  responseMessage: r.response_message ?? undefined,
  expiresAt: new Date(r.expires_at),
  createdAt: new Date(r.created_at),
  respondedAt: r.responded_at ? new Date(r.responded_at) : undefined,
});

// ───────── Query helpers ─────────

interface QueryResult<T> {
  data: T;
  error: { message: string } | null;
}

async function one<T>(query: PromiseLike<QueryResult<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data;
}

/** A `.single()` row: missing rows are errors. */
async function row<T>(
  query: PromiseLike<QueryResult<T>>,
): Promise<NonNullable<T>> {
  const data = await one(query);
  if (data === null || data === undefined)
    throw new Error("Supabase query returned no row");
  return data as NonNullable<T>;
}

async function many<T>(
  query: PromiseLike<QueryResult<T[] | null>>,
): Promise<T[]> {
  return (await one(query)) ?? [];
}

/** Reads every row past PostgREST's 1000-row page limit. */
async function pages<T>(
  page: (lo: number, hi: number) => PromiseLike<QueryResult<T[] | null>>,
): Promise<T[]> {
  const all: T[] = [];
  for (let lo = 0; ; lo += PAGE) {
    const rows = await many(page(lo, lo + PAGE - 1));
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

export { one, many };
