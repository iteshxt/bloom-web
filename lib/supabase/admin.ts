import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";
import type { Database } from "./types";

/** Secret-key client that bypasses RLS. Server only: used by route handlers
 *  and services after they have checked the session and the player's role. */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey)
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY");
  // A publishable key here makes every query run as a signed-out visitor, so
  // RLS silently returns nothing. Fail loudly instead.
  if (secretKey.startsWith("sb_publishable_"))
    throw new Error(
      "SUPABASE_SECRET_KEY holds the publishable key; use the sb_secret_ key",
    );

  return createSupabaseClient<Database>(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
