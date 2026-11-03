import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";

/** Forgets this device's subscription (only if it's mine). */
export async function POST(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const body = await readBody(
    request,
    z.object({ endpoint: z.string().min(1).max(2000) }),
  );
  if (!body.ok) return body.response;

  const { error } = await guard.admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.data.endpoint)
    .eq("player_id", guard.profile.id);
  if (error) return apiError(500, "database", error.message);
  return NextResponse.json({ ok: true });
}
