import { NextResponse } from "next/server";
import { apiError, readBody } from "@/lib/api/http";
import { requirePair } from "@/lib/auth/session";
import { recordEvents } from "@/lib/services/events";
import { todayIST } from "@/lib/time";
import { pairPatchInput } from "@/lib/validation/game";
import { startDateInput } from "@/lib/validation/onboarding";

/** Shared pair settings (PRD 5.17): add a milestone (never remove), turn
 *  make-up on or off, or move the start date before the challenge begins. */
export async function PATCH(request: Request) {
  const guard = await requirePair();
  if (!guard.ok) return guard.response;
  const { admin, pair, profile } = guard;
  const body = await readBody(request, pairPatchInput);
  if (!body.ok) return body.response;
  const { addMilestone, makeupEnabled, startDate } = body.data;

  const update: {
    milestones?: number[];
    makeup_enabled?: boolean;
    start_date?: string;
  } = {};
  const activity: { kind: string; payload: Record<string, unknown> }[] = [];

  if (addMilestone !== undefined) {
    if (pair.milestones.includes(addMilestone)) {
      return apiError(
        409,
        "milestone_exists",
        "That milestone is already on the path",
      );
    }
    update.milestones = [...pair.milestones, addMilestone].sort(
      (a, b) => a - b,
    );
    activity.push({
      kind: "milestone_added",
      payload: { milestone: addMilestone },
    });
  }

  if (makeupEnabled !== undefined) {
    update.makeup_enabled = makeupEnabled;
    activity.push({ kind: "makeup_changed", payload: { makeupEnabled } });
  }

  if (startDate !== undefined) {
    const now = new Date();
    if (!pair.start_date || todayIST(now) >= pair.start_date) {
      return apiError(
        409,
        "already_started",
        "The start date can't change once the challenge has begun",
      );
    }
    const parsed = startDateInput(now).safeParse({ startDate });
    if (!parsed.success) {
      return apiError(
        400,
        "invalid_input",
        parsed.error.issues[0]?.message ?? "Invalid date",
      );
    }
    update.start_date = parsed.data.startDate;
    activity.push({
      kind: "start_date_changed",
      payload: { startDate: parsed.data.startDate },
    });
  }

  const { error } = await admin.from("pairs").update(update).eq("id", pair.id);
  if (error) return apiError(500, "database", error.message);

  if (update.start_date) {
    // Each player's first run was created on the old start date; nothing has
    // been counted yet, so move it with the challenge.
    const { error: runError } = await admin
      .from("runs")
      .update({ started_on: update.start_date })
      .eq("pair_id", pair.id)
      .is("ended_on", null)
      .eq("length", 0);
    if (runError) return apiError(500, "database", runError.message);
  }

  await recordEvents(admin, { pairId: pair.id, actorId: profile.id, activity });
  return NextResponse.json({ ok: true });
}
