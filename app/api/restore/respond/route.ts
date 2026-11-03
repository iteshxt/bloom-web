import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import {
  ERROR_MESSAGES,
  respondRestoreFor,
  statusFor,
} from "@/lib/services/restore";
import { restoreRespondInput } from "@/lib/validation/game";

/** The partner approves or rejects a restore request (PRD 4.6.4). */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, restoreRespondInput);
  if (!body.ok) return body.response;

  const result = await respondRestoreFor(guard.admin, {
    approverId: guard.profile.id,
    requestId: body.data.requestId,
    approve: body.data.approve,
    reply: body.data.reply,
  });
  if (!result.ok && result.error === "forbidden") {
    return apiError(
      403,
      "forbidden",
      "Only your partner can answer their own request",
    );
  }
  if (!result.ok)
    return apiError(
      statusFor(result.error),
      result.error,
      ERROR_MESSAGES[result.error],
    );
  return NextResponse.json({ request: result.request });
}
