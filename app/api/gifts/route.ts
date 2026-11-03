import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { listGifts, saveGift } from "@/lib/services/gifts";
import { giftInput } from "@/lib/validation/game";

// The only way the client sees gifts (invariant 5): masked for the receiver.

export async function GET() {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const gifts = await listGifts(guard.admin, {
    viewerId: guard.profile.id,
    partnerId: guard.partner?.id ?? null,
    pair: guard.pair,
  });
  return NextResponse.json(gifts);
}

/** I create or edit the gift for one of my partner's milestones. */
export async function PUT(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, giftInput);
  if (!body.ok) return body.response;

  const result = await saveGift(guard.admin, {
    pair: guard.pair,
    giverId: guard.profile.id,
    receiverId: guard.partner?.id ?? null,
    ...body.data,
  });
  if (!result.ok) {
    const messages = {
      no_partner: "Your partner hasn't joined yet",
      unknown_milestone: "That isn't one of your milestones",
      already_revealed: "This gift has been opened, so it can't change now",
      not_found: "Gift not found",
      not_ready: "Gift not ready",
    } as const;
    return apiError(409, result.error, messages[result.error]);
  }
  return NextResponse.json({ ok: true });
}
