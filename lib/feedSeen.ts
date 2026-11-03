"use client";

import { useSyncExternalStore } from "react";

// The newest activity this device has seen in the feed, for the dot on the
// bell. Per player, in localStorage.

const key = (playerId: string) => `bloom:feed-seen:${playerId}`;
const listeners = new Set<() => void>();

function read(playerId: string): number {
  try {
    return Number(window.localStorage.getItem(key(playerId)) ?? 0);
  } catch {
    return 0;
  }
}

export function markFeedSeen(playerId: string, id: number) {
  if (id <= read(playerId)) return;
  try {
    window.localStorage.setItem(key(playerId), String(id));
  } catch {
    // fine: the dot shows again next visit
  }
  listeners.forEach((l) => l());
}

export function useFeedSeen(playerId: string | null): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (playerId ? read(playerId) : 0),
    () => Number.MAX_SAFE_INTEGER,
  );
}
