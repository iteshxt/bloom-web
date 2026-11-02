import { describe, expect, it } from "vitest";
import { scheduledNotifications } from "@/lib/engine/reminders";
import type { NotificationKind } from "@/lib/engine";
import { Sim, at, day } from "./sim";

function fired(
  sim: Sim,
  now: Date,
  lastSyncSuccessAt: Date = now,
): NotificationKind[] {
  const r = scheduledNotifications(sim.state, {
    now,
    newId: sim.newId,
    lastSyncSuccessAt,
  });
  return r.effects.flatMap((e) => (e.kind === "notify" ? [e.notif] : []));
}

describe("scheduled notifications (techspec §9.5)", () => {
  it("evening and late reminders only while today is incomplete", () => {
    const sim = new Sim();
    expect(fired(sim, at(day(0), "20:59"))).toEqual([]);
    expect(fired(sim, at(day(0), "21:00"))).toEqual(["reminder_evening"]);
    expect(fired(sim, at(day(0), "22:59"))).toEqual(["reminder_evening"]);
    expect(fired(sim, at(day(0), "23:00"))).toEqual(["reminder_late"]);

    sim.solve("a", day(0), "22:00");
    expect(fired(sim, at(day(0), "23:10"))).toEqual([]);
  });

  it("dedupe keys are per player and day", () => {
    const sim = new Sim();
    const r = scheduledNotifications(sim.state, {
      now: at(day(0), "21:05"),
      newId: sim.newId,
    });
    expect(r.effects[0]).toMatchObject({
      dedupeKey: `reminder_evening:p1:${day(0)}`,
    });
  });

  it("grace reminder from 00:15 while yesterday is still open", () => {
    const sim = new Sim();
    expect(fired(sim, at(day(1), "00:14"))).toEqual([]);
    expect(fired(sim, at(day(1), "00:15"))).toEqual(["reminder_grace"]);
    expect(fired(sim, at(day(1), "00:59"))).toEqual(["reminder_grace"]);
    expect(fired(sim, at(day(1), "01:00"))).toEqual([]);

    sim.solve("a", day(1), "00:20"); // saves yesterday
    expect(fired(sim, at(day(1), "00:30"))).toEqual([]);
  });

  it("nothing before the start date", () => {
    const sim = new Sim();
    expect(fired(sim, at(day(-1), "21:30"))).toEqual([]);
    expect(fired(sim, at(day(0), "00:30"))).toEqual([]);
  });

  it("restore_ask at 20:00 on the window day when no request was sent", () => {
    const sim = new Sim();
    sim.playDays(day(0), 3);
    sim.miss(day(3));
    expect(fired(sim, at(day(4), "19:59"))).toEqual([]);
    expect(fired(sim, at(day(4), "20:00"))).toEqual(["restore_ask"]);

    sim.request(at(day(4), "20:05"));
    expect(fired(sim, at(day(4), "20:10"))).toEqual([]);
  });

  it("restore_closing to the partner with 2 h or less left", () => {
    const sim = new Sim();
    sim.playDays(day(0), 3);
    sim.miss(day(3));
    sim.request(at(day(4), "09:00"));
    // The window ends at 01:00 on day 5.
    expect(fired(sim, at(day(4), "22:59"))).toEqual(["reminder_evening"]);
    const r = scheduledNotifications(sim.state, {
      now: at(day(4), "23:00"),
      newId: sim.newId,
    });
    const closing = r.effects.find(
      (e) => e.kind === "notify" && e.notif === "restore_closing",
    );
    expect(closing).toMatchObject({ to: "partner" });
  });

  it("sync_failing once sync has failed for more than 3 hours", () => {
    const sim = new Sim();
    const now = at(day(0), "14:00");
    expect(fired(sim, now, at(day(0), "11:00"))).toEqual([]);
    expect(fired(sim, now, at(day(0), "10:59"))).toEqual(["sync_failing"]);
  });
});
