import { istParts } from "@/lib/time";

// The sky follows IST (design §6.1). Pure, so it's testable and the theme
// script in the root layout can mirror it.

export type SkyBand = "dawn" | "day" | "dusk" | "night" | "grace" | "deep";

/** Band start minutes in IST, in order through the day. */
const BANDS: [number, SkyBand][] = [
  [0, "grace"], // 00:00–01:00
  [60, "deep"], // 01:00–05:00
  [300, "dawn"], // 05:00–10:00
  [600, "day"], // 10:00–17:00
  [1020, "dusk"], // 17:00–21:00
  [1260, "night"], // 21:00–24:00
];

export function skyBand(now: Date): SkyBand {
  const { minuteOfDay } = istParts(now);
  let band: SkyBand = "grace";
  for (const [start, b] of BANDS) if (minuteOfDay >= start) band = b;
  return band;
}

/** "Follow the sky" uses the night palette from 21:00 to 05:00. */
export const isNightBand = (band: SkyBand) =>
  band === "night" || band === "grace" || band === "deep";

export const SKY_GRADIENTS: Record<SkyBand, [string, string]> = {
  dawn: ["var(--sky-dawn-top)", "var(--sky-dawn-bottom)"],
  day: ["var(--sky-day-top)", "var(--sky-day-bottom)"],
  dusk: ["var(--sky-dusk-top)", "var(--sky-dusk-bottom)"],
  night: ["var(--sky-night-top)", "var(--sky-night-bottom)"],
  grace: ["var(--sky-grace-top)", "var(--sky-grace-bottom)"],
  deep: ["var(--sky-deep-top)", "var(--sky-deep-bottom)"],
};

/** Runs before first paint (root layout) so a night visit never flashes the
 *  day palette. Mirrors skyBand() and lib/prefs.ts. */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("bloom:prefs")||"{}");var t=p.theme||"sky";var m=Math.floor(((Date.now()/60000)+330)%1440);var n=m<300||m>=1260;var d=document.documentElement;d.dataset.theme=t==="night"||(t==="sky"&&n)?"night":"day";var r=p.motion==="reduce"||(p.motion!=="full"&&matchMedia("(prefers-reduced-motion: reduce)").matches);d.dataset.motion=r?"reduce":"full";}catch(e){}})();`;
