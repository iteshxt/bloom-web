import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";

/** Refreshes the Supabase session cookie on every page request. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
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
  });

  // Must run before the response is returned so a refreshed token is written.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, the service worker, the manifest and the cron tick.
    "/((?!_next/static|_next/image|icons/|sounds/|sw\\.js|manifest\\.webmanifest|api/cron/|.*\\.(?:png|svg|ico|mp3|ogg)$).*)",
  ],
};
