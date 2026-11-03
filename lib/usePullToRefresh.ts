"use client";

import { useEffect, useRef, useState } from "react";

// Pull to refresh (design §10.14): pulling down from the top of home
// stretches your flower; releasing past the threshold runs `onRefresh`.

const THRESHOLD = 72;
const MAX = 110;

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const latest = useRef({ pull: 0, refreshing: false, onRefresh });
  useEffect(() => {
    latest.current = { pull, refreshing, onRefresh };
  });

  useEffect(() => {
    // The browser's own pull-to-refresh would fight ours.
    const root = document.documentElement;
    const before = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    const onStart = (e: TouchEvent) => {
      start.current =
        window.scrollY <= 0 && !latest.current.refreshing
          ? e.touches[0].clientY
          : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) return setPull(0);
      setPull(Math.min(MAX, dy * 0.5));
    };
    const onEnd = async () => {
      if (start.current === null) return;
      start.current = null;
      const { pull: p, onRefresh: run } = latest.current;
      setPull(0);
      if (p < THRESHOLD) return;
      setRefreshing(true);
      try {
        await run();
      } finally {
        setRefreshing(false);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      root.style.overscrollBehaviorY = before;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  return { pull, ready: pull >= THRESHOLD, refreshing };
}
