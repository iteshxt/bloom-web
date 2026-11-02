// Engine scenarios from techspec §14.1. Test names carry the scenario number.

import { describe, expect, it } from "vitest";
import {
  canFinalize,
  ensureToday,
  nextTargetEffectiveDate,
  respondRestore,
} from "@/lib/engine";
import { dayEndsAt } from "@/lib/time";
import { Sim, START, at, day } from "./sim";

describe("solves and completion", () => {
  it("#1 target 1, solve at 14:00 completes the day", () => {
    const sim = new Sim();
    const sub = sim.solve("two-sum", START, "14:00");

    expect(sub).toMatchObject({ assignedDay: START, counted: true, xp: 10 });
    expect(sim.day(START)?.status).toBe("complete");
    expect(sim.run.length).toBe(1);
    expect(sim.of("xp").map((x) => [x.reason, x.amount])).toEqual([
      ["solve", 10],
      ["day_complete", 20],
    ]);
    expect(sim.state.xpTotal).toBe(30);
    expect(sim.notifs("partner_done")).toHaveLength(1);
  });

  it("#2 the same slug twice in a day counts once", () => {
    const sim = new Sim();
    sim.solve("two-sum", START, "14:00");
    const second = sim.solve("two-sum", START, "15:00");

    expect(second).toMatchObject({ counted: false, xp: 0 });
    expect(sim.day(START)?.solvedSlugs).toEqual(["two-sum"]);
  });

  it("#3 grace-hour burst fills yesterday first, then overflows to today", () => {
    const sim = new Sim({}, [{ effectiveFrom: START, target: 2 }]);
    sim.solve("a", day(0), "14:00");
    const subs = sim.sync([
      { slug: "b", at: at(day(1), "00:20") },
      { slug: "c", at: at(day(1), "00:35") },
      { slug: "d", at: at(day(1), "00:50") },
    ]);

    expect(subs.map((s) => s.assignedDay)).toEqual([day(0), day(1), day(1)]);
    expect(sim.day(day(0))?.status).toBe("complete");
    expect(sim.day(day(1))?.status).toBe("complete");
    expect(sim.run.length).toBe(2);
    expect(sim.badgeCount("night_owl")).toBe(1);
  });

  it("#4 a solve at exactly 01:00:00 IST belongs to today only", () => {
    expect(new Sim().solve("a", day(1), "01:00:00").assignedDay).toBe(day(1));
    expect(new Sim().solve("a", day(1), "00:59:59").assignedDay).toBe(day(0));
    expect(new Sim().solve("a", day(1), "00:00:00").assignedDay).toBe(day(0));
  });

  it("#5 grace solve of a slug already counted yesterday goes to today", () => {
    const sim = new Sim({}, [{ effectiveFrom: START, target: 2 }]);
    sim.solve("a", day(0), "14:00");
    expect(sim.solve("a", day(1), "00:20").assignedDay).toBe(day(1));
    expect(sim.day(day(0))?.solvedSlugs).toEqual(["a"]);
  });

  it("#6 a grace solve synced late still counts for yesterday; finalization waits for a post-boundary sync", () => {
    const sim = new Sim();
    // The 01:20 tick's last sync ran at 00:55, before the boundary.
    expect(sim.finalize(at(day(1), "01:20"), at(day(1), "00:55"))).toEqual([]);

    const [sub] = sim.sync(
      [{ slug: "a", at: at(day(1), "00:30") }],
      at(day(1), "01:40"),
    );
    expect(sub.assignedDay).toBe(day(0));
    expect(sim.finalize(at(day(1), "01:40"))).toEqual([day(0)]);
    expect(sim.day(day(0))?.status).toBe("complete");

    // With LeetCode unreachable, the day finalizes 6 h after it ends.
    const ends = dayEndsAt(day(5));
    const stale = at(day(5), "12:00");
    expect(
      canFinalize(day(5), new Date(ends.getTime() + 6 * 3600e3 - 1), stale, 60),
    ).toBe(false);
    expect(
      canFinalize(day(5), new Date(ends.getTime() + 6 * 3600e3), stale, 60),
    ).toBe(true);
  });
});

