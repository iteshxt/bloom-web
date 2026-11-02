// Shared engine types (techspec §7.1). The engine is pure: services load a
// PlayerState, call the engine with `now`, then persist the returned state and
// run the returned effects.

import type { DayKey } from "@/lib/time";

export type { DayKey };

export type Difficulty = "Easy" | "Medium" | "Hard";
export type DayStatus = "pending" | "complete" | "missed" | "restored";
export type RunEndReason =
  | "missed"
  | "no_tokens"
  | "restore_rejected"
  | "restore_expired"
  | "makeup_failed";
export type RestoreStatus =
  "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface PairRules {
  milestones: number[];
  tokensPerRun: number;
  graceMinutes: number;
  makeupEnabled: boolean;
  startDate: DayKey;
}

export interface TargetChange {
  effectiveFrom: DayKey;
  target: number;
}

export interface Day {
  day: DayKey;
  /** Snapshot of the target that applied that day (CLAUDE.md invariant 10). */
  target: number;
  makeupRequired: number;
  /** Distinct counted problem slugs, in the order they were counted. */
  solvedSlugs: string[];
  status: DayStatus;
  /** Run that counts this day. A complete day stays unattached until every
   *  earlier day of the run is settled (see evaluate.ts). */
  runId?: string;
  completedAt?: Date;
  finalized: boolean;
}

export interface Run {
  id: string;
  startedOn: DayKey;
  /** Counted days (complete + restored). */
  length: number;
  lastCountedDay?: DayKey;
  tokensRemaining: number;
  restoresUsed: number;
  /** Missed day awaiting restore resolution: the run is "on ice". */
  atRiskDay?: DayKey;
  /** The missed day that ended the run. */
  endedOn?: DayKey;
  endReason?: RunEndReason;
}

export interface RestoreRequest {
  id: string;
  runId: string;
  missedDay: DayKey;
  message?: string;
  status: RestoreStatus;
  responseMessage?: string;
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date;
}

/** Lifetime facts the engine needs beyond the active run. */
export interface PlayerHistory {
  /** Every slug ever counted → the first day it was counted. */
  firstCountedDay: Record<string, DayKey>;
  /** Distinct Hard slugs ever counted. */
  hardSlugs: string[];
  /** Distinct topic tag slugs across counted solves. */
  topics: string[];
}

export interface PlayerState {
  playerId: string;
  rules: PairRules;
  targets: TargetChange[];
  /** Day rows the engine may touch: at least the active run's days and any
   *  unfinalized days. */
  days: Record<DayKey, Day>;
  /** The active run (no `endedOn`) plus any runs ended during this call. */
  runs: Run[];
  restores: RestoreRequest[];
  /** Milestones achieved for life (PRD 4.8). */
  achievements: number[];
  bestStreak: number;
  xpTotal: number;
  level: number;
  badges: string[];
  history: PlayerHistory;
  lastFinalizedDay?: DayKey;
}

export interface Submission {
  /** Stable unique id: the LeetCode submission id, or a manual check-in id. */
  id: string;
  slug: string;
  submittedAt: Date;
  /** Unknown difficulty earns Easy XP (techspec §7.2). */
  difficulty?: Difficulty;
  topics: string[];
}

export interface ProcessedSubmission extends Submission {
  assignedDay: DayKey;
  /** false: duplicate slug on that day, or pre-season. */
  counted: boolean;
  isResolve: boolean;
  xp: number;
}

export type NotificationKind =
  | "reminder_evening"
  | "reminder_late"
  | "reminder_grace"
  | "partner_done"
  | "streak_on_ice"
  | "streak_broken"
  | "restore_requested"
  | "restore_ask"
  | "restore_closing"
  | "restore_answered"
  | "target_changed"
  | "milestone_reached"
  | "gift_owed"
  | "gift_revealed"
  | "gift_received"
  | "level_up"
  | "badge_earned"
  | "nudge"
  | "sync_failing";

export type XpReason =
  "solve" | "day_complete" | "makeup_complete" | "milestone";

export type Effect =
  | {
      kind: "notify";
      to: "self" | "partner" | "both";
      notif: NotificationKind;
      data: Record<string, unknown>;
      /** `<kind>:<player>:<ref>`. For `both`, services suffix the recipient. */
      dedupeKey: string;
    }
  | { kind: "activity"; type: string; payload: Record<string, unknown> }
  | { kind: "xp"; amount: number; reason: XpReason; ref: string }
  | {
      kind: "milestone";
      milestone: number;
      firstTime: boolean;
      runId: string;
      day: DayKey;
    }
  /** First-time milestone: services unlock the partner's gift for it, creating
   *  an IOU row and notifying the giver `gift_owed` if no title is set. */
  | { kind: "gift_unlock"; milestone: number }
  | { kind: "badge"; key: string; player: "self" | "partner" };

export interface EngineContext {
  now: Date;
  /** Id factory for new runs and requests (deterministic in tests). */
  newId: () => string;
}

export interface EngineResult<T = unknown> {
  state: PlayerState;
  effects: Effect[];
  value: T;
}

export type EngineError =
  | "not_at_risk"
  | "window_closed"
  | "already_requested"
  | "request_not_found"
  | "request_not_pending"
  | "run_changed";

export type ActionResult<T = unknown> =
  ({ ok: true } & EngineResult<T>) | { ok: false; error: EngineError };

export const required = (d: Day): number => d.target + d.makeupRequired;
