import "server-only";
import webpush from "web-push";
import type { Admin } from "@/lib/services/player";
import type { PushCopy } from "./copy";

// Web Push with VAPID (techspec §11.1). Only lib/services/notify.ts calls this.

const TTL_SECONDS = 60 * 60 * 6;
let configured = false;

/** True when the VAPID keys are set; without them, pushes are skipped. */
export function pushConfigured(): boolean {
  const {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: pub,
    VAPID_PRIVATE_KEY: priv,
    VAPID_SUBJECT: subject,
  } = process.env;
  if (!pub || !priv || !subject) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return true;
}

export interface SendResult {
  sent: number;
  removed: number;
  failed: number;
}

/** Sends to every device the player has subscribed. Gone subscriptions
 *  (404/410) are deleted; other failures are counted on the row. */
export async function sendToPlayer(
  admin: Admin,
  playerId: string,
  payload: PushCopy,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  if (!pushConfigured()) return result;

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("player_id", playerId);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const body = JSON.stringify(payload);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
          { TTL: TTL_SECONDS, urgency: "high" },
        );
        result.sent++;
        await admin
          .from("push_subscriptions")
          .update({
            last_success_at: new Date().toISOString(),
            failure_count: 0,
          })
          .eq("id", s.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          result.removed++;
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          result.failed++;
          await admin
            .from("push_subscriptions")
            .update({ failure_count: s.failure_count + 1 })
            .eq("id", s.id);
        }
      }
    }),
  );
  return result;
}
