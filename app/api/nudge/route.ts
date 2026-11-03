import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { NUDGES_PER_DAY, nudgeInput } from "@/lib/nudges";
import { sendNudge } from "@/lib/services/nudges";

/** I nudge my partner (PRD 5.12): a preset or my own words, 3 a day. */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, nudgeInput);
  if (!body.ok) return body.response;
  if (!guard.partner) {
    return apiError(409, "no_partner", "Your partner hasn't joined yet");
  }

  const result = await sendNudge(guard.admin, {
    pairId: guard.pair.id,
    fromId: guard.profile.id,
    toId: guard.partner.id,
    message: body.data.message,
    now: new Date(),
  });
  if (!result.ok) {
    return apiError(
      429,
      "nudge_limit",
      `That's all ${NUDGES_PER_DAY} nudges for today. Try again tomorrow.`,
    );
  }
  return NextResponse.json({ left: result.left });
}
