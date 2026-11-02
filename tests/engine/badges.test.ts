// #23: each badge condition from PRD 4.10 is earned exactly once.

import { describe, expect, it } from "vitest";
import { Sim, at, day } from "./sim";

describe("#23 badges", () => {
  it("first_blood on the first counted solve only", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "14:00");
    sim.solve("b", day(0), "15:00");
    expect(sim.badgeCount("first_blood")).toBe(1);
    expect(
      sim.notifs("badge_earned").filter((n) => n.data.badge === "first_blood"),
    ).toHaveLength(1);
  });

  it("hat_trick on 3 distinct solves in one day", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "10:00");
    sim.solve("a", day(0), "10:30"); // duplicate doesn't count
    sim.solve("b", day(0), "11:00");
    expect(sim.badgeCount("hat_trick")).toBe(0);
    sim.solve("c", day(0), "12:00");
    sim.solve("d", day(0), "13:00");
    expect(sim.badgeCount("hat_trick")).toBe(1);
  });

  it("hard_hitter on the first Hard; hard_mode on 10 distinct Hards", () => {
    const sim = new Sim();
    sim.solve("easy", day(0), "09:00");
    expect(sim.badgeCount("hard_hitter")).toBe(0);
    for (let i = 0; i < 9; i++)
      sim.solve(`hard-${i}`, day(0), `1${i}:00`, "Hard");
    expect(sim.badgeCount("hard_hitter")).toBe(1);

    sim.solve("hard-0", day(1), "10:00", "Hard"); // re-solve: still 9 distinct
    expect(sim.badgeCount("hard_mode")).toBe(0);
    sim.solve("hard-9", day(1), "11:00", "Hard");
    expect(sim.badgeCount("hard_mode")).toBe(1);
  });

  it("early_bird on a solve before 08:00 IST", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "08:00");
    expect(sim.badgeCount("early_bird")).toBe(0);
    sim.solve("b", day(1), "07:59");
    sim.solve("c", day(2), "06:00");
    expect(sim.badgeCount("early_bird")).toBe(1);
  });

  it("night_owl only when a grace-hour solve saves yesterday", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "14:00");
    sim.solve("b", day(1), "00:20"); // yesterday already complete → today
    expect(sim.badgeCount("night_owl")).toBe(0);
    sim.solve("c", day(3), "00:20"); // day 2 had nothing: saved
    expect(sim.badgeCount("night_owl")).toBe(1);
  });

  it("explorer across 10 distinct topics", () => {
    const sim = new Sim();
    sim.solve("a", day(0), "10:00", "Easy", ["array", "hash-table", "string"]);
    sim.solve("b", day(0), "11:00", "Easy", ["array", "dp", "greedy", "graph"]);
    expect(sim.badgeCount("explorer")).toBe(0);
    sim.solve("c", day(0), "12:00", "Easy", ["tree", "bfs", "dfs", "heap"]);
    sim.solve("d", day(0), "13:00", "Easy", ["trie"]);
    expect(sim.badgeCount("explorer")).toBe(1);
  });

  it("century at 100 distinct problems", () => {
    const sim = new Sim();
    for (let i = 0; i < 99; i++)
      sim.state.history.firstCountedDay[`old-${i}`] = day(0);
    sim.solve("old-0", day(1), "10:00"); // re-solve: still 99
    expect(sim.badgeCount("century")).toBe(0);
    sim.solve("new", day(1), "11:00");
    sim.solve("newer", day(1), "12:00");
    expect(sim.badgeCount("century")).toBe(1);
  });

  it("perfect_week at a 7-day streak", () => {
    const sim = new Sim();
    sim.playDays(day(0), 6);
    expect(sim.badgeCount("perfect_week")).toBe(0);
    sim.playDays(day(6), 3);
    expect(sim.badgeCount("perfect_week")).toBe(1);
  });

  it("iron_will at 30 days only when the run used no restores", () => {
    const clean = new Sim();
    clean.playDays(day(0), 31);
    expect(clean.badgeCount("iron_will")).toBe(1);

    const restored = new Sim();
    restored.playDays(day(0), 5);
    restored.miss(day(5));
    restored.request(at(day(6), "09:00"));
    restored.respond(at(day(6), "10:00"), true);
    restored.solve("x", day(6), "11:00");
    restored.solve("y", day(6), "12:00");
    restored.finalize(at(day(7), "02:00"));
    restored.playDays(day(7), 25);
    expect(restored.run.length).toBe(32);
    expect(restored.badgeCount("iron_will")).toBe(0);
  });

  it("comeback on completing a make-up day", () => {
    const sim = new Sim();
    sim.playDays(day(0), 3);
    sim.miss(day(3));
    sim.request(at(day(4), "09:00"));
    sim.respond(at(day(4), "10:00"), true);
    sim.solve("x", day(4), "11:00");
    expect(sim.badgeCount("comeback")).toBe(0);
    sim.solve("y", day(4), "12:00");
    expect(sim.badgeCount("comeback")).toBe(1);
  });

  it("big_heart goes to the partner on their 3rd approval", () => {
    const second = new Sim();
    second.playDays(day(0), 2);
    second.miss(day(2));
    second.request(at(day(3), "09:00"));
    second.respond(at(day(3), "10:00"), true, 1);
    expect(second.badgeCount("big_heart")).toBe(0);

    const third = new Sim();
    third.playDays(day(0), 2);
    third.miss(day(2));
    third.request(at(day(3), "09:00"));
    third.respond(at(day(3), "10:00"), true, 2);
    expect(third.of("badge").filter((b) => b.key === "big_heart")).toEqual([
      { kind: "badge", key: "big_heart", player: "partner" },
    ]);
    expect(
      third.notifs("badge_earned").find((n) => n.data.badge === "big_heart")
        ?.to,
    ).toBe("partner");
  });

  it("ms_15 once, even when 15 is reached again", () => {
    const sim = new Sim();
    sim.playDays(day(0), 15);
    sim.miss(day(15));
    sim.finalize(at(day(17), "02:00")); // window expires, run ends
    sim.playDays(day(17), 15);
    expect(sim.of("milestone").map((m) => m.firstTime)).toEqual([true, false]);
    expect(sim.badgeCount("ms_15")).toBe(1);
  });
});
