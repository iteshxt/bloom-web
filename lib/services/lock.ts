import "server-only";
import { randomUUID } from "node:crypto";
import type { Admin } from "./player";

const TTL_SECONDS = 60;

/** Runs `fn` while holding the player's lease lock (techspec §9.4). Every
 *  path that changes game state goes through here (CLAUDE.md invariant 7).
 *  Returns `{ locked: true }` without running `fn` when someone else holds it. */
export async function withPlayerLock<T>(
  admin: Admin,
  playerId: string,
  purpose: string,
  fn: () => Promise<T>,
): Promise<{ locked: false; value: T } | { locked: true }> {
  const owner = `${purpose}:${randomUUID()}`;
  const { data: acquired, error } = await admin.rpc("try_lock", {
    p_player: playerId,
    p_owner: owner,
    p_ttl_seconds: TTL_SECONDS,
  });
  if (error) throw new Error(`try_lock failed: ${error.message}`);
  if (!acquired) return { locked: true };

  try {
    return { locked: false, value: await fn() };
  } finally {
    const { error: releaseError } = await admin.rpc("release_lock", {
      p_player: playerId,
      p_owner: owner,
    });
    // The lease expires on its own; a failed release only delays the next run.
    if (releaseError)
      console.error(JSON.stringify({ event: "release_lock_failed", playerId }));
  }
}
