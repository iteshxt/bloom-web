"use client";

import { useEffect } from "react";
import { useNow } from "@/lib/dashboard/useNow";
import { usePrefs, useReducedMotionPref } from "@/lib/prefs";
import { isNightBand, skyBand, type SkyBand } from "@/lib/sky";

/** The current IST sky band; null before mount (no time in prerendered HTML). */
export function useSkyBand(): SkyBand | null {
  const now = useNow();
  return now ? skyBand(now) : null;
}

/** Keeps <html> in step with the sky and the device preferences:
 *  data-theme (day/night palette), data-band, data-motion and data-hidden
 *  (ambient loops pause while the app is in the background, design §12.6). */
export function useDocumentTheme() {
  const band = useSkyBand();
  const { theme } = usePrefs();
  const reduced = useReducedMotionPref();

  useEffect(() => {
    if (!band) return;
    const night = theme === "night" || (theme === "sky" && isNightBand(band));
    const root = document.documentElement;
    root.dataset.theme = night ? "night" : "day";
    root.dataset.band = band;
  }, [band, theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduce" : "full";
  }, [reduced]);

  useEffect(() => {
    const sync = () => {
      if (document.hidden) document.documentElement.dataset.hidden = "";
      else delete document.documentElement.dataset.hidden;
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);
}
