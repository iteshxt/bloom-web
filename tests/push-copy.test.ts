import { describe, expect, it } from "vitest";
import { BADGES } from "@/lib/badges/catalog";
import { levelTitle, notificationCopy, type CopyInput } from "@/lib/push/copy";
import { istMidnight } from "@/lib/time";

const at = (day: string, time: string) => {
  const [h, m] = time.split(":").map(Number);
  return new Date(istMidnight(day).getTime() + (h * 60 + m) * 60_000);
};

const copy = (over: Partial<CopyInput>) =>
  notificationCopy({
    kind: "partner_done",
    data: {},
    recipientIsActor: false,
    otherName: "Riya",
    recipientId: "me",
    now: at("2026-11-05", "21:05"),
    ...over,
  });

const ALL_KINDS = [
  "reminder_evening",
  "reminder_late",
  "reminder_grace",
  "partner_done",
  "streak_on_ice",
  "restore_ask",
  "streak_broken",
  "restore_requested",
  "restore_closing",
  "restore_answered",
  "target_changed",
  "milestone_reached",
  "gift_owed",
  "gift_revealed",
  "gift_received",
  "level_up",
  "badge_earned",
  "sync_failing",
  "nudge",
];

// Emoji in the copy, counted as extended pictographic characters.
const emoji = (s: string) => [...s.matchAll(/\p{Extended_Pictographic}/gu)];

describe("push copy (design §14.2)", () => {
  it("matches the design's wording, with the partner's name", () => {
    expect(copy({ kind: "partner_done" })).toMatchObject({
      title: "Riya bloomed today",
      body: "Your move 👀",
      url: "/",
    });
    expect(
      copy({ kind: "reminder_evening", data: { solved: 0, required: 1 } }),
    ).toMatchObject({
      title: "Your flower's thirsty",
      body: "3 hours left today. 0 of 1 done 🌱",
    });
    expect(
      copy({ kind: "restore_requested", data: { message: "I had a fever" } }),
    ).toMatchObject({
      title: "Riya needs a little sunshine",
      body: '"I had a fever" · Tap to decide',
      url: "/restores",
    });
    expect(
      copy({ kind: "restore_answered", data: { approved: true, makeup: 1 } }),
    ).toMatchObject({
      title: "Riya thawed your flower 💖",
      body: "Finish today plus 1 make-up to keep it",
    });
    expect(copy({ kind: "level_up", data: { level: 7 } }).title).toBe(
      "Level 7: Bloomer",
    );
    expect(
      copy({ kind: "badge_earned", data: { badge: "night_owl" } }),
    ).toMatchObject({
      title: "New badge: Night Owl",
      body: "Saved a day in the grace hour 🦉",
    });
  });

  it("speaks to the right person for shared events", () => {
    expect(
      copy({
        kind: "milestone_reached",
        data: { milestone: 30, firstTime: true },
        recipientIsActor: true,
      }),
    ).toMatchObject({
      title: "30 days!",
      body: "Your bouquet bloomed. Riya's gift is unlocked 🎁",
    });
    expect(
      copy({
        kind: "milestone_reached",
        data: { milestone: 30, firstTime: true },
        recipientIsActor: false,
      }),
    ).toMatchObject({
      title: "Riya hit 30 days!",
      body: "Your gift for Riya is unlocked. Is it ready? 👀",
    });
    expect(
      copy({
        kind: "streak_broken",
        data: { length: 23 },
        recipientIsActor: true,
      }).body,
    ).toBe("Your 23-day streak ended. Day 1 starts now 🌱");
    expect(
      copy({ kind: "target_changed", data: { target: 3 }, recipientId: "abc" }),
    ).toMatchObject({
      body: "Riya set your target to 3, starting tomorrow",
      url: "/player/abc",
    });
  });

  it("never uses pronouns and keeps at most one emoji, at the end", () => {
    for (const kind of ALL_KINDS) {
      for (const recipientIsActor of [true, false]) {
        const c = copy({
          kind,
          recipientIsActor,
          data: {
            approved: true,
            firstTime: true,
            milestone: 15,
            badge: "hat_trick",
          },
        });
        for (const text of [c.title, c.body]) {
          expect(text).not.toMatch(/\b(she|he|her|his|him)\b/i);
          const found = emoji(text);
          expect(found.length).toBeLessThanOrEqual(1);
          if (found.length === 1)
            expect(
              text.trimEnd().endsWith(found[0][0]) ||
                /\p{Extended_Pictographic}️?$/u.test(text.trimEnd()),
            ).toBe(true);
        }
      }
    }
  });

  it("has copy for every badge and level", () => {
    for (const b of Object.values(BADGES))
      expect(emoji(b.cheer).length).toBe(1);
    expect(levelTitle(1)).toBe("Seedling");
    expect(levelTitle(10)).toBe("Evergreen");
    expect(levelTitle(42)).toBe("Evergreen");
  });
});
