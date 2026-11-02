import { describe, expect, it } from "vitest";
import { isAllowedEmail, parseAllowlist } from "@/lib/auth/allowlist";
import {
  INVITE_ALPHABET,
  INVITE_LENGTH,
  generateInviteCode,
  normalizeInviteCode,
} from "@/lib/pair/invite";
import {
  leetcodeUsername,
  profileInput,
  startDateInput,
} from "@/lib/validation/onboarding";
import { istMidnight } from "@/lib/time";

describe("allowlist", () => {
  const raw = " Asha@Gmail.com , ravi@gmail.com ,";
  it("parses, trims and lowercases", () => {
    expect([...parseAllowlist(raw)]).toEqual([
      "asha@gmail.com",
      "ravi@gmail.com",
    ]);
  });
  it("matches case-insensitively and rejects everyone else", () => {
    expect(isAllowedEmail("ASHA@gmail.com", raw)).toBe(true);
    expect(isAllowedEmail("someone@gmail.com", raw)).toBe(false);
    expect(isAllowedEmail(undefined, raw)).toBe(false);
    expect(isAllowedEmail("asha@gmail.com", undefined)).toBe(false);
  });
});

describe("invite codes", () => {
  it("are 6 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_LENGTH);
      for (const c of code) expect(INVITE_ALPHABET).toContain(c);
    }
    expect(INVITE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("skip biased bytes", () => {
    // 248+ would bias the first characters; it must be rejected.
    let calls = 0;
    const bytes = () => {
      calls++;
      return calls === 1
        ? new Uint8Array(12).fill(255)
        : new Uint8Array(12).fill(0);
    };
    expect(generateInviteCode(bytes)).toBe("AAAAAA");
    expect(calls).toBe(2);
  });

  it("normalize what people type", () => {
    expect(normalizeInviteCode(" ab3-k9z ")).toBe("AB3K9Z");
    expect(normalizeInviteCode("AB3K9")).toBeNull();
    expect(normalizeInviteCode("AB0K9Z")).toBeNull(); // 0 isn't in the alphabet
  });
});

describe("onboarding input", () => {
  it("validates the profile", () => {
    expect(
      profileInput.safeParse({
        displayName: " Asha ",
        avatarKey: "mochi",
        color: "sky",
      }).data,
    ).toEqual({ displayName: "Asha", avatarKey: "mochi", color: "sky" });
    expect(
      profileInput.safeParse({
        displayName: "",
        avatarKey: "mochi",
        color: "sky",
      }).success,
    ).toBe(false);
    expect(
      profileInput.safeParse({
        displayName: "A",
        avatarKey: "dragon",
        color: "sky",
      }).success,
    ).toBe(false);
    expect(
      profileInput.safeParse({
        displayName: "A",
        avatarKey: "pip",
        color: "red",
      }).success,
    ).toBe(false);
  });

  it("validates LeetCode usernames", () => {
    expect(leetcodeUsername.safeParse(" iteshxt ").data).toBe("iteshxt");
    expect(leetcodeUsername.safeParse("lee_215.x-y").success).toBe(true);
    expect(leetcodeUsername.safeParse("bad name").success).toBe(false);
    expect(leetcodeUsername.safeParse("https://leetcode.com/u/x").success).toBe(
      false,
    );
  });

  it("allows start dates from today (IST) to 90 days out", () => {
    // 23:30 IST on 3 Nov is still 3 Nov, whatever the server's timezone.
    const now = new Date(istMidnight("2026-11-03").getTime() + 23.5 * 3600e3);
    const schema = startDateInput(now);
    const ok = (d: string) => schema.safeParse({ startDate: d }).success;
    expect(ok("2026-11-02")).toBe(false);
    expect(ok("2026-11-03")).toBe(true);
    expect(ok("2027-02-01")).toBe(true); // +90
    expect(ok("2027-02-02")).toBe(false);
    expect(ok("2026-02-30")).toBe(false);
    expect(ok("3 Nov")).toBe(false);
  });
});
