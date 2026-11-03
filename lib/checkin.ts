import { SYNC_FAILING_AFTER_MS } from "@/lib/engine";

// Manual check-in (PRD 5.13): when LeetCode sync has been failing, a player
// pastes a problem URL and Bloom records it as a solve now. The URL is only
// ever parsed for its slug, never fetched (CLAUDE.md "Security").

const PROBLEM_URL =
  /^https:\/\/leetcode\.com\/problems\/([a-z0-9-]{1,100})(?:\/|$|\?|#)/;

/** The problem slug from a LeetCode problem URL, or null. */
export function parseProblemUrl(input: string): string | null {
  const m = PROBLEM_URL.exec(input.trim());
  return m ? m[1] : null;
}

/** Check-in opens when sync is failing: at least one failure in a row, and
 *  no success for more than 3 hours (or never, when LeetCode has been
 *  unreachable from the start). */
export function checkInOpen(input: {
  lastSuccessAt: Date | string | null;
  consecutiveFailures: number;
  now: Date;
}): boolean {
  if (input.consecutiveFailures < 1) return false;
  if (!input.lastSuccessAt) return true;
  return (
    input.now.getTime() - new Date(input.lastSuccessAt).getTime() >
    SYNC_FAILING_AFTER_MS
  );
}
