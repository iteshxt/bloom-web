import "server-only";
import type { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

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

/** Route guard: any signed-in user. Sign-up is open to anyone with a
 *  Google account; each pair's data stays private to its two players (RLS). */
export async function requireUser(): Promise<
  Guard<{ user: SessionUser }> | Denied
> {
  const user = await getSessionUser();
  if (!user)
    return {
      ok: false,
      response: apiError(401, "unauthenticated", "Sign in first"),
    };
  return { ok: true, user };
}

/** Route guard: a signed-in user who has a profile. Returns the admin client
 *  for the writes that follow (the server is the only writer). */
export async function requireProfile(): Promise<
  | Guard<{
      user: SessionUser;
      profile: Tables<"profiles">;
      admin: ReturnType<typeof createAdminClient>;
    }>
  | Denied
> {
  const guard = await requireUser();
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

/** Route guard: a player in a pair. Loads the pair and the partner (null
 *  until they join), so routes can check self vs partner (invariant 9). */
export async function requirePair(): Promise<
  | Guard<{
      user: SessionUser;
      profile: Tables<"profiles">;
      pair: Tables<"pairs">;
      partner: Tables<"profiles"> | null;
      admin: ReturnType<typeof createAdminClient>;
    }>
  | Denied
> {
  const guard = await requireProfile();
  if (!guard.ok) return guard;
  const { admin, profile } = guard;
  if (!profile.pair_id) {
    return {
      ok: false,
      response: apiError(409, "no_pair", "Join a pair first"),
    };
  }
  const [pair, members] = await Promise.all([
    admin.from("pairs").select("*").eq("id", profile.pair_id).single(),
    admin.from("profiles").select("*").eq("pair_id", profile.pair_id),
  ]);
  if (pair.error || members.error) {
    const message = pair.error?.message ?? members.error?.message ?? "Unknown";
    return { ok: false, response: apiError(500, "database", message) };
  }
  const partner = members.data.find((m) => m.id !== profile.id) ?? null;
  return { ...guard, pair: pair.data, partner };
}
