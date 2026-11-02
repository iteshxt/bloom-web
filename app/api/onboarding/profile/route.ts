import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requireAllowedUser } from "@/lib/auth/session";
import { isUniqueViolation } from "@/lib/pair/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileInput } from "@/lib/validation/onboarding";

/** Creates or updates my profile: name, companion and colour. */
export async function POST(request: Request) {
  const guard = await requireAllowedUser(); // ALLOWED_EMAILS is checked here too
  if (!guard.ok) return guard.response;
  const body = await readBody(request, profileInput);
  if (!body.ok) return body.response;

  const { data, error } = await createAdminClient()
    .from("profiles")
    .upsert(
      {
        id: guard.user.id,
        display_name: body.data.displayName,
        avatar_key: body.data.avatarKey,
        color: body.data.color,
      },
      { onConflict: "id" },
    )
    .select("id, display_name, avatar_key, color, pair_id, leetcode_username")
    .single();

  if (isUniqueViolation(error, "one_color_per_pair")) {
    return apiError(409, "color_taken", "Your partner already has that colour");
  }
  if (error) return apiError(500, "database", error.message);
  return NextResponse.json({ profile: data });
}
