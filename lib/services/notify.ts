import "server-only";
import type { NotificationRow } from "./persist";

/** Delivers notifications that `save_player_state` has just logged (so each
 *  dedupe key is sent at most once). Web Push is wired in at build step 7
 *  (techspec §11); until then delivery is a structured log line. */
export async function deliverNotifications(
  rows: NotificationRow[],
): Promise<void> {
  for (const n of rows) {
    console.log(
      JSON.stringify({
        event: "notify",
        player: n.player_id,
        kind: n.kind,
        dedupeKey: n.dedupe_key,
        push: "not_configured",
      }),
    );
  }
}
