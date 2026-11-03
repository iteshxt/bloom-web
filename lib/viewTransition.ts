"use client";

import { prefersReducedMotion } from "@/lib/prefs";

// Card → detail (design §12.3): the player card expands into their profile.
// Uses the View Transitions API: the old page is snapshotted, the route
// changes, and elements sharing a view-transition-name morph. The new
// screen's template calls finishViewTransition() once it has rendered.

let pending: (() => void) | null = null;
let active = false;

export function navigateWithTransition(go: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => Promise<void>) => unknown;
  };
  if (!doc.startViewTransition || prefersReducedMotion()) return go();
  active = true;
  doc.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        pending = resolve;
        go();
        // Never hold the screen frozen if the route is slow.
        setTimeout(finishViewTransition, 1200);
      }),
  );
}

export function finishViewTransition() {
  pending?.();
  pending = null;
}

/** True while a view transition is running (the template skips its own
 *  slide then). Reading it clears it. */
export function takeViewTransition(): boolean {
  const was = active;
  active = false;
  return was;
}
