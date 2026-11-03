"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False during prerender and hydration, true after. Gate anything that
 *  reads browser-only state (like the restored offline cache) on it so the
 *  first client render matches the server HTML. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
