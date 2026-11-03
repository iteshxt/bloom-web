"use client";

import { useSyncExternalStore } from "react";

// Partner presence (design §9.3): when your partner opens the app, their
// creature on your screen waves, at most once an hour. Realtime presence
// on the pair channel reports the join; this keeps when to wave.

const HOUR = 60 * 60_000;
const WAVE_MS = 3200;
let waveUntil = 0;
const listeners = new Set<() => void>();

const key = (id: string) => `bloom:wave:${id}`;

export function partnerOpened(partnerId: string, now = Date.now()) {
  let last = 0;
  try {
    last = Number(window.localStorage.getItem(key(partnerId)) ?? 0);
    if (now - last < HOUR) return;
    window.localStorage.setItem(key(partnerId), String(now));
  } catch {
    if (now - last < HOUR) return;
  }
  waveUntil = now + WAVE_MS;
  listeners.forEach((l) => l());
  setTimeout(() => listeners.forEach((l) => l()), WAVE_MS + 50);
}

/** True for a few seconds after the partner shows up. */
export function usePartnerWave(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => Date.now() < waveUntil,
    () => false,
  );
}
