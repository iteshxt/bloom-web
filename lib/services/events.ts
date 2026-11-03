import "server-only";
import type { Json } from "@/lib/supabase/types";
import { deliverNotifications } from "./notify";
import type { NotificationRow } from "./persist";
import type { Admin } from "./player";

// Activity rows and notifications for actions that don't go through the
// engine (targets, gifts, pair settings). Notifications follow the same rule
// as save_player_state: log with a dedupe key first, deliver only new ones.

export async function recordEvents(
  admin: Admin,
  input: {
    pairId: string;
    actorId: string;
    activity?: { kind: string; payload: Record<string, unknown> }[];
    notifications?: NotificationRow[];
  },
): Promise<void> {
  if (input.activity?.length) {
    const { error } = await admin.from("activity").insert(
      input.activity.map((a) => ({
        pair_id: input.pairId,
        actor_id: input.actorId,
        kind: a.kind,
        payload: a.payload as Json,
      })),
    );
    if (error) throw new Error(`activity insert failed: ${error.message}`);
  }

  if (input.notifications?.length) {
    const { data, error } = await admin
      .from("notification_log")
      .upsert(
        input.notifications.map((n) => ({
          player_id: n.player_id,
          kind: n.kind,
          dedupe_key: n.dedupe_key,
        })),
        { onConflict: "dedupe_key", ignoreDuplicates: true },
      )
      .select("dedupe_key");
    if (error)
      throw new Error(`notification_log insert failed: ${error.message}`);
    const fresh = new Set((data ?? []).map((r) => r.dedupe_key));
    await deliverNotifications(
      input.notifications.filter((n) => fresh.has(n.dedupe_key)),
    );
  }
}
