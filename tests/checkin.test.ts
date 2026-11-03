import { describe, expect, it } from "vitest";
import { checkInOpen, parseProblemUrl } from "@/lib/checkin";

describe("manual check-in URLs (PRD 5.13)", () => {
  it.each([
    ["https://leetcode.com/problems/two-sum/", "two-sum"],
    ["https://leetcode.com/problems/two-sum", "two-sum"],
    ["  https://leetcode.com/problems/lru-cache/description/  ", "lru-cache"],
    ["https://leetcode.com/problems/3sum?envType=daily", "3sum"],
    [
      "https://leetcode.com/problems/valid-parentheses/submissions/123/",
      "valid-parentheses",
    ],
  ])("reads the slug from %s", (url, slug) => {
    expect(parseProblemUrl(url)).toBe(slug);
  });

  it.each([
    "two-sum",
    "http://leetcode.com/problems/two-sum/",
    "https://leetcode.cn/problems/two-sum/",
    "https://evil.com/?https://leetcode.com/problems/two-sum/",
    "https://leetcode.com.evil.com/problems/two-sum/",
    "https://leetcode.com/problems/Two_Sum/",
    "https://leetcode.com/problemset/all/",
    "javascript:alert(1)",
  ])("rejects %s", (url) => {
    expect(parseProblemUrl(url)).toBeNull();
  });
});

describe("when check-in opens", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("needs a failing sync and no success for over 3 hours", () => {
    expect(
      checkInOpen({ lastSuccessAt: hoursAgo(4), consecutiveFailures: 3, now }),
    ).toBe(true);
    expect(
      checkInOpen({ lastSuccessAt: hoursAgo(2), consecutiveFailures: 3, now }),
    ).toBe(false);
    expect(
      checkInOpen({ lastSuccessAt: hoursAgo(4), consecutiveFailures: 0, now }),
    ).toBe(false);
  });

  it("opens when LeetCode has never been reachable", () => {
    expect(
      checkInOpen({ lastSuccessAt: null, consecutiveFailures: 1, now }),
    ).toBe(true);
    expect(
      checkInOpen({ lastSuccessAt: null, consecutiveFailures: 0, now }),
    ).toBe(false);
  });
});
