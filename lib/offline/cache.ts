"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useSyncExternalStore } from "react";

// Offline: the last loaded data is kept on this device so the app still
// shows it with no connection (PRD 5.10). Cleared on sign-out so another
// account on the same phone never sees it.

export const OFFLINE_CACHE_KEY = "bloom:query-cache";
/** Bump when cached data shapes change, so old caches are dropped. */
export const OFFLINE_CACHE_VERSION = "1";
export const OFFLINE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

function storage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined; // storage blocked (private mode, strict settings)
  }
}

export const createOfflinePersister = () =>
  createSyncStoragePersister({ storage: storage(), key: OFFLINE_CACHE_KEY });

export function clearOfflineCache(): void {
  try {
    storage()?.removeItem(OFFLINE_CACHE_KEY);
  } catch {
    // nothing stored
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Live connection status; assumes online during prerender. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
