import { describe, expect, it } from "vitest";
import { NUDGE_PRESETS, NUDGES_PER_DAY, nudgesLeft } from "@/lib/nudges";
import { nudgeInput } from "@/lib/validation/game";

const emoji = (s: string) => [...s.matchAll(/\p{Extended_Pictographic}/gu)];

describe("nudges (PRD 5.12)", () => {
  it("allows 3 a day", () => {
    expect(NUDGES_PER_DAY).toBe(3);
    expect(nudgesLeft(0)).toBe(3);
    expect(nudgesLeft(2)).toBe(1);
    expect(nudgesLeft(5)).toBe(0);
  });

  it("presets follow the voice: one emoji, at the end (design §14.1)", () => {
    for (const p of NUDGE_PRESETS) {
      expect(emoji(p)).toHaveLength(1);
      expect(p.trimEnd().endsWith(emoji(p)[0][0])).toBe(true);
    }
  });

  it("accepts custom text up to 140 characters, trimmed", () => {
    expect(nudgeInput.parse({ message: "  go go go  " }).message).toBe(
      "go go go",
    );
    expect(nudgeInput.safeParse({ message: "   " }).success).toBe(false);
    expect(nudgeInput.safeParse({ message: "x".repeat(141) }).success).toBe(
      false,
    );
  });
});
