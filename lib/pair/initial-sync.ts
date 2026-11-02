import "server-only";
import { after } from "next/server";
import { tickPlayer } from "@/lib/services/tick";
import type { Admin } from "@/lib/services/player";

/** After the response is sent, run one tick for a player who just linked
 *  LeetCode or joined a pair, so pre-season solves show up straight away
 *  instead of at the next 10-minute heartbeat. */
export function syncAfterResponse(admin: Admin, playerId: string): void {
  after(async () => {
    try {
      const result = await tickPlayer(admin, playerId, new Date());
      console.log(JSON.stringify({ event: "initial_sync", result }));
    } catch (err) {
      console.error(
        JSON.stringify({
          event: "initial_sync_failed",
          playerId,
          error: String(err),
        }),
      );
    }
  });
}
