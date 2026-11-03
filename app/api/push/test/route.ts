import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/http";
import { requireProfile } from "@/lib/auth/session";
import { pushConfigured, sendToPlayer } from "@/lib/push/webpush";

/** "Send a test notification" in Settings: pushes to all my devices. */
export async function POST() {
  const guard = await requireProfile();
  if (!guard.ok) return guard.response;
  if (!pushConfigured()) {
    return apiError(
      503,
      "push_not_configured",
      "Push isn't set up on the server yet",
    );
  }

  const result = await sendToPlayer(guard.admin, guard.profile.id, {
    title: "Bloom",
    body: "Notifications are on 🌸",
    url: "/settings",
    tag: "test",
  });
  if (result.sent === 0) {
    return apiError(
      409,
      "no_devices",
      "No device is subscribed. Turn on notifications on this device first.",
    );
  }
  return NextResponse.json(result);
}
