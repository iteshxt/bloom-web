import { z } from "zod";
import { addDays, todayIST, type DayKey } from "@/lib/time";

import { MAX_START_DAYS_AHEAD } from "@/lib/game/limits";
import { COMPANIONS, PLAYER_COLORS } from "@/lib/players";

export const profileInput = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(30, "Keep it under 30 characters"),
  avatarKey: z.enum(COMPANIONS),
  color: z.enum(PLAYER_COLORS),
});

// Letters, digits, underscore, dot and dash. LeetCode itself is the final
// judge: the link route checks the account exists.
export const leetcodeUsername = z
  .string()
  .trim()
  .min(1, "Enter your LeetCode username")
  .max(40, "That's too long for a LeetCode username")
  .regex(/^[A-Za-z0-9_.-]+$/, "Usernames only use letters, numbers, _ . and -");

export const linkInput = z.object({ username: leetcodeUsername });

export const joinInput = z.object({ code: z.string().min(1).max(20) });

/** Start date: today (IST) up to 90 days out. Defaults to today in the UI. */
export function startDateInput(now: Date) {
  const today = todayIST(now);
  const latest = addDays(today, MAX_START_DAYS_AHEAD);
  return z.object({
    startDate: z
      .string()
      .refine(isRealDay, "Use a real date, YYYY-MM-DD")
      .refine((d: DayKey) => d >= today, "The start date can't be in the past")
      .refine(
        (d: DayKey) => d <= latest,
        `Pick a date within ${MAX_START_DAYS_AHEAD} days`,
      ),
  });
}

/** 'YYYY-MM-DD' that exists on the calendar (no 30 Feb). */
function isRealDay(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && addDays(d, 0) === d;
}
