import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { getUser, LeetCodeError } from "@/lib/leetcode/client";
import { syncAfterResponse } from "@/lib/pair/initial-sync";
import { linkInput } from "@/lib/validation/onboarding";

/** Verifies and saves my LeetCode username. Changing it mid-challenge is
 *  allowed: new solves come from the new account, past data stays (PRD §8.4). */
export async function POST(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, linkInput);
  if (!body.ok) return body.response;

  let lcUser;
  try {
    lcUser = await getUser(body.data.username);
  } catch (err) {
    if (err instanceof LeetCodeError) {
      return apiError(
        502,
        "leetcode_unavailable",
        "Can't reach LeetCode right now. Try again in a minute.",
      );
    }
    throw err;
  }
  if (!lcUser) {
    return apiError(
      404,
      "leetcode_not_found",
      "We couldn't find that LeetCode user. Check the spelling.",
    );
  }

  const { admin, profile } = guard;
  const { error } = await admin
    .from("profiles")
    .update({
      leetcode_username: lcUser.username, // LeetCode's own spelling
      leetcode_verified_at: new Date().toISOString(),
    })
    .eq("id", profile.id);
  if (error) return apiError(500, "database", error.message);

  if (profile.pair_id) syncAfterResponse(admin, profile.id);
  return NextResponse.json({
    username: lcUser.username,
    avatar: lcUser.avatar,
    solved: lcUser.solved.all,
  });
}
