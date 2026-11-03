import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { advanceGift } from "@/lib/services/gifts";

/** The receiver opens an unlocked gift that has been chosen. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/gifts/[id]/reveal">,
) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return apiError(400, "invalid_input", "Unknown gift");

  const result = await advanceGift(guard.admin, {
    pairId: guard.pair.id,
    receiverId: guard.profile.id,
    giftId: id.data,
    step: "reveal",
  });
  if (!result.ok) {
    return apiError(409, "not_ready", "This gift can't be opened yet");
  }
  const g = result.gift;
  return NextResponse.json({
    gift: {
      id: g.id,
      milestone: g.milestone,
      title: g.title,
      details: g.details,
      linkUrl: g.link_url,
    },
  });
}
