import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/** Secret-key client that bypasses RLS. Server only: used by route handlers
 *  and services after they have checked the session and the player's role. */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey)
    throw new Error("Missing environment variable SUPABASE_SECRET_KEY");

  return createSupabaseClient(supabaseUrl(), secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
