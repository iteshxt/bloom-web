import { z } from "zod";

// Nudges (PRD 5.12, design §14.3): a playful push to your partner, picked
// from presets or written yourself, at most 3 a day per sender (IST).

export const NUDGES_PER_DAY = 3;
export const NUDGE_MAX_LENGTH = 140;

export const NUDGE_PRESETS = [
  "Go do your LeetCode 😤",
  "Your flower misses you 🌱",
  "I already did mine 👀",
  "One problem. Just one. 🥺",
  "Race you 🏁",
  "The grace hour is not a plan 😌",
  "Two Sum won’t solve itself 🧮",
  "Your companion is staring at you 👀",
  "Don’t make me restore you 🧊",
  "Proud of you. Now go solve 💖",
  "Tick tock, the moon is up 🌙",
  "Bet you can’t do a Medium today 😏",
] as const;

export const nudgeInput = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pick a nudge or write one")
    .max(NUDGE_MAX_LENGTH, `Keep it under ${NUDGE_MAX_LENGTH} characters`),
});

export const nudgesLeft = (sentToday: number) =>
  Math.max(0, NUDGES_PER_DAY - sentToday);
