import "server-only";
import { notificationCopy } from "@/lib/push/copy";
import { pushConfigured, sendToPlayer } from "@/lib/push/webpush";
import type { NotificationRow } from "./persist";
import type { Admin } from "./player";

/** Delivers notifications that were just logged in notification_log (so each
 *  dedupe key is sent at most once), respecting each player's notif_prefs
 *  (CLAUDE.md "Push and PWA"). Push failures never fail the caller: the
 *  activity feed still shows the event. */
export async function deliverNotifications(
  admin: Admin,
  rows: NotificationRow[],
): Promise<void> {
  if (rows.length === 0) return;
  if (!pushConfigured()) {
    for (const n of rows)
      log({ event: "notify", kind: n.kind, push: "not_configured" });
    return;
  }

  try {
    const recipientIds = [...new Set(rows.map((r) => r.player_id))];
    const { data: recipients, error } = await admin
      .from("profiles")
      .select("id, pair_id, notif_prefs")
      .in("id", recipientIds);
    if (error) throw new Error(error.message);
    const pairIds = [
      ...new Set(
        (recipients ?? []).map((r) => r.pair_id).filter((p) => p !== null),
      ),
    ];
    const { data: members, error: membersError } = await admin
      .from("profiles")
      .select("id, pair_id, display_name")
      .in("pair_id", pairIds);
    if (membersError) throw new Error(membersError.message);

    const now = new Date();
    await Promise.all(
      rows.map(async (n) => {
        const me = recipients?.find((r) => r.id === n.player_id);
        const prefs = (me?.notif_prefs ?? {}) as Record<string, unknown>;
        if (prefs[n.kind] === false) {
          return log({ event: "notify", kind: n.kind, push: "muted" });
        }
        const other = members?.find(
          (m) => m.pair_id === me?.pair_id && m.id !== n.player_id,
        );
        const copy = notificationCopy({
          kind: n.kind,
          data: n.data,
          recipientIsActor: n.actor_id === n.player_id,
          otherName: other?.display_name ?? "Your partner",
          recipientId: n.player_id,
          now,
        });
        const result = await sendToPlayer(admin, n.player_id, copy);
        log({ event: "notify", kind: n.kind, ...result });
      }),
    );
  } catch (err) {
    log({ event: "notify_failed", error: String(err) });
  }
}

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry));
}
