// Public API of the pure rules engine. See techspec §7 and PRD §4.

import { addDays, todayIST, type DayKey } from "@/lib/time";
import { beginTx, ensureDay } from "./tx";
import type {
  EngineContext,
  EngineResult,
  PairRules,
  PlayerState,
  TargetChange,
} from "./types";

export { processSubmissions, assignDay } from "./assign";
export { canFinalize, finalizeOverdue } from "./evaluate";
export { requestRestore, cancelRestore, respondRestore } from "./restore";
export { scheduledNotifications, SYNC_FAILING_AFTER_MS } from "./reminders";
export { targetFor } from "./tx";
export { levelForXp, solveXp, xpForLevel } from "./xp";
export * from "./types";

/** A new player's state: the first run starts on the pair's start date. */
export function createPlayerState(input: {
  playerId: string;
  rules: PairRules;
  targets?: TargetChange[];
  newId: () => string;
}): PlayerState {
  return {
    playerId: input.playerId,
    rules: input.rules,
    targets: input.targets ?? [],
    days: {},
    runs: [
      {
        id: input.newId(),
        startedOn: input.rules.startDate,
        length: 0,
        tokensRemaining: input.rules.tokensPerRun,
        restoresUsed: 0,
      },
    ],
    restores: [],
    achievements: [],
    bestStreak: 0,
    xpTotal: 0,
    level: 1,
    badges: [],
    history: { firstCountedDay: {}, hardSlugs: [], topics: [] },
  };
}

/** Creates today's day row (snapshotting its target) once the challenge has
 *  started. Called by the tick and the dashboard read path. */
export function ensureToday(
  state: PlayerState,
  ctx: EngineContext,
): EngineResult<DayKey> {
  const tx = beginTx(state, ctx);
  const today = todayIST(ctx.now);
  if (today >= tx.s.rules.startDate) ensureDay(tx, today);
  return { state: tx.s, effects: tx.effects, value: today };
}

/** A target change made at `now` applies from the next IST calendar date. */
export const nextTargetEffectiveDate = (now: Date): DayKey =>
  addDays(todayIST(now), 1);
