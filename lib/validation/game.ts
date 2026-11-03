import { z } from "zod";
import { MAX_MILESTONE } from "@/lib/game/limits";
import { NUDGE_MAX_LENGTH } from "@/lib/nudges";

// Input schemas for the game routes (techspec §10).

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} can be up to ${max} characters`)
    .optional()
    .transform((s) => (s ? s : undefined));

export const restoreRequestInput = z.object({
  message: optionalText(280, "The message"),
});

export const restoreCancelInput = z.object({ requestId: z.uuid() });

export const restoreRespondInput = z.object({
  requestId: z.uuid(),
  approve: z.boolean(),
  reply: optionalText(280, "The reply"),
});

export const targetInput = z.object({
  playerId: z.uuid(),
  target: z.number().int().min(1, "At least 1").max(10, "At most 10"),
});

export const giftInput = z.object({
  milestone: z.number().int().positive(),
  title: z
    .string()
    .trim()
    .min(1, "Name the gift")
    .max(80, "Keep the gift name under 80 characters"),
  hint: optionalText(120, "The hint"),
  details: optionalText(1000, "Details"),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s ? s : undefined))
    .refine(
      (s) => s === undefined || /^https?:\/\/\S+$/i.test(s),
      "Links start with http:// or https://",
    ),
});

export const pairPatchInput = z
  .object({
    addMilestone: z.number().int().min(1).max(MAX_MILESTONE).optional(),
    makeupEnabled: z.boolean().optional(),
    startDate: z.string().optional(),
  })
  .refine(
    (v) =>
      v.addMilestone !== undefined ||
      v.makeupEnabled !== undefined ||
      v.startDate !== undefined,
    "Nothing to change",
  );

export const nudgeInput = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pick a nudge or write one")
    .max(NUDGE_MAX_LENGTH, `Keep it under ${NUDGE_MAX_LENGTH} characters`),
});

export const checkInInput = z.object({
  problemUrl: z.string().max(500),
});
