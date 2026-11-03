import { describe, expect, it } from "vitest";
import {
  computeStats,
  monthGrid,
  tileFor,
  yearWeeks,
  type DayRowLite,
} from "@/lib/game/heatmap";

const row = (over: Partial<DayRowLite>): DayRowLite => ({
  day: "2026-11-05",
  status: "complete",
  solved: 1,
  target: 1,
  makeup: 0,
  ...over,
});

describe("heatmap tiles (design §10.11)", () => {
  const base = { today: "2026-11-10", startDate: "2026-11-04" };

  it("leaves the future empty and marks pre-season solves", () => {
    expect(tileFor({ ...base, day: "2026-11-11" })).toBe("empty");
    expect(tileFor({ ...base, day: "2026-11-01" })).toBe("empty");
    expect(tileFor({ ...base, day: "2026-11-01", preseasonSolves: 2 })).toBe(
      "preseason",
    );
  });

  it("scales intensity with solves against the day's target", () => {
    const at = (solved: number, target = 2) =>
      tileFor({ ...base, day: "2026-11-05", row: row({ solved, target }) });
    expect(at(2)).toBe("bloom");
    expect(at(3)).toBe("extra");
    expect(at(4)).toBe("double");
  });

  it("counts make-up in the target", () => {
    expect(
      tileFor({
        ...base,
        day: "2026-11-05",
        row: row({ solved: 2, target: 1, makeup: 1 }),
      }),
    ).toBe("bloom");
  });

  it("shows restored, missed and pending days distinctly", () => {
    expect(
      tileFor({ ...base, day: "2026-11-05", row: row({ status: "restored" }) }),
    ).toBe("restored");
    expect(
      tileFor({ ...base, day: "2026-11-05", row: row({ status: "missed" }) }),
    ).toBe("missed");
    expect(tileFor({ ...base, day: "2026-11-06" })).toBe("missed");
    expect(tileFor({ ...base, day: "2026-11-10" })).toBe("pending");
  });
});

describe("heatmap grids", () => {
  it("builds Monday-first weeks ending today", () => {
    // 2026-11-04 is a Wednesday.
    const weeks = yearWeeks("2026-11-04", 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[1].slice(0, 3)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
    expect(weeks[1][3]).toBeNull();
    expect(weeks[0][0]).toBe("2026-10-26");
  });

  it("pads a month to start on Monday", () => {
    const cells = monthGrid("2026-11"); // 1 Nov 2026 is a Sunday
    expect(cells.slice(0, 7)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      "2026-11-01",
    ]);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });
});

describe("profile stats (PRD 5.4)", () => {
  it("counts distinct problems, difficulty, best streak, completion and topics", () => {
    const stats = computeStats({
      today: "2026-11-10",
      runLengths: [4, 12, 0],
      rows: [
        row({ day: "2026-11-05", status: "complete" }),
        row({ day: "2026-11-06", status: "restored" }),
        row({ day: "2026-11-07", status: "missed" }),
        row({ day: "2026-11-10", status: "pending" }),
      ],
      solves: [
        {
          slug: "two-sum",
          day: "2026-11-05",
          counted: true,
          difficulty: "Easy",
          topics: ["Array", "Hash Table"],
        },
        {
          slug: "two-sum",
          day: "2026-11-06",
          counted: true,
          difficulty: "Easy",
          topics: ["Array", "Hash Table"],
        },
        {
          slug: "lru",
          day: "2026-11-06",
          counted: true,
          difficulty: "Medium",
          topics: ["Hash Table"],
        },
        {
          slug: "median",
          day: "2026-11-01",
          counted: false,
          difficulty: "Hard",
          topics: ["Array"],
        },
      ],
    });
    expect(stats).toMatchObject({
      totalSolved: 3,
      easy: 1,
      medium: 1,
      hard: 1,
      bestStreak: 12,
      completion: 67,
    });
    expect(stats.topTopics[0]).toEqual({ topic: "Array", count: 2 });
  });
});
