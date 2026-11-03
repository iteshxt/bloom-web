import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { checkInInput, parseProblemUrl } from "@/lib/checkin";
import { manualCheckIn } from "@/lib/services/checkin";

/** Manual check-in (PRD 5.13): I paste a LeetCode problem URL while sync is
 *  failing and it counts as a solve now. The URL is parsed, never fetched. */
export async function POST(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, checkInInput);
  if (!body.ok) return body.response;

  const slug = parseProblemUrl(body.data.problemUrl);
  if (!slug) {
    return apiError(
      400,
      "invalid_url",
      "Paste a LeetCode problem link, like https://leetcode.com/problems/two-sum/",
    );
  }

  const result = await manualCheckIn(guard.admin, {
    playerId: guard.profile.id,
    slug,
    now: new Date(),
  });
  if (result.ok) return NextResponse.json(result);
  switch (result.code) {
    case "closed":
      return apiError(
        409,
        "checkin_closed",
        "Manual check-in opens when LeetCode sync has been failing for 3 hours",
      );
    case "busy":
      return apiError(
        409,
        "busy",
        "Bloom is syncing right now. Try again in a moment.",
      );
    case "unknown_problem":
      return apiError(
        404,
        "unknown_problem",
        "We couldn't find that problem on LeetCode",
      );
    case "not_ready":
      return apiError(409, "not_ready", "Finish setting up your pair first");
  }
}
