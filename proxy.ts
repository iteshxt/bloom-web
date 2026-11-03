import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/** Refreshes the Supabase session cookie, then routes pages:
 *  signed out → /login, not onboarded → /onboarding, onboarded → the app.
 *  API routes answer 401/403 themselves and are never redirected. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Must run before the response is returned so a refreshed token is written.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const path = request.nextUrl.pathname;

  // API routes answer for themselves; /offline is the service worker's
  // fallback and must load for anyone.
  if (
    path.startsWith("/api/") ||
    path.startsWith("/auth/") ||
    path === "/offline"
  )
    return response;

  // Redirects keep any refreshed session cookies.
  const redirect = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!userId) return path === "/login" ? response : redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pair_id, leetcode_username")
    .eq("id", userId)
    .maybeSingle();
  const onboarded = Boolean(profile?.pair_id && profile.leetcode_username);

  if (path === "/login") return redirect(onboarded ? "/" : "/onboarding");
  if (!onboarded && path !== "/onboarding") return redirect("/onboarding");
  if (onboarded && path === "/onboarding") return redirect("/");
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, the service worker, the manifest and the cron tick.
    "/((?!_next/static|_next/image|icons/|sounds/|sw\\.js|manifest\\.webmanifest|api/cron/|.*\\.(?:png|svg|ico|mp3|ogg)$).*)",
  ],
};
