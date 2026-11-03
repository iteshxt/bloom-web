// Motion tokens (design.md §12.2). Every animated component takes its
// springs and durations from here.

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 34 }, // presses, toggles, chips
  soft: { type: "spring", stiffness: 180, damping: 24 }, // default UI movement
  bouncy: { type: "spring", stiffness: 340, damping: 15, mass: 0.9 }, // pops, celebratory entrances
  floaty: { type: "spring", stiffness: 70, damping: 16 }, // sheets, islands, large scenes
} as const;

/** Seconds. */
export const dur = {
  micro: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.6,
  scene: 1.2,
  sky: 2.0,
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1], // entrances, fades
  inOut: [0.65, 0, 0.35, 1], // crossfades, sky changes
} as const;

export const press = { scale: 0.96, y: 1, transition: spring.snappy } as const;
