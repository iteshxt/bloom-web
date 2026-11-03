import { describe, expect, it } from "vitest";
import { giftsFor, type GiftRow } from "@/lib/gifts/view";
import {
  giftInput,
  pairPatchInput,
  restoreRespondInput,
  targetInput,
} from "@/lib/validation/game";

const ME = "11111111-1111-4111-8111-111111111111";
const PARTNER = "22222222-2222-4222-8222-222222222222";

const row = (over: Partial<GiftRow>): GiftRow => ({
  id: "g",
  giver_id: PARTNER,
  receiver_id: ME,
  milestone: 15,
  title: "Concert tickets",
  hint: "Something loud",
  details: "Row C",
  link_url: "https://example.com",
  status: "locked",
  ...over,
});

describe("gift masking (invariant 5)", () => {
  const view = (rows: GiftRow[]) =>
    giftsFor({
      viewerId: ME,
      partnerId: PARTNER,
      milestones: [30, 15, 15],
      rows,
    });

  it("never shows the receiver a title, details or link before they open it", () => {
    for (const status of ["locked", "unlocked"] as const) {
      const [g] = view([row({ status })]).receiving;
      expect(g).toMatchObject({
        milestone: 15,
        hint: "Something loud",
        title: null,
        details: null,
        linkUrl: null,
      });
    }
    const serialized = JSON.stringify(
      view([row({ status: "unlocked" })]).receiving,
    );
    expect(serialized).not.toContain("Concert");
    expect(serialized).not.toContain("Row C");
    expect(serialized).not.toContain("example.com");
  });

  it("shows everything once revealed", () => {
    const [g] = view([row({ status: "revealed" })]).receiving;
    expect(g).toMatchObject({
      title: "Concert tickets",
      details: "Row C",
      linkUrl: "https://example.com",
    });
  });

  it("can open only an unlocked gift that has been chosen; otherwise the giver is wrapping it", () => {
    expect(view([row({ status: "unlocked" })]).receiving[0]).toMatchObject({
      canOpen: true,
      waiting: false,
    });
    expect(
      view([row({ status: "unlocked", title: null })]).receiving[0],
    ).toMatchObject({ canOpen: false, waiting: true });
    expect(view([row({ status: "locked" })]).receiving[0]).toMatchObject({
      canOpen: false,
      waiting: false,
    });
  });

  it("lists every milestone once, in order, with placeholders for gifts not yet created", () => {
    const v = view([]);
    expect(v.receiving.map((g) => [g.milestone, g.status, g.id])).toEqual([
      [15, "locked", null],
      [30, "locked", null],
    ]);
    expect(v.giving.map((g) => g.milestone)).toEqual([15, 30]);
  });

  it("gives the giver full access, marks an owed gift, and locks editing after the reveal", () => {
    const giving = (r: Partial<GiftRow>) =>
      view([row({ giver_id: ME, receiver_id: PARTNER, ...r })]).giving[0];
    expect(giving({ status: "locked" })).toMatchObject({
      title: "Concert tickets",
      editable: true,
      owed: false,
    });
    expect(giving({ status: "unlocked", title: null })).toMatchObject({
      owed: true,
      editable: true,
    });
    expect(giving({ status: "revealed" })).toMatchObject({ editable: false });
  });

  it("shows nothing before the partner joins", () => {
    expect(
      giftsFor({ viewerId: ME, partnerId: null, milestones: [15], rows: [] }),
    ).toEqual({
      giving: [],
      receiving: [],
    });
  });
});

describe("game input", () => {
  it("validates gifts", () => {
    expect(
      giftInput.safeParse({
        milestone: 15,
        title: " Tickets ",
        hint: "",
        linkUrl: "",
      }).data,
    ).toEqual({
      milestone: 15,
      title: "Tickets",
      hint: undefined,
      details: undefined,
      linkUrl: undefined,
    });
    expect(giftInput.safeParse({ milestone: 15, title: "" }).success).toBe(
      false,
    );
    expect(
      giftInput.safeParse({
        milestone: 15,
        title: "x",
        linkUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("validates targets, responses and pair changes", () => {
    expect(
      targetInput.safeParse({ playerId: PARTNER, target: 3 }).success,
    ).toBe(true);
    expect(
      targetInput.safeParse({ playerId: PARTNER, target: 11 }).success,
    ).toBe(false);
    expect(
      targetInput.safeParse({ playerId: PARTNER, target: 1.5 }).success,
    ).toBe(false);
    expect(
      restoreRespondInput.safeParse({
        requestId: ME,
        approve: true,
        reply: "  ",
      }).data,
    ).toEqual({
      requestId: ME,
      approve: true,
      reply: undefined,
    });
    expect(pairPatchInput.safeParse({}).success).toBe(false);
    expect(pairPatchInput.safeParse({ addMilestone: 200 }).success).toBe(true);
  });
});
