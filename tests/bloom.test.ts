import { describe, expect, it } from "vitest";
import { bloomLabel, growthFor } from "@/lib/bloom";

describe("growthFor (design §7)", () => {
  it.each([
    [0, "seed", 0],
    [1, "sprout", 0],
    [6, "sprout", 5],
    [7, "bud", 0],
    [14, "bud", 7],
    [15, "bloom", 0],
    [29, "bloom", 14],
    [30, "bouquet", 0],
    [49, "bouquet", 19],
    [50, "bush", 0],
    [99, "bush", 49],
    [100, "garden", 0],
    [250, "garden", 150],
  ])("streak %i is %s, step %i", (streak, stage, step) => {
    expect(growthFor(streak)).toMatchObject({ stage, step });
  });

  it("treats a negative streak as a seed", () => {
    expect(growthFor(-3).stage).toBe("seed");
  });

  it("describes the flower for screen readers", () => {
    expect(bloomLabel({ name: "Riya", streak: 9, state: "done" })).toBe(
      "Riya’s flower, bud stage, 9-day streak, done today",
    );
  });
});
