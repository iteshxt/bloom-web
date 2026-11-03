// The sky's canvas, and helpers to place HTML layers on its stage in
// canvas units (see SkyScene).

export const W = 390;
export const H = 360;

/** A spot on the stage, in canvas units. */
export const at = (x: number, y: number) => ({
  left: `${(x / W) * 100}%`,
  top: `${(y / H) * 100}%`,
});

/** A width on the stage, in canvas units. */
export const wide = (w: number) => `${(w / W) * 100}%`;
