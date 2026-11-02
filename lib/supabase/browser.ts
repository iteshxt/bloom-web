import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "./env";

/** Read-only client for the browser. Reads go through RLS; all writes go
 *  through /api/* (CLAUDE.md invariant 4). */
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
