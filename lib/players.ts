// Player choices shared by the UI and the input schemas. Kept free of
// zod so client screens can use them without shipping the validator.

export const COMPANIONS = [
  "mochi",
  "tofu",
  "pip",
  "bun",
  "puff",
  "sprig",
] as const;
export const PLAYER_COLORS = ["blush", "sky", "lilac"] as const;

export type Companion = (typeof COMPANIONS)[number];
export type PlayerColor = (typeof PLAYER_COLORS)[number];
