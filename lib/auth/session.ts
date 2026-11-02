import "server-only";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { isAllowedEmail } from "./allowlist";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** The signed-in user, verified from the session JWT, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: data.claims.email ?? null };
}

type Guard<T> = { ok: true } & T;
type Denied = { ok: false; response: NextResponse };

/** Route guard: a signed-in user on the allowlist. */
export async function requireAllowedUser(): Promise<
  Guard<{ user: SessionUser }> | Denied
> {
  const user = await getSessionUser();
  if (!user)
    return {
      ok: false,
      response: apiError(401, "unauthenticated", "Sign in first"),
    };
  if (!isAllowedEmail(user.email)) {
    return {
      ok: false,
      response: apiError(403, "not_allowed", "This Bloom is for two"),
    };
  }
  return { ok: true, user };
}

/** Route guard: an allowed user who has a profile. Returns the admin client
 *  for the writes that follow (the server is the only writer). */
export async function requireProfile(): Promise<
  | Guard<{
      user: SessionUser;
      profile: Tables<"profiles">;
      admin: ReturnType<typeof createAdminClient>;
    }>
  | Denied
> {
  const guard = await requireAllowedUser();
  if (!guard.ok) return guard;
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", guard.user.id)
    .maybeSingle();
  if (error)
    return { ok: false, response: apiError(500, "database", error.message) };
  if (!profile) {
    return {
      ok: false,
      response: apiError(409, "no_profile", "Finish your profile first"),
    };
  }
  return { ok: true, user: guard.user, profile, admin };
}
