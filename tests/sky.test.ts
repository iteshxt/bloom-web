import { describe, expect, it } from "vitest";
import { isNightBand, skyBand } from "@/lib/sky";

// IST = UTC+05:30, so 00:00 IST is 18:30 UTC the day before.
const ist = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00+05:30`);

describe("skyBand (design §6.1)", () => {
  it.each([
    ["00:00", "grace"],
    ["00:59", "grace"],
    ["01:00", "deep"],
    ["04:59", "deep"],
    ["05:00", "dawn"],
    ["09:59", "dawn"],
    ["10:00", "day"],
    ["16:59", "day"],
    ["17:00", "dusk"],
    ["20:59", "dusk"],
    ["21:00", "night"],
    ["23:59", "night"],
  ])("%s IST is %s", (time, band) => {
    expect(skyBand(ist(time))).toBe(band);
  });

  it("uses the night palette from 21:00 to 05:00 only", () => {
    expect(isNightBand(skyBand(ist("21:00")))).toBe(true);
    expect(isNightBand(skyBand(ist("04:59")))).toBe(true);
    expect(isNightBand(skyBand(ist("05:00")))).toBe(false);
    expect(isNightBand(skyBand(ist("20:59")))).toBe(false);
  });
});
