"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

// A shared clock for countdowns. It ticks in the browser only. During
// prerender and hydration it reports null, so no time is baked into static
// HTML, unless a server render seeds it with its request time (<NowSeed>):
// then the server and the hydrating browser both use that same instant, and
// the live clock takes over right after.

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
/** The server's request time, for screens rendered with their data. */
export const NowSeed = createContext(0);

/** The current time, refreshed every 15 s; null until mounted unless a
 *  <NowSeed> provides the server's time. */
export function useNow(): Date | null {
  const seed = useContext(NowSeed);
  const ms = useSyncExternalStore(subscribe, getSnapshot, () => seed);
  return ms === 0 ? null : new Date(ms);
}
