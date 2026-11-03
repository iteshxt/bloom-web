import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import {
  cancelRestoreFor,
  ERROR_MESSAGES,
  statusFor,
} from "@/lib/services/restore";
import { restoreCancelInput } from "@/lib/validation/game";

/** I cancel my own pending request (PRD 4.6.7). The engine only sees my own
 *  requests, so someone else's id is "not found". */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, restoreCancelInput);
  if (!body.ok) return body.response;

  const result = await cancelRestoreFor(
    guard.admin,
    guard.profile.id,
    body.data.requestId,
  );
  if (!result.ok)
    return apiError(
      statusFor(result.error),
      result.error,
      ERROR_MESSAGES[result.error],
    );
  return NextResponse.json({ request: result.request });
}
