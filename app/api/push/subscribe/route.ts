import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";

// Saves this device's push subscription (techspec §11.2). Upserted by
// endpoint, so re-subscribing on app start is harmless, and a device that
// signs in as someone else moves to them.

const subscription = z.object({
  endpoint: z.url().startsWith("https://").max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});

export async function POST(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, subscription);
  if (!body.ok) return body.response;

  const { error } = await guard.admin.from("push_subscriptions").upsert(
    {
      player_id: guard.profile.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
      user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      failure_count: 0,
    },
    { onConflict: "endpoint" },
  );
  if (error) return apiError(500, "database", error.message);
  return NextResponse.json({ ok: true });
}
