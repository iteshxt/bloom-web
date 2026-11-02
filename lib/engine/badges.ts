// Badge conditions (PRD 4.10). Each badge is awarded at most once per player.

import { awardBadge, type Tx } from "./tx";
import type { Day, Run, Submission } from "./types";

export const MILESTONE_BADGES = [15, 30, 50, 100];

const EARLY_BIRD_BEFORE_MINUTE = 8 * 60;

/** Checks run after every counted solve. `history` already includes it. */
export function badgesForSolve(
  tx: Tx,
  sub: Submission,
  day: Day,
  minuteOfDay: number,
): void {
  const { history } = tx.s;
  awardIf(tx, "first_blood", true);
  awardIf(tx, "hat_trick", day.solvedSlugs.length >= 3);
  awardIf(tx, "hard_hitter", sub.difficulty === "Hard");
  // 10 distinct Hard problems: re-solving one Hard doesn't count again.
  awardIf(tx, "hard_mode", history.hardSlugs.length >= 10);
  awardIf(tx, "early_bird", minuteOfDay < EARLY_BIRD_BEFORE_MINUTE);
  awardIf(tx, "explorer", history.topics.length >= 10);
  awardIf(tx, "century", Object.keys(history.firstCountedDay).length >= 100);
}

/** Checks run whenever the active run's length grows. */
export function badgesForStreak(tx: Tx, run: Run): void {
  awardIf(tx, "perfect_week", run.length >= 7);
  awardIf(tx, "iron_will", run.length >= 30 && run.restoresUsed === 0);
}

function awardIf(tx: Tx, key: string, condition: boolean): void {
  if (condition) awardBadge(tx, key);
}
