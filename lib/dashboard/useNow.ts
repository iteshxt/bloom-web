"use client";

import { useSyncExternalStore } from "react";

// A shared clock for countdowns. It ticks in the browser only: during
// prerender and hydration it reports null, so no time is baked into HTML.

const TICK_MS = 15_000;
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => (now === 0 ? (now = Date.now()) : now);
const getServerSnapshot = () => 0;

/** The current time, refreshed every 15 s; null until mounted. */
export function useNow(): Date | null {
  const ms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return ms === 0 ? null : new Date(ms);
}