describe("misses and restores", () => {
  it("#7 a miss with tokens 3 and streak 5 puts the run on ice", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));

    expect(sim.run.atRiskDay).toBe(day(5));
    expect(sim.run.length).toBe(5);
    expect(sim.day(day(5))?.status).toBe("missed");
    expect(sim.notifs("streak_on_ice")).toHaveLength(1);
    expect(sim.notifs("streak_on_ice")[0].data.windowEndsAt).toBe(
      dayEndsAt(day(6)).toISOString(),
    );
  });

  it("#8 a miss with 0 tokens ends the run", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.run.tokensRemaining = 0;
    const old = sim.run;
    sim.miss(day(5));

    const ended = sim.state.runs.find((r) => r.id === old.id)!;
    expect(ended).toMatchObject({
      endedOn: day(5),
      endReason: "no_tokens",
      length: 5,
    });
    expect(sim.run.startedOn).toBe(day(6));
    expect(sim.notifs("streak_broken")).toHaveLength(1);
    expect(sim.notifs("streak_broken")[0].to).toBe("both");
  });

  it("#9 a miss with streak 0 ends the run quietly", () => {
    const sim = new Sim();
    sim.miss(day(0));

    expect(sim.state.runs[0]).toMatchObject({
      endedOn: day(0),
      endReason: "missed",
    });
    expect(sim.run.startedOn).toBe(day(1));
    expect(sim.notifs("streak_on_ice")).toHaveLength(0);
    expect(sim.notifs("streak_broken")).toHaveLength(0);
    // A 0-day run ending isn't news: keep it out of the activity feed.
    expect(
      sim.of("activity").filter((a) => a.type === "run_ended"),
    ).toHaveLength(0);
  });

  it("#10 request → approve with make-up, then D+1 solves target + make-up", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    expect(sim.request(at(day(6), "09:00"), "I had a fever").ok).toBe(true);
    expect(sim.respond(at(day(6), "10:00"), true).ok).toBe(true);

    expect(sim.day(day(5))?.status).toBe("restored");
    expect(sim.day(day(6))?.makeupRequired).toBe(1);
    sim.solve("x", day(6), "12:00");
    expect(sim.day(day(6))?.status).toBe("pending");
    sim.solve("y", day(6), "13:00");

    expect(sim.day(day(6))?.status).toBe("complete");
    expect(sim.run).toMatchObject({
      length: 7,
      tokensRemaining: 2,
      restoresUsed: 1,
    });
    expect(
      sim.of("xp").filter((x) => x.reason === "makeup_complete"),
    ).toHaveLength(1);
    expect(sim.badgeCount("comeback")).toBe(1);
    expect(sim.notifs("restore_requested")[0].to).toBe("partner");
    expect(sim.notifs("restore_answered")[0].data.approved).toBe(true);
  });

  it("#11 approved, but D+1 reaches only its target: make-up failure reverts the restored day", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    sim.request(at(day(6), "09:00"));
    sim.respond(at(day(6), "10:00"), true);
    const old = sim.run;
    sim.solve("x", day(6), "12:00");
    sim.miss(day(6));

    expect(sim.day(day(6))?.status).toBe("missed");
    expect(sim.day(day(5))?.status).toBe("missed");
    const ended = sim.state.runs.find((r) => r.id === old.id)!;
    expect(ended).toMatchObject({
      endedOn: day(6),
      endReason: "makeup_failed",
      length: 5,
      tokensRemaining: 2, // the token stays spent
    });
    expect(sim.run.startedOn).toBe(day(7));
    expect(sim.notifs("streak_broken")).toHaveLength(1);
  });

  it("#12 request → reject ends the run; the new run includes D+1 progress", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    sim.solve("x", day(6), "08:00"); // held while on ice
    expect(sim.day(day(6))?.status).toBe("pending");
    const old = sim.run;
    sim.request(at(day(6), "09:00"));
    sim.respond(at(day(6), "10:00"), false, 0, "Not this time");

    const ended = sim.state.runs.find((r) => r.id === old.id)!;
    expect(ended).toMatchObject({
      endedOn: day(5),
      endReason: "restore_rejected",
      tokensRemaining: 3,
    });
    expect(sim.run).toMatchObject({ startedOn: day(6), length: 1 });
    expect(sim.day(day(6))?.makeupRequired).toBe(0);
    expect(sim.notifs("restore_answered")[0].data.approved).toBe(false);
    expect(sim.notifs("streak_broken")).toHaveLength(0);
  });

  it("#13 no request: when the window ends the run ends and a new run starts on D+1", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    const old = sim.run;
    sim.solve("x", day(6), "14:00");
    sim.finalize(at(day(7), "02:00"));

    const ended = sim.state.runs.find((r) => r.id === old.id)!;
    expect(ended).toMatchObject({
      endedOn: day(5),
      endReason: "missed",
      length: 5,
    });
    expect(sim.run).toMatchObject({ startedOn: day(6), length: 1 });
    expect(sim.day(day(6))?.status).toBe("complete");
    expect(sim.notifs("streak_broken")).toHaveLength(1);
    expect(sim.notifs("streak_broken")[0].to).toBe("both");
  });

  it("#14 request with no response expires when the window ends", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    const old = sim.run;
    sim.request(at(day(6), "09:00"));
    sim.finalize(at(day(7), "02:00"));

    expect(sim.state.restores[0].status).toBe("expired");
    expect(sim.state.runs.find((r) => r.id === old.id)).toMatchObject({
      endReason: "restore_expired",
      endedOn: day(5),
    });
    expect(sim.notifs("streak_broken")).toHaveLength(1);
    // Too late to answer now.
    const late = respondRestore(
      sim.state,
      { now: at(day(7), "02:05"), newId: sim.newId },
      {
        requestId: sim.state.restores[0].id,
        approve: true,
        approver: { approvalsGiven: 0, badges: [] },
      },
    );
    expect(late).toEqual({ ok: false, error: "request_not_pending" });
  });

  it("#15 D+1 target met before approval: held, then incomplete until the make-up is paid", () => {
    const sim = new Sim();
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    sim.solve("x", day(6), "08:00");
    expect(sim.day(day(6))?.status).toBe("pending");

    sim.request(at(day(6), "09:00"));
    sim.respond(at(day(6), "10:00"), true);
    expect(sim.day(day(6))).toMatchObject({
      status: "pending",
      makeupRequired: 1,
    });

    sim.solve("y", day(6), "11:00");
    expect(sim.day(day(6))?.status).toBe("complete");
    expect(sim.run.length).toBe(7);
  });

  it("restore rules: not at risk, one live request, cancel, closed window", () => {
    const sim = new Sim();
    expect(sim.request(at(day(0), "09:00"))).toEqual({
      ok: false,
      error: "not_at_risk",
    });

    sim.playDays(day(0), 3);
    sim.miss(day(3));
    const first = sim.request(at(day(4), "09:00"));
    expect(first.ok).toBe(true);
    expect(sim.request(at(day(4), "09:05"))).toEqual({
      ok: false,
      error: "already_requested",
    });
    if (first.ok)
      expect(sim.cancel(at(day(4), "09:10"), first.value.id).ok).toBe(true);
    expect(sim.request(at(day(4), "09:15")).ok).toBe(true);
    expect(sim.respond(dayEndsAt(day(4)), true)).toEqual({
      ok: false,
      error: "window_closed",
    });
  });
});

