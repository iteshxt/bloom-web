import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";
import type { Database } from "./types";

/** Read-only client for the browser. Reads go through RLS; all writes go
 *  through /api/* (CLAUDE.md invariant 4). */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
