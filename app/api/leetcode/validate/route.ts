import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/http";
import { requireUser } from "@/lib/auth/session";
import { getUser, LeetCodeError } from "@/lib/leetcode/client";
import { leetcodeUsername } from "@/lib/validation/onboarding";

/** Live check while typing: does this LeetCode account exist? */
export async function GET(request: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const parsed = leetcodeUsername.safeParse(
    request.nextUrl.searchParams.get("username") ?? "",
  );
  if (!parsed.success) {
    return apiError(
      400,
      "invalid_input",
      parsed.error.issues[0]?.message ?? "Invalid username",
    );
  }

  try {
    const user = await getUser(parsed.data);
    if (!user) return NextResponse.json({ exists: false });
    return NextResponse.json({
      exists: true,
      username: user.username,
      avatar: user.avatar,
      solved: user.solved.all,
    });
  } catch (err) {
    if (err instanceof LeetCodeError) {
      return apiError(
        502,
        "leetcode_unavailable",
        "Can't reach LeetCode right now",
      );
    }
    throw err;
  }
}
