// Turns one engine result into the payload for the `save_player_state`
// database function (supabase/migrations/0005), which writes it atomically.
// Pure, so the mapping from effects to rows is unit-tested.

import type {
  DayKey,
  Effect,
  NotificationKind,
  PlayerState,
  ProcessedSubmission,
} from "@/lib/engine";

export interface PlayerRefs {
  playerId: string;
  pairId: string;
  /** null until the partner joins the pair. */
  partnerId: string | null;
}

export interface SyncOutcome {
  ok: boolean;
  attemptedAt: Date;
  error?: string;
}

export interface NotificationRow {
  player_id: string;
  kind: NotificationKind;
  dedupe_key: string;
  data: Record<string, unknown>;
}

export interface SavePayload {
  player_id: string;
  pair_id: string;
  partner_id: string | null;
  best_streak: number;
  last_finalized_day: DayKey | null;
  sync: { ok: boolean; attempted_at: string; error: string | null } | null;
  runs: Record<string, unknown>[];
  days: Record<string, unknown>[];
  restore_requests: Record<string, unknown>[];
  submissions: Record<string, unknown>[];
  xp_events: { amount: number; reason: string; ref: string }[];
  badges: { player_id: string; badge_key: string }[];
  achievements: { milestone: number; run_id: string; achieved_on: DayKey }[];
  gift_unlocks: { milestone: number }[];
  activity: { kind: string; payload: Record<string, unknown> }[];
  notifications: NotificationRow[];
}

const iso = (d: Date | undefined): string | null =>
  d ? d.toISOString() : null;

export function buildSavePayload(input: {
  refs: PlayerRefs;
  state: PlayerState;
  effects: Effect[];
  submissions: ProcessedSubmission[];
  sync?: SyncOutcome;
  now: Date;
}): SavePayload {
  const { refs, state, effects, now } = input;
  const payload: SavePayload = {
    player_id: refs.playerId,
    pair_id: refs.pairId,
    partner_id: refs.partnerId,
    best_streak: state.bestStreak,
    last_finalized_day: state.lastFinalizedDay ?? null,
    sync: input.sync
      ? {
          ok: input.sync.ok,
          attempted_at: input.sync.attemptedAt.toISOString(),
          error: input.sync.error ?? null,
        }
      : null,
    runs: state.runs.map((r) => ({
      id: r.id,
      started_on: r.startedOn,
      length: r.length,
      last_counted_day: r.lastCountedDay ?? null,
      tokens_remaining: r.tokensRemaining,
      restores_used: r.restoresUsed,
      at_risk_day: r.atRiskDay ?? null,
      ended_on: r.endedOn ?? null,
      end_reason: r.endReason ?? null,
    })),
    days: Object.values(state.days).map((d) => ({
      day: d.day,
      target: d.target,
      makeup_required: d.makeupRequired,
      solved_count: d.solvedSlugs.length,
      status: d.status,
      run_id: d.runId ?? null,
      completed_at: iso(d.completedAt),
      // The database keeps the first finalization time.
      finalized_at: d.finalized ? now.toISOString() : null,
    })),
    restore_requests: state.restores.map((r) => ({
      id: r.id,
      approver_id: refs.partnerId,
      run_id: r.runId,
      missed_day: r.missedDay,
      message: r.message ?? null,
      status: r.status,
      response_message: r.responseMessage ?? null,
      expires_at: r.expiresAt.toISOString(),
      created_at: r.createdAt.toISOString(),
      responded_at: iso(r.respondedAt),
    })),
    submissions: input.submissions.map((s) => ({
      source: "leetcode",
      lc_submission_id: s.id,
      title_slug: s.slug,
      submitted_at: s.submittedAt.toISOString(),
      assigned_day: s.assignedDay,
      counted: s.counted,
      is_resolve: s.isResolve,
      xp: s.xp,
    })),
    xp_events: [],
    badges: [],
    achievements: [],
    gift_unlocks: [],
    activity: [],
    notifications: [],
  };

  for (const e of effects) {
    switch (e.kind) {
      case "xp":
        payload.xp_events.push({
          amount: e.amount,
          reason: e.reason,
          ref: e.ref,
        });
        break;
      case "badge": {
        const owner = e.player === "self" ? refs.playerId : refs.partnerId;
        if (owner) payload.badges.push({ player_id: owner, badge_key: e.key });
        break;
      }
      case "milestone":
        if (e.firstTime) {
          payload.achievements.push({
            milestone: e.milestone,
            run_id: e.runId,
            achieved_on: e.day,
          });
        }
        break;
      case "gift_unlock":
        payload.gift_unlocks.push({ milestone: e.milestone });
        break;
      case "activity":
        payload.activity.push({ kind: e.type, payload: e.payload });
        break;
      case "notify":
        payload.notifications.push(...recipients(e, refs));
        break;
    }
  }
  return payload;
}

/** Resolves self / partner / both to player ids. A `both` notification gets
 *  one dedupe key per recipient. */
function recipients(
  e: Extract<Effect, { kind: "notify" }>,
  refs: PlayerRefs,
): NotificationRow[] {
  const row = (playerId: string, dedupeKey: string): NotificationRow => ({
    player_id: playerId,
    kind: e.notif,
    dedupe_key: dedupeKey,
    data: e.data,
  });
  switch (e.to) {
    case "self":
      return [row(refs.playerId, e.dedupeKey)];
    case "partner":
      return refs.partnerId ? [row(refs.partnerId, e.dedupeKey)] : [];
    case "both":
      return [refs.playerId, refs.partnerId]
        .filter((id): id is string => id !== null)
        .map((id) => row(id, `${e.dedupeKey}:${id}`));
  }
}
