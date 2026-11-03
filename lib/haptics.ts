"use client";

import { getPrefs } from "@/lib/prefs";

// design §13.2. Android only: iOS web apps can't vibrate, so it's skipped
// silently there.

export const HAPTICS = {
  press: [8],
  success: [12, 60, 18], // day complete, restore approved
  milestone: [20, 40, 20, 40, 60],
  error: [30],
} as const;

export function haptic(kind: keyof typeof HAPTICS) {
  if (!getPrefs().haptics) return;
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate([...HAPTICS[kind]]);
  } catch {
    // ignored: vibration is a nicety
  }
}
