import { describe, expect, it } from "vitest";
import {
  addDays,
  dayEndsAt,
  daysBetween,
  istMidnight,
  istParts,
  todayIST,
} from "@/lib/time";

describe("lib/time", () => {
  it("maps a UTC instant to its IST day and minute", () => {
    // 2026-11-01 18:29:59Z = 23:59:59 IST on 1 Nov
    expect(istParts(new Date("2026-11-01T18:29:59Z"))).toEqual({
      day: "2026-11-01",
      minuteOfDay: 23 * 60 + 59,
    });
    // 18:30Z = 00:00 IST on 2 Nov
    expect(istParts(new Date("2026-11-01T18:30:00Z"))).toEqual({
      day: "2026-11-02",
      minuteOfDay: 0,
    });
  });

  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("finds IST midnight as a UTC instant", () => {
    expect(istMidnight("2026-11-02").toISOString()).toBe(
      "2026-11-01T18:30:00.000Z",
    );
  });

  it("ends a challenge day at 01:00 IST the next day", () => {
    // 01:00 IST on 3 Nov = 19:30Z on 2 Nov
    expect(dayEndsAt("2026-11-02").toISOString()).toBe(
      "2026-11-02T19:30:00.000Z",
    );
    expect(dayEndsAt("2026-11-02", 0).toISOString()).toBe(
      "2026-11-02T18:30:00.000Z",
    );
  });

  it("ignores the device timezone", () => {
    expect(todayIST(new Date("2026-11-02T20:00:00Z"))).toBe("2026-11-03");
  });

  it("counts days between day keys", () => {
    expect(daysBetween("2026-11-01", "2026-11-03")).toBe(2);
    expect(daysBetween("2026-11-03", "2026-11-01")).toBe(-2);
  });
});
