import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  derivePlayer,
  pickBanner,
  urgency,
  type PairInput,
  type PlayerInput,
} from "@/lib/dashboard/derive";
import { istMidnight } from "@/lib/time";

const at = (day: string, time: string) => {
  const [h, m] = time.split(":").map(Number);
  return new Date(istMidnight(day).getTime() + (h * 60 + m) * 60_000);
};

const pair: PairInput = {
  startDate: "2026-11-04",
  milestones: [15, 30, 50, 100],
  tokensPerRun: 3,
  graceMinutes: 60,
};

const player = (over: Partial<PlayerInput> = {}): PlayerInput => ({
  id: "p1",
  name: "Asha",
  color: "blush",
  xpTotal: 0,
  level: 1,
  run: { length: 0, tokensRemaining: 3, atRiskDay: null },
  days: {},
  targets: [],
  lastSyncAt: null,
  ...over,
});

describe("dashboard view model", () => {
  it("counts down to the start date before the challenge begins", () => {
    const v = derivePlayer(player(), pair, at("2026-11-02", "10:00"));
    expect(v.startsInDays).toBe(2);
    expect(v.focus).toBeNull();
  });

  it("shows today's progress, make-up separately, and time to midnight", () => {
    const v = derivePlayer(
      player({
        days: {
          "2026-11-05": {
            target: 2,
            makeupRequired: 1,
            solvedCount: 1,
            status: "pending",
            finalized: false,
          },
        },
      }),
      pair,
      at("2026-11-05", "20:48"),
    );
    expect(v.focus).toMatchObject({
      which: "today",
      solved: 1,
      target: 2,
      makeup: 1,
      required: 3,
      done: false,
    });
    expect(countdownLabel(v.focus!)).toBe("3h 12m left");
    expect(urgency(v.focus!)).toBe("calm");
  });

  it("uses the target that applies today when there's no day row yet", () => {
    const v = derivePlayer(
      player({ targets: [{ effectiveFrom: "2026-11-05", target: 3 }] }),
      pair,
      at("2026-11-05", "09:00"),
    );
    expect(v.focus).toMatchObject({ solved: 0, target: 3, required: 3 });
  });

  it("puts yesterday first during the grace hour while it can still be saved", () => {
    const now = at("2026-11-06", "00:18");
    const open = derivePlayer(
      player({
        days: {
          "2026-11-05": {
            target: 1,
            makeupRequired: 0,
            solvedCount: 0,
            status: "pending",
            finalized: false,
          },
        },
      }),
      pair,
      now,
    );
    expect(open.focus).toMatchObject({ which: "yesterday", day: "2026-11-05" });
    expect(countdownLabel(open.focus!)).toBe("Grace hour · 42m");
    expect(urgency(open.focus!)).toBe("grace");

    const saved = derivePlayer(
      player({
        days: {
          "2026-11-05": {
            target: 1,
            makeupRequired: 0,
            solvedCount: 1,
            status: "complete",
            finalized: false,
          },
        },
      }),
      pair,
      now,
    );
    expect(saved.focus?.which).toBe("today");
  });

  it("marks a done day and urgency thresholds", () => {
    const done = derivePlayer(
      player({
        days: {
          "2026-11-05": {
            target: 1,
            makeupRequired: 0,
            solvedCount: 1,
            status: "complete",
            finalized: false,
          },
        },
      }),
      pair,
      at("2026-11-05", "23:30"),
    );
    expect(countdownLabel(done.focus!)).toBe("Done for today");
    expect(urgency(done.focus!)).toBe("done");

    const late = derivePlayer(player(), pair, at("2026-11-05", "23:30"));
    expect(countdownLabel(late.focus!)).toBe("30m left");
    expect(urgency(late.focus!)).toBe("urgent");
    expect(
      urgency(derivePlayer(player(), pair, at("2026-11-05", "22:00")).focus!),
    ).toBe("soon");
  });

  it("finds the next milestone and level progress", () => {
    const v = derivePlayer(
      player({
        run: { length: 23, tokensRemaining: 2, atRiskDay: null },
        xpTotal: 450,
        level: 3,
      }),
      pair,
      at("2026-11-05", "12:00"),
    );
    expect(v.nextMilestone).toEqual({ milestone: 30, daysToGo: 7 });
    expect(v.tokens).toBe(2);
    // Level 3 spans 300 → 600 XP.
    expect([v.xpIntoLevel, v.xpLevelSpan]).toEqual([150, 300]);
    expect(
      derivePlayer(
        player({ run: { length: 120, tokensRemaining: 3, atRiskDay: null } }),
        pair,
        at("2026-11-05", "12:00"),
      ).nextMilestone,
    ).toBeNull();
  });

  it("flags sync trouble after 3 hours", () => {
    const now = at("2026-11-05", "12:00");
    expect(
      derivePlayer(player({ lastSyncAt: at("2026-11-05", "09:00") }), pair, now)
        .syncFailing,
    ).toBe(false);
    expect(
      derivePlayer(player({ lastSyncAt: at("2026-11-05", "08:59") }), pair, now)
        .syncFailing,
    ).toBe(true);
  });

  it("shows one banner, in priority order", () => {
    const now = at("2026-11-05", "12:00");
    const frosted = derivePlayer(
      player({
        run: { length: 5, tokensRemaining: 3, atRiskDay: "2026-11-04" },
        lastSyncAt: at("2026-11-05", "01:00"),
      }),
      pair,
      now,
    );
    expect(
      pickBanner({ me: frosted, pendingRequestFromPartner: { id: "r1" } }),
    ).toEqual({
      kind: "restore_request",
      requestId: "r1",
    });
    expect(
      pickBanner({ me: frosted, pendingRequestFromPartner: null }),
    ).toEqual({
      kind: "on_ice",
      missedDay: "2026-11-04",
    });
    const failing = derivePlayer(
      player({ lastSyncAt: at("2026-11-05", "01:00") }),
      pair,
      now,
    );
    expect(
      pickBanner({ me: failing, pendingRequestFromPartner: null }),
    ).toEqual({ kind: "sync_failing" });
    expect(
      pickBanner({
        me: derivePlayer(player(), pair, now),
        pendingRequestFromPartner: null,
      }),
    ).toBeNull();
  });
});
