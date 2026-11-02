import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { isPairFull, isUniqueViolation } from "@/lib/pair/errors";
import { syncAfterResponse } from "@/lib/pair/initial-sync";
import { normalizeInviteCode } from "@/lib/pair/invite";
import { joinInput } from "@/lib/validation/onboarding";

/** Joins a pair by invite code. A pair is locked at 2 players (database
 *  trigger), and the two players can't share a colour (unique index). */
export async function POST(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const { admin, profile } = guard;
  if (profile.pair_id)
    return apiError(409, "already_paired", "You're already in a pair");

  const body = await readBody(request, joinInput);
  if (!body.ok) return body.response;
  const code = normalizeInviteCode(body.data.code);
  if (!code)
    return apiError(
      400,
      "invalid_code",
      "Invite codes are 6 letters and numbers",
    );

  const { data: pair, error: findError } = await admin
    .from("pairs")
    .select("id, start_date")
    .eq("invite_code", code)
    .maybeSingle();
  if (findError) return apiError(500, "database", findError.message);
  if (!pair)
    return apiError(
      404,
      "pair_not_found",
      "No pair has that code. Check it with your partner.",
    );

  const { error } = await admin
    .from("profiles")
    .update({ pair_id: pair.id })
    .eq("id", profile.id)
    .is("pair_id", null);
  if (isPairFull(error))
    return apiError(409, "pair_full", "That pair already has two players");
  if (isUniqueViolation(error, "one_color_per_pair")) {
    return apiError(
      409,
      "color_taken",
      "Your partner already has that colour. Pick another one.",
    );
  }
  if (error) return apiError(500, "database", error.message);

  if (profile.leetcode_username) syncAfterResponse(admin, profile.id);
  return NextResponse.json({
    pair: { id: pair.id, startDate: pair.start_date },
  });
}
