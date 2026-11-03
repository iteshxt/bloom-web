import "server-only";
import type { Json } from "@/lib/supabase/types";
import { buildSavePayload, type NotificationRow } from "./persist";
import type { Admin } from "./player";

/** Saves one engine result atomically with save_player_state (0005) and
 *  returns the notifications it newly logged, ready to deliver. */
export async function saveEngineResult(
  admin: Admin,
  input: Parameters<typeof buildSavePayload>[0],
): Promise<NotificationRow[]> {
  const payload = buildSavePayload(input);
  const { data, error } = await admin.rpc("save_player_state", {
    p: payload as unknown as Json,
  });
  if (error) throw new Error(`save_player_state failed: ${error.message}`);
  const result = data as { notifications?: NotificationRow[] } | null;
  return result?.notifications ?? [];
}
