import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { advanceGift } from "@/lib/services/gifts";

/** The receiver marks an opened gift as received in real life. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/gifts/[id]/received">,
) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) return apiError(400, "invalid_input", "Unknown gift");

  const result = await advanceGift(guard.admin, {
    pairId: guard.pair.id,
    receiverId: guard.profile.id,
    giftId: id.data,
    step: "received",
  });
  if (!result.ok)
    return apiError(
      409,
      "not_found",
      "Open the gift before marking it received",
    );
  return NextResponse.json({ ok: true });
}
