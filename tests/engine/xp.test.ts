import { describe, expect, it } from "vitest";
import { levelForXp, solveXp, xpForLevel } from "@/lib/engine/xp";

describe("xp and levels", () => {
  it("#22 level formula", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(299)).toBe(2);
    expect(levelForXp(300)).toBe(3);
    expect(levelForXp(1000)).toBe(5);
    expect(levelForXp(4500)).toBe(10);
    for (let level = 2; level <= 200; level++) {
      expect(levelForXp(xpForLevel(level))).toBe(level);
      expect(levelForXp(xpForLevel(level) - 1)).toBe(level - 1);
    }
  });

  it("solve XP by difficulty, halved and rounded down for re-solves", () => {
    const xp = (
      difficulty: "Easy" | "Medium" | "Hard" | undefined,
      isResolve = false,
    ) => solveXp({ difficulty, counted: true, isResolve });
    expect([xp("Easy"), xp("Medium"), xp("Hard"), xp(undefined)]).toEqual([
      10, 25, 50, 10,
    ]);
    expect([xp("Easy", true), xp("Medium", true), xp("Hard", true)]).toEqual([
      5, 12, 25,
    ]);
    expect(
      solveXp({ difficulty: "Hard", counted: false, isResolve: false }),
    ).toBe(0);
  });
});
