import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/pair/errors";
import { syncAfterResponse } from "@/lib/pair/initial-sync";
import { generateInviteCode } from "@/lib/pair/invite";
import { startDateInput } from "@/lib/validation/onboarding";

const CODE_ATTEMPTS = 5;

/** Creates a pair with a fresh invite code and joins me to it. */
export async function POST(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const { admin, profile } = guard;
  if (profile.pair_id)
    return apiError(409, "already_paired", "You're already in a pair");

  const body = await readBody(request, startDateInput(new Date()));
  if (!body.ok) return body.response;

  // ~887 million codes, so a clash is rare; retry a few times if it happens.
  let pair: {
    id: string;
    invite_code: string;
    start_date: string | null;
  } | null = null;
  for (let i = 0; i < CODE_ATTEMPTS && !pair; i++) {
    const { data, error } = await admin
      .from("pairs")
      .insert({
        invite_code: generateInviteCode(),
        start_date: body.data.startDate,
        created_by: profile.id,
      })
      .select("id, invite_code, start_date")
      .single();
    if (isUniqueViolation(error)) continue;
    if (error) return apiError(500, "database", error.message);
    pair = data;
  }
  if (!pair)
    return apiError(
      500,
      "invite_code",
      "Couldn't create an invite code. Try again.",
    );

  // Only join if I'm still unpaired (a double tap can't create two pairs).
  const { data: joined, error } = await admin
    .from("profiles")
    .update({ pair_id: pair.id })
    .eq("id", profile.id)
    .is("pair_id", null)
    .select("id");
  if (error || !joined?.length) {
    await admin.from("pairs").delete().eq("id", pair.id);
    return error
      ? apiError(500, "database", error.message)
      : apiError(409, "already_paired", "You're already in a pair");
  }

  if (profile.leetcode_username) syncAfterResponse(admin, profile.id);
  return NextResponse.json({
    pair: {
      id: pair.id,
      inviteCode: pair.invite_code,
      startDate: pair.start_date,
    },
  });
}
