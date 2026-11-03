import "server-only";
import { giftsFor, type GiftRow } from "@/lib/gifts/view";
import type { Tables } from "@/lib/supabase/types";
import { recordEvents } from "./events";
import type { Admin } from "./player";

// Gift vault (PRD 4.8, 5.8). Gifts are server-only (invariant 5): the client
// never reads the table, and what it gets back is masked by giftsFor().

type Pair = Tables<"pairs">;

export async function listGifts(
  admin: Admin,
  input: { viewerId: string; partnerId: string | null; pair: Pair },
) {
  const { data, error } = await admin
    .from("gifts")
    .select(
      "id, giver_id, receiver_id, milestone, title, hint, details, link_url, status",
    )
    .eq("pair_id", input.pair.id);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return giftsFor({
    viewerId: input.viewerId,
    partnerId: input.partnerId,
    milestones: input.pair.milestones,
    rows: (data ?? []) as GiftRow[],
  });
}

export type GiftError =
  | "no_partner"
  | "unknown_milestone"
  | "already_revealed"
  | "not_found"
  | "not_ready";

/** The giver creates or edits the gift for one of their partner's
 *  milestones. Editable until the receiver opens it. */
export async function saveGift(
  admin: Admin,
  input: {
    pair: Pair;
    giverId: string;
    receiverId: string | null;
    milestone: number;
    title: string;
    hint?: string;
    details?: string;
    linkUrl?: string;
  },
): Promise<{ ok: true } | { ok: false; error: GiftError }> {
  if (!input.receiverId) return { ok: false, error: "no_partner" };
  if (!input.pair.milestones.includes(input.milestone)) {
    return { ok: false, error: "unknown_milestone" };
  }
  const fields = {
    title: input.title,
    hint: input.hint ?? null,
    details: input.details ?? null,
    link_url: input.linkUrl ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error } = await admin
    .from("gifts")
    .select("id, status")
    .eq("receiver_id", input.receiverId)
    .eq("milestone", input.milestone)
    .maybeSingle();
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  if (existing) {
    // Conditional update: a reveal racing this edit wins.
    const { data: updated, error: updateError } = await admin
      .from("gifts")
      .update(fields)
      .eq("id", existing.id)
      .in("status", ["locked", "unlocked"])
      .select("id, status");
    if (updateError)
      throw new Error(`gift update failed: ${updateError.message}`);
    if (!updated?.length) return { ok: false, error: "already_revealed" };
    const wrappedOwed = updated[0].status === "unlocked";
    await recordEvents(admin, {
      pairId: input.pair.id,
      actorId: input.giverId,
      activity: [
        {
          kind: "gift_wrapped",
          payload: { milestone: input.milestone, readyToOpen: wrappedOwed },
        },
      ],
    });
    return { ok: true };
  }

  // New gift. If the receiver already reached this milestone, it's unlocked.
  const { data: achieved, error: achievedError } = await admin
    .from("milestone_achievements")
    .select("milestone")
    .eq("player_id", input.receiverId)
    .eq("milestone", input.milestone)
    .maybeSingle();
  if (achievedError)
    throw new Error(`Supabase query failed: ${achievedError.message}`);

  const { error: insertError } = await admin.from("gifts").insert({
    pair_id: input.pair.id,
    giver_id: input.giverId,
    receiver_id: input.receiverId,
    milestone: input.milestone,
    status: achieved ? "unlocked" : "locked",
    unlocked_at: achieved ? new Date().toISOString() : null,
    ...fields,
  });
  // A milestone unlocking at the same moment creates the row first; retry as an edit.
  if (insertError?.code === "23505") return saveGift(admin, input);
  if (insertError)
    throw new Error(`gift insert failed: ${insertError.message}`);
  await recordEvents(admin, {
    pairId: input.pair.id,
    actorId: input.giverId,
    activity: [
      {
        kind: "gift_wrapped",
        payload: { milestone: input.milestone, readyToOpen: Boolean(achieved) },
      },
    ],
  });
  return { ok: true };
}

/** The receiver opens an unlocked, chosen gift, or marks a revealed one as
 *  received. Each step notifies the giver. */
export async function advanceGift(
  admin: Admin,
  input: {
    pairId: string;
    receiverId: string;
    giftId: string;
    step: "reveal" | "received";
  },
): Promise<
  { ok: true; gift: Tables<"gifts"> } | { ok: false; error: GiftError }
> {
  const from = input.step === "reveal" ? "unlocked" : "revealed";
  const now = new Date().toISOString();
  let query = admin
    .from("gifts")
    .update(
      input.step === "reveal"
        ? { status: "revealed", revealed_at: now, updated_at: now }
        : { status: "delivered", delivered_at: now, updated_at: now },
    )
    .eq("id", input.giftId)
    .eq("pair_id", input.pairId)
    .eq("receiver_id", input.receiverId) // receiver only (invariant 9)
    .eq("status", from);
  if (input.step === "reveal") query = query.not("title", "is", null);
  const { data, error } = await query.select("*");
  if (error) throw new Error(`gift update failed: ${error.message}`);
  const gift = data?.[0];
  if (!gift)
    return {
      ok: false,
      error: input.step === "reveal" ? "not_ready" : "not_found",
    };

  const kind = input.step === "reveal" ? "gift_revealed" : "gift_received";
  await recordEvents(admin, {
    pairId: input.pairId,
    actorId: input.receiverId,
    activity: [{ kind, payload: { milestone: gift.milestone } }],
    notifications: [
      {
        player_id: gift.giver_id,
        kind,
        dedupe_key: `${kind}:${gift.id}`,
        data: { milestone: gift.milestone },
      },
    ],
  });
  return { ok: true, gift };
}
