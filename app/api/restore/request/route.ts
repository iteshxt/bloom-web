import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import {
  ERROR_MESSAGES,
  requestRestoreFor,
  statusFor,
} from "@/lib/services/restore";
import { restoreRequestInput } from "@/lib/validation/game";

/** I ask my partner to restore the day I missed (PRD 4.6.3). */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  if (!guard.partner)
    return apiError(409, "no_partner", "Your partner hasn't joined yet");
  const body = await readBody(request, restoreRequestInput);
  if (!body.ok) return body.response;

  const result = await requestRestoreFor(
    guard.admin,
    guard.profile.id,
    body.data.message,
  );
  if (!result.ok)
    return apiError(
      statusFor(result.error),
      result.error,
      ERROR_MESSAGES[result.error],
    );
  return NextResponse.json({ request: result.request });
}
