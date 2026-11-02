// Internal helpers shared by the engine modules. A Tx is one engine call: a
// private copy of the player state, the context and the effects collected so far.

import { levelForXp } from "./xp";
import type {
  Day,
  DayKey,
  Effect,
  EngineContext,
  NotificationKind,
  PlayerState,
  Run,
  TargetChange,
  XpReason,
} from "./types";

export interface Tx extends EngineContext {
  s: PlayerState;
  effects: Effect[];
}

export function beginTx(state: PlayerState, ctx: EngineContext): Tx {
  return { ...ctx, s: structuredClone(state), effects: [] };
}

/** Target effective on `day`: the latest change on or before it, else 1. */
export function targetFor(targets: TargetChange[], day: DayKey): number {
  let best: TargetChange | undefined;
  for (const t of targets) {
    if (
      t.effectiveFrom <= day &&
      (!best || t.effectiveFrom > best.effectiveFrom)
    ) {
      best = t;
    }
  }
  return best?.target ?? 1;
}

/** Creates the day row lazily, snapshotting the target that applies to it. */
export function ensureDay(tx: Tx, day: DayKey): Day {
  const existing = tx.s.days[day];
  if (existing) return existing;
  const created: Day = {
    day,
    target: targetFor(tx.s.targets, day),
    makeupRequired: 0,
    solvedSlugs: [],
    status: "pending",
    finalized: false,
  };
  tx.s.days[day] = created;
  return created;
}

export function activeRun(tx: Tx): Run {
  const run = tx.s.runs.find((r) => r.endedOn === undefined);
  if (!run) throw new Error(`Player ${tx.s.playerId} has no active run`);
  return run;
}

export function startRun(tx: Tx, startedOn: DayKey): Run {
  const run: Run = {
    id: tx.newId(),
    startedOn,
    length: 0,
    tokensRemaining: tx.s.rules.tokensPerRun,
    restoresUsed: 0,
  };
  tx.s.runs.push(run);
  return run;
}

export const dedupe = (kind: NotificationKind, tx: Tx, ref: string): string =>
  `${kind}:${tx.s.playerId}:${ref}`;

export function notify(
  tx: Tx,
  to: "self" | "partner" | "both",
  notif: NotificationKind,
  ref: string,
  data: Record<string, unknown> = {},
): void {
  tx.effects.push({
    kind: "notify",
    to,
    notif,
    data,
    dedupeKey: dedupe(notif, tx, ref),
  });
}

export function activity(
  tx: Tx,
  type: string,
  payload: Record<string, unknown> = {},
): void {
  tx.effects.push({ kind: "activity", type, payload });
}

export function addXp(
  tx: Tx,
  amount: number,
  reason: XpReason,
  ref: string,
): void {
  if (amount <= 0) return;
  tx.effects.push({ kind: "xp", amount, reason, ref });
  tx.s.xpTotal += amount;
  const level = levelForXp(tx.s.xpTotal);
  if (level > tx.s.level) {
    tx.s.level = level;
    notify(tx, "self", "level_up", String(level), { level });
    activity(tx, "level_up", { level });
  }
}

/** Awards one of this player's badges at most once. */
export function awardBadge(tx: Tx, key: string): void {
  if (tx.s.badges.includes(key)) return;
  tx.s.badges.push(key);
  tx.effects.push({ kind: "badge", key, player: "self" });
  notify(tx, "self", "badge_earned", key, { badge: key });
  activity(tx, "badge", { badge: key });
}
