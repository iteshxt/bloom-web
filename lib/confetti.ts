"use client";

import { prefersReducedMotion } from "@/lib/prefs";

// Celebration confetti (design §12.4, §16.3): petals and stars in the
// player colour, butter and mint, on one shared canvas that's removed after
// use. Off with reduced motion. Colours come from the CSS tokens, so there
// is no hex here.

export async function burstConfetti(
  playerColor: string,
  origin = { x: 0.5, y: 0.45 },
) {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const confetti = (await import("canvas-confetti")).default;
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(`--${name}`).trim();
  const colors = [token(playerColor), token("butter"), token("mint")].filter(
    Boolean,
  );

  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80";
  document.body.appendChild(canvas);
  const fire = confetti.create(canvas, { resize: true });
  const petal = confetti.shapeFromPath({
    path: "M0 -6C4 -6 6 -2 6 1C6 5 2 7 0 7C-2 7 -6 5 -6 1C-6 -2 -4 -6 0 -6Z",
  });
  const star = confetti.shapeFromPath({
    path: "M0 -7L1.8 -2L7 -2L3 1L4.5 6L0 3L-4.5 6L-3 1L-7 -2L-1.8 -2Z",
  });

  await Promise.all([
    fire({
      particleCount: 70,
      spread: 80,
      startVelocity: 38,
      origin,
      colors,
      shapes: [petal, star],
      scalar: 1.4,
      ticks: 220,
    }),
    fire({
      particleCount: 30,
      spread: 120,
      startVelocity: 26,
      origin,
      colors,
      shapes: [petal],
      scalar: 1.1,
      ticks: 200,
    }),
  ]);
  fire.reset();
  canvas.remove();
}