describe("milestones and targets", () => {
  it("#16 reaching 15 for the first time", () => {
    const sim = new Sim();
    sim.playDays(day(0), 14);
    sim.run.tokensRemaining = 1;
    sim.play(day(14));

    expect(sim.run.length).toBe(15);
    expect(sim.of("milestone")).toEqual([
      {
        kind: "milestone",
        milestone: 15,
        firstTime: true,
        runId: sim.run.id,
        day: day(14),
      },
    ]);
    expect(sim.of("gift_unlock")).toEqual([
      { kind: "gift_unlock", milestone: 15 },
    ]);
    expect(sim.run.tokensRemaining).toBe(3);
    expect(sim.of("xp").find((x) => x.reason === "milestone")?.amount).toBe(
      150,
    );
    expect(sim.badgeCount("ms_15")).toBe(1);
    expect(sim.state.achievements).toEqual([15]);
    expect(sim.notifs("milestone_reached")[0].to).toBe("both");
  });

  it("#17 reaching 15 again in a later run: celebration and refill, no gift", () => {
    const sim = new Sim();
    sim.state.achievements = [15];
    sim.playDays(day(0), 14);
    sim.run.tokensRemaining = 2;
    sim.play(day(14));

    expect(sim.of("milestone")[0]).toMatchObject({
      milestone: 15,
      firstTime: false,
    });
    expect(sim.of("gift_unlock")).toHaveLength(0);
    expect(sim.of("xp").filter((x) => x.reason === "milestone")).toHaveLength(
      0,
    );
    expect(sim.run.tokensRemaining).toBe(3);
  });

  it("#18 a restored day that lands on a milestone triggers it", () => {
    const sim = new Sim();
    sim.playDays(day(0), 14);
    sim.miss(day(14));
    sim.request(at(day(15), "09:00"));
    sim.respond(at(day(15), "10:00"), true);

    expect(sim.run.length).toBe(15);
    expect(sim.of("milestone")[0]).toMatchObject({
      milestone: 15,
      firstTime: true,
      day: day(14),
    });
    expect(sim.run.tokensRemaining).toBe(3);
  });

  it("#19 a target change on day C applies from C+1; day C keeps its old target", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "10:00");
    const effective = nextTargetEffectiveDate(at(day(0), "15:00"));
    expect(effective).toBe(day(1));
    sim.state.targets.push({ effectiveFrom: effective, target: 3 });

    const r = ensureToday(sim.state, {
      now: at(day(1), "09:00"),
      newId: sim.newId,
    });
    expect(r.state.days[day(0)].target).toBe(1);
    expect(r.state.days[day(1)].target).toBe(3);
    // A change made in the grace hour also waits for the next calendar date.
    expect(nextTargetEffectiveDate(at(day(1), "00:30"))).toBe(day(2));
  });
});

