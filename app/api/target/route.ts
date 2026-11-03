import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { setTarget } from "@/lib/services/targets";
import { targetInput } from "@/lib/validation/game";

/** I set my partner's daily target, effective tomorrow (PRD 4.3). */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, targetInput);
  if (!body.ok) return body.response;

  // Only the partner sets a player's target (invariant 9).
  if (!guard.partner || body.data.playerId !== guard.partner.id) {
    return apiError(403, "forbidden", "You can only set your partner's target");
  }

  const result = await setTarget(guard.admin, {
    pairId: guard.pair.id,
    setterId: guard.profile.id,
    playerId: body.data.playerId,
    target: body.data.target,
  });
  if (!result.ok)
    return apiError(
      409,
      "busy",
      "Bloom is syncing right now. Try again in a moment.",
    );
  return NextResponse.json({
    target: body.data.target,
    effectiveFrom: result.effectiveFrom,
  });
}
