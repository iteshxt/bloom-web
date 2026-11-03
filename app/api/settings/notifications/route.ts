import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, readBody } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { ALL_KINDS } from "@/lib/push/categories";

// Notification preferences (techspec §10): { "<kind>": boolean } merged into
// profiles.notif_prefs. Only known kinds are accepted.

const prefsInput = z
  .record(z.string(), z.boolean())
  .refine((r) => Object.keys(r).length > 0, "Nothing to change")
  .refine(
    (r) => Object.keys(r).every((k) => (ALL_KINDS as string[]).includes(k)),
    "Unknown notification kind",
  );

export async function PATCH(request: Request) {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  const body = await readBody(request, prefsInput);
  if (!body.ok) return body.response;

  const current = (guard.profile.notif_prefs ?? {}) as Record<string, boolean>;
  const next = { ...current, ...body.data };
  const { error } = await guard.admin
    .from("profiles")
    .update({ notif_prefs: next })
    .eq("id", guard.profile.id);
  if (error) return apiError(500, "database", error.message);
  return NextResponse.json({ notifPrefs: next });
}