describe("recovery and pre-season", () => {
  // The same solves, processed live with a tick every night versus all at once
  // after the server was down, must give the same result.
  function project(sim: Sim) {
    return {
      days: Object.fromEntries(
        Object.values(sim.state.days).map((d) => [
          d.day,
          { status: d.status, solved: d.solvedSlugs, runId: d.runId },
        ]),
      ),
      runs: sim.state.runs.map((r) => ({
        startedOn: r.startedOn,
        length: r.length,
        endedOn: r.endedOn,
        endReason: r.endReason,
        atRiskDay: r.atRiskDay,
        tokens: r.tokensRemaining,
      })),
      xp: sim.state.xpTotal,
      badges: [...sim.state.badges].sort(),
    };
  }

  const scripts = {
    "grace save after a gap": [
      { slug: "a", at: at(day(0), "14:00") },
      { slug: "b", at: at(day(1), "14:00") },
      { slug: "c", at: at(day(2), "14:00") },
      { slug: "d", at: at(day(4), "00:30") }, // saves day 3
      { slug: "e", at: at(day(4), "14:00") },
    ],
    "miss, on ice, window expires": [
      { slug: "a", at: at(day(0), "14:00") },
      { slug: "b", at: at(day(1), "14:00") },
      { slug: "c", at: at(day(2), "14:00") },
      { slug: "d", at: at(day(4), "14:00") }, // day 3 missed
      { slug: "e", at: at(day(5), "14:00") },
    ],
  };

  const expectedRuns: Record<string, ReturnType<typeof project>["runs"]> = {
    "grace save after a gap": [
      // Day 3 saved in the grace hour; day 5 has no solve, so the run is on ice.
      {
        startedOn: day(0),
        length: 5,
        endedOn: undefined,
        endReason: undefined,
        atRiskDay: day(5),
        tokens: 3,
      },
    ],
    "miss, on ice, window expires": [
      {
        startedOn: day(0),
        length: 3,
        endedOn: day(3),
        endReason: "missed",
        atRiskDay: undefined,
        tokens: 3,
      },
      {
        startedOn: day(4),
        length: 2,
        endedOn: undefined,
        endReason: undefined,
        atRiskDay: undefined,
        tokens: 3,
      },
    ],
  };

  for (const [name, solves] of Object.entries(scripts)) {
    it(`#20 server down for days, then a tick: ${name}`, () => {
      const live = new Sim();
      for (let i = 0; i <= 5; i++) {
        for (const s of solves.filter(
          (x) => x.at >= at(day(i), "01:00") && x.at < at(day(i + 1), "01:00"),
        )) {
          live.sync([s]);
        }
        live.finalize(at(day(i + 1), "02:00"));
      }

      const down = new Sim();
      const recovered = at(day(6), "03:00");
      down.sync(solves, recovered);
      down.finalize(recovered);

      expect(project(down)).toEqual(project(live));
      expect(project(down).runs).toEqual(expectedRuns[name]);
    });
  }

  it("#21 solves before the start date are stored but don't count", () => {
    const sim = new Sim();
    const sub = sim.solve("warmup", day(-1), "14:00");

    expect(sub).toMatchObject({ assignedDay: day(-1), counted: false, xp: 0 });
    expect(sim.day(day(-1))).toBeUndefined();
    expect(sim.run.length).toBe(0);
    expect(sim.state.xpTotal).toBe(0);
    // A grace solve on the start date can't spill into pre-season.
    expect(new Sim().solve("a", day(0), "00:30").assignedDay).toBe(day(0));
  });

  it("#24 make-up off: approve, then D+1 below its target reverts the restore", () => {
    const sim = new Sim({ makeupEnabled: false });
    sim.playDays(day(0), 5);
    sim.miss(day(5));
    sim.request(at(day(6), "09:00"));
    sim.respond(at(day(6), "10:00"), true);
    expect(sim.day(day(6))?.makeupRequired ?? 0).toBe(0);
    const old = sim.run;
    sim.miss(day(6));

    expect(sim.day(day(5))?.status).toBe("missed");
    expect(sim.day(day(6))?.status).toBe("missed");
    expect(sim.state.runs.find((r) => r.id === old.id)).toMatchObject({
      endReason: "makeup_failed",
      endedOn: day(6),
      tokensRemaining: 2,
    });
    expect(sim.run.startedOn).toBe(day(7));
    expect(sim.notifs("streak_on_ice")).toHaveLength(1); // only for day 5
  });
});
