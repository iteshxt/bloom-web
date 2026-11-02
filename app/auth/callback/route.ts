import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { createClient } from "@/lib/supabase/server";

// Google OAuth return (techspec §13): exchange the PKCE code for a session,
// enforce ALLOWED_EMAILS, then send the player on. Never trusts a `next`
// parameter, so it can't be used as an open redirect.

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (!code) return to("/login?error=missing_code");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return to("/login?error=sign_in_failed");

  if (!isAllowedEmail(data.user.email)) {
    await supabase.auth.signOut();
    return to("/login?error=not_allowed");
  }

  // The proxy sends players who haven't finished onboarding there.
  return to("/");
}
