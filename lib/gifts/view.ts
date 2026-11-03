// What each player may see of the pair's gifts (CLAUDE.md invariant 5,
// techspec §6.1). The receiver never sees a gift's title, details or link
// until they open it; the hint is visible from the start. Pure and tested.

export type GiftStatus = "locked" | "unlocked" | "revealed" | "delivered";

export interface GiftRow {
  id: string;
  giver_id: string;
  receiver_id: string;
  milestone: number;
  title: string | null;
  hint: string | null;
  details: string | null;
  link_url: string | null;
  status: GiftStatus;
}

/** A gift I'm giving: everything is mine to see and edit until revealed. */
export interface GivingGift {
  id: string | null;
  milestone: number;
  status: GiftStatus;
  title: string | null;
  hint: string | null;
  details: string | null;
  linkUrl: string | null;
  /** Unlocked with nothing chosen: "You owe a gift". */
  owed: boolean;
  editable: boolean;
}

/** A gift I'm receiving, masked until I open it. */
export interface ReceivingGift {
  id: string | null;
  milestone: number;
  status: GiftStatus;
  hint: string | null;
  /** Unlocked but my partner hasn't chosen it yet: "is wrapping it…". */
  waiting: boolean;
  canOpen: boolean;
  title: string | null;
  details: string | null;
  linkUrl: string | null;
}

const revealed = (s: GiftStatus) => s === "revealed" || s === "delivered";

export function giftsFor(input: {
  viewerId: string;
  partnerId: string | null;
  milestones: number[];
  rows: GiftRow[];
}): { giving: GivingGift[]; receiving: ReceivingGift[] } {
  const { viewerId, partnerId, rows } = input;
  if (!partnerId) return { giving: [], receiving: [] };
  const milestones = [...new Set(input.milestones)].sort((a, b) => a - b);
  const find = (giver: string, receiver: string, m: number) =>
    rows.find(
      (r) =>
        r.giver_id === giver && r.receiver_id === receiver && r.milestone === m,
    );

  return {
    giving: milestones.map((m) => {
      const r = find(viewerId, partnerId, m);
      const status = r?.status ?? "locked";
      return {
        id: r?.id ?? null,
        milestone: m,
        status,
        title: r?.title ?? null,
        hint: r?.hint ?? null,
        details: r?.details ?? null,
        linkUrl: r?.link_url ?? null,
        owed: status === "unlocked" && !r?.title,
        editable: !revealed(status),
      };
    }),
    receiving: milestones.map((m) => {
      const r = find(partnerId, viewerId, m);
      const status = r?.status ?? "locked";
      const open = revealed(status);
      return {
        id: r?.id ?? null,
        milestone: m,
        status,
        hint: r?.hint ?? null,
        waiting: status === "unlocked" && !r?.title,
        canOpen: status === "unlocked" && Boolean(r?.title),
        title: open ? (r?.title ?? null) : null,
        details: open ? (r?.details ?? null) : null,
        linkUrl: open ? (r?.link_url ?? null) : null,
      };
    }),
  };
}
