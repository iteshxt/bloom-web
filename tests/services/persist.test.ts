import { describe, expect, it } from "vitest";
import { buildSavePayload } from "@/lib/services/persist";
import { Sim, at, day } from "../engine/sim";

const refs = { playerId: "p1", pairId: "pair", partnerId: "p2" };

describe("buildSavePayload", () => {
  it("maps state, solves and effects to rows for save_player_state", () => {
    const sim = new Sim();
    const subs = sim.sync([{ slug: "two-sum", at: at(day(0), "14:00") }]);
    const now = at(day(1), "02:00");
    sim.finalize(now);

    const p = buildSavePayload({
      refs,
      state: sim.state,
      effects: sim.effects,
      submissions: subs,
      sync: { ok: true, attemptedAt: now },
      now,
    });

    expect(p).toMatchObject({
      player_id: "p1",
      pair_id: "pair",
      partner_id: "p2",
      last_finalized_day: day(0),
      sync: { ok: true, attempted_at: now.toISOString(), error: null },
    });
    expect(p.days).toEqual([
      {
        day: day(0),
        target: 1,
        makeup_required: 0,
        solved_count: 1,
        status: "complete",
        run_id: sim.run.id,
        completed_at: at(day(0), "14:00").toISOString(),
        finalized_at: now.toISOString(),
      },
    ]);
    expect(p.submissions).toEqual([
      {
        source: "leetcode",
        lc_submission_id: subs[0].id,
        title_slug: "two-sum",
        submitted_at: at(day(0), "14:00").toISOString(),
        assigned_day: day(0),
        counted: true,
        is_resolve: false,
        xp: 10,
      },
    ]);
    expect(p.xp_events).toEqual([
      { amount: 10, reason: "solve", ref: subs[0].id },
      { amount: 20, reason: "day_complete", ref: day(0) },
    ]);
    expect(p.badges).toEqual([{ player_id: "p1", badge_key: "first_blood" }]);
    expect(p.notifications.map((n) => [n.kind, n.player_id])).toEqual([
      ["badge_earned", "p1"], // first_blood, on the solve
      ["partner_done", "p2"], // then the day completes
    ]);
  });

  it("gives 'both' notifications one dedupe key per recipient, and drops partner rows before the partner joins", () => {
    const sim = new Sim();
    sim.playDays(day(0), 14);
    sim.effects = [];
    sim.play(day(14)); // reaches 15

    const both = buildSavePayload({
      refs,
      state: sim.state,
      effects: sim.effects,
      submissions: [],
      now: new Date(),
    });
    const milestone = both.notifications.filter(
      (n) => n.kind === "milestone_reached",
    );
    expect(milestone.map((n) => n.player_id)).toEqual(["p1", "p2"]);
    expect(new Set(milestone.map((n) => n.dedupe_key)).size).toBe(2);
    expect(both.achievements).toEqual([
      { milestone: 15, run_id: sim.run.id, achieved_on: day(14) },
    ]);
    expect(both.gift_unlocks).toEqual([{ milestone: 15 }]);

    const solo = buildSavePayload({
      refs: { ...refs, partnerId: null },
      state: sim.state,
      effects: sim.effects,
      submissions: [],
      now: new Date(),
    });
    expect(solo.notifications.every((n) => n.player_id === "p1")).toBe(true);
  });

  it("omits sync when it was skipped, so the database doesn't count a failure", () => {
    // JSON null is not SQL NULL: save_player_state treats any present `sync`
    // as an attempt, so a skipped sync must leave the key out entirely.
    const sim = new Sim();
    const p = buildSavePayload({
      refs,
      state: sim.state,
      effects: [],
      submissions: [],
      now: new Date(),
    });
    expect(p).not.toHaveProperty("sync");
    expect(JSON.parse(JSON.stringify(p))).not.toHaveProperty("sync");
  });

  it("assigns a partner's badge to the partner", () => {
    const sim = new Sim();
    sim.playDays(day(0), 2);
    sim.miss(day(2));
    sim.request(at(day(3), "09:00"));
    sim.effects = [];
    sim.respond(at(day(3), "10:00"), true, 2);

    const p = buildSavePayload({
      refs,
      state: sim.state,
      effects: sim.effects,
      submissions: [],
      now: new Date(),
    });
    expect(p.badges).toContainEqual({
      player_id: "p2",
      badge_key: "big_heart",
    });
    expect(p.restore_requests[0]).toMatchObject({
      approver_id: "p2",
      status: "approved",
    });
  });
});
