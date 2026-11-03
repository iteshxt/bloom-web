import "server-only";
import { after } from "next/server";
import { nudgesLeft } from "@/lib/nudges";
import { istMidnight, todayIST } from "@/lib/time";
import { recordEvents } from "./events";
import type { Admin } from "./player";

/** Sends a nudge to my partner: checks today's limit, stores it, adds it
 *  to the pair's activity and pushes it through notify (CLAUDE.md "Push"). */
export async function sendNudge(
  admin: Admin,
  input: {
    pairId: string;
    fromId: string;
    toId: string;
    message: string;
    now: Date;
  },
): Promise<{ ok: true; left: number } | { ok: false; code: "limit" }> {
  const since = istMidnight(todayIST(input.now)).toISOString();
  const { count, error } = await admin
    .from("nudges")
    .select("id", { count: "exact", head: true })
    .eq("from_id", input.fromId)
    .gte("created_at", since);
  if (error) throw new Error(`nudge count failed: ${error.message}`);
  const sent = count ?? 0;
  if (nudgesLeft(sent) === 0) return { ok: false, code: "limit" };

  const { data, error: insertError } = await admin
    .from("nudges")
    .insert({
      pair_id: input.pairId,
      from_id: input.fromId,
      to_id: input.toId,
      message: input.message,
    })
    .select("id")
    .single();
  if (insertError)
    throw new Error(`nudge insert failed: ${insertError.message}`);

  // The push goes out after the response, so the sheet closes at once.
  after(() =>
    recordEvents(admin, {
      pairId: input.pairId,
      actorId: input.fromId,
      activity: [
        {
          kind: "nudge",
          payload: { toId: input.toId, message: input.message },
        },
      ],
      notifications: [
        {
          player_id: input.toId,
          kind: "nudge",
          dedupe_key: `nudge:${data.id}`,
          data: { message: input.message },
          actor_id: input.fromId,
        },
      ],
    }).catch((err) =>
      console.error(
        JSON.stringify({ event: "nudge_notify_failed", error: String(err) }),
      ),
    ),
  );
  return { ok: true, left: nudgesLeft(sent + 1) };
}
