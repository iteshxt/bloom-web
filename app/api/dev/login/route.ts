import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/api/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// DEVELOPMENT ONLY: signs in as a test player so the screens can be tried
// before Google sign-in is configured. Refuses to run outside `next dev` or
// off localhost. Test accounts are dev-a@bloom.test and dev-b@bloom.test;
// each call sets a fresh random password, so no credential is stored.

const PLAYERS = { a: "dev-a@bloom.test", b: "dev-b@bloom.test" } as const;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export async function POST(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "development" ||
    !LOCAL_HOSTS.has(request.nextUrl.hostname)
  ) {
    return apiError(404, "not_found", "Not found");
  }

  const form = await request.formData();
  const player = form.get("player");
  if (player !== "a" && player !== "b") {
    return apiError(400, "invalid_input", "player must be a or b");
  }
  const email = PLAYERS[player];
  const password = randomBytes(24).toString("base64url");
  const admin = createAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    // Already exists: find it and set this call's password.
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = data?.users.find((u) => u.email === email);
    if (error || !existing) {
      const why = error
        ? `couldn't list users: ${error.message}`
        : `no existing user ${email} after: ${created.error.message}`;
      return apiError(500, "dev_login", why);
    }
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      password,
    });
    if (updated.error) return apiError(500, "dev_login", updated.error.message);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return apiError(
      500,
      "dev_login",
      `${error.message}. The Email provider must be enabled in Supabase for test sign-in.`,
    );
  }
  return NextResponse.redirect(new URL("/", request.url), 303);
}
