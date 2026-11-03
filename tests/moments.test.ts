import { describe, expect, it } from "vitest";
import { baseline, detectMoments, type Snapshot } from "@/lib/moments";

const snap = (over: Partial<Snapshot> = {}): Snapshot => ({
  today: "2026-11-10",
  doneToday: false,
  bothDoneToday: false,
  streak: 4,
  onIceDay: null,
  level: 2,
  milestonesReached: [],
  answered: [],
  ...over,
});

describe("signature moments (design §12.4)", () => {
  it("records a silent baseline the first time", () => {
    const s = snap({ doneToday: true, level: 5, milestonesReached: [15] });
    const r = detectMoments(null, s);
    expect(r.moments).toEqual([]);
    expect(r.seen).toEqual(baseline(s));
  });

  it("plays day complete once per day", () => {
    const seen = baseline(snap());
    const first = detectMoments(seen, snap({ doneToday: true, streak: 5 }));
    expect(first.moments).toEqual([{ kind: "day", streak: 5 }]);
    const again = detectMoments(
      first.seen,
      snap({ doneToday: true, streak: 5 }),
    );
    expect(again.moments).toEqual([]);
  });

  it("draws the rainbow when both are done", () => {
    const seen = baseline(snap({ doneToday: true }));
    const r = detectMoments(
      seen,
      snap({ doneToday: true, bothDoneToday: true }),
    );
    expect(r.moments).toEqual([{ kind: "rainbow" }]);
  });

  it("celebrates each new milestone and level, in order", () => {
    const seen = baseline(snap({ milestonesReached: [15] }));
    const r = detectMoments(
      seen,
      snap({
        doneToday: true,
        streak: 30,
        milestonesReached: [30, 15],
        level: 3,
      }),
    );
    expect(r.moments).toEqual([
      { kind: "day", streak: 30 },
      { kind: "milestone", milestone: 30 },
      { kind: "level", level: 3 },
    ]);
  });

  it("shows the frost the first time a day goes on ice", () => {
    const seen = baseline(snap());
    const r = detectMoments(seen, snap({ onIceDay: "2026-11-09" }));
    expect(r.moments).toEqual([{ kind: "ice", day: "2026-11-09" }]);
    expect(
      detectMoments(r.seen, snap({ onIceDay: "2026-11-09" })).moments,
    ).toEqual([]);
  });

  it("plays a restore answer first: thaw on approve, shatter otherwise", () => {
    const seen = baseline(snap({ onIceDay: "2026-11-09" }));
    const r = detectMoments(
      seen,
      snap({
        doneToday: true,
        answered: [
          { id: "a", day: "2026-11-09", status: "approved", streak: 4 },
          { id: "b", day: "2026-11-02", status: "rejected", streak: 9 },
        ],
      }),
    );
    expect(r.moments.slice(0, 2)).toEqual([
      { kind: "thaw", day: "2026-11-09" },
      { kind: "shatter", day: "2026-11-02", streak: 9 },
    ]);
    expect(r.seen.restores).toEqual(["a", "b"]);
  });

  it("waves when a new nudge arrives, once", () => {
    const seen = baseline(
      snap({ lastNudge: { id: 1, message: "Race you 🏁" } }),
    );
    const r = detectMoments(
      seen,
      snap({ lastNudge: { id: 2, message: "One problem. Just one. 🥺" } }),
    );
    expect(r.moments).toEqual([
      { kind: "nudge", message: "One problem. Just one. 🥺" },
    ]);
    expect(
      detectMoments(r.seen, snap({ lastNudge: { id: 2, message: "x" } }))
        .moments,
    ).toEqual([]);
  });
});
