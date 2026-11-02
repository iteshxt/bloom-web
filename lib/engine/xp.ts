// XP and levels (PRD 4.9, techspec §7.8).

import type { Difficulty } from "./types";

const BASE_XP: Record<Difficulty, number> = { Easy: 10, Medium: 25, Hard: 50 };

export const DAY_COMPLETE_XP = 20;
export const MAKEUP_COMPLETE_XP = 30;
export const milestoneXp = (milestone: number): number => 10 * milestone;

/** XP for one solve. Re-solves earn half, rounded down (Medium 25 → 12). */
export function solveXp(opts: {
  difficulty?: Difficulty;
  counted: boolean;
  isResolve: boolean;
}): number {
  if (!opts.counted) return 0;
  const base = BASE_XP[opts.difficulty ?? "Easy"];
  return opts.isResolve ? Math.floor(base / 2) : base;
}

/** Total XP to reach level L is 50·L·(L−1). */
export const xpForLevel = (level: number): number => 50 * level * (level - 1);

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1;
  const level = Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2);
  // Guard against floating-point drift at exact thresholds.
  if (xpForLevel(level + 1) <= xp) return level + 1;
  if (xpForLevel(level) > xp) return level - 1;
  return level;
}
