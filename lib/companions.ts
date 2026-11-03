import type { Companion, PlayerColor } from "@/lib/validation/onboarding";

// design.md §9.1. The illustrated creatures arrive with the design pass.
export const COMPANION_INFO: Record<
  Companion,
  { name: string; blurb: string }
> = {
  mochi: { name: "Mochi", blurb: "Round bunny, one floppy ear" },
  tofu: { name: "Tofu", blurb: "Loaf-shaped cat" },
  pip: { name: "Pip", blurb: "Little frog in a leaf hat" },
  bun: { name: "Bun", blurb: "Bear cub with a heart nose" },
  puff: { name: "Puff", blurb: "Floating cloud sprite" },
  sprig: { name: "Sprig", blurb: "Hedgehog with tiny flowers" },
};

export const COLOR_NAMES: Record<PlayerColor, string> = {
  blush: "Blush",
  sky: "Sky",
  lilac: "Lilac",
};

/** A stored avatar key as a companion kind (Mochi if it's ever unknown). */
export function asKind(key: string | null | undefined): Companion {
  return key && key in COMPANION_INFO ? (key as Companion) : "mochi";
}
