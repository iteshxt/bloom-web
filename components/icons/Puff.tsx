import type { ReactNode, SVGProps } from "react";

// The "gummy 3D" shading shared by puffy icons, flowers and creatures
// (design §8.1): a pastel fill, a deep-shade crescent along the bottom-right
// at 18%, and a blurred white highlight top-left. No outlines.

export type Tone =
  | "p"
  | "blush"
  | "sky"
  | "lilac"
  | "peach"
  | "butter"
  | "mint"
  | "frost"
  | "leaf"
  | "soil"
  | "wood"
  | "white"
  | "peach-soft"
  | "frost-soft";

export const TONE: Record<Tone, { fill: string; deep: string }> = {
  p: { fill: "var(--p)", deep: "var(--p-deep)" },
  blush: { fill: "var(--blush)", deep: "var(--blush-deep)" },
  sky: { fill: "var(--sky)", deep: "var(--sky-deep)" },
  lilac: { fill: "var(--lilac)", deep: "var(--lilac-deep)" },
  peach: { fill: "var(--peach)", deep: "var(--peach-deep)" },
  butter: { fill: "var(--butter)", deep: "var(--butter-deep)" },
  mint: { fill: "var(--mint)", deep: "var(--mint-deep)" },
  frost: { fill: "var(--frost)", deep: "var(--frost-deep)" },
  leaf: { fill: "var(--leaf)", deep: "var(--leaf-deep)" },
  soil: { fill: "var(--soil)", deep: "var(--soil-deep)" },
  wood: { fill: "var(--wood)", deep: "var(--wood-deep)" },
  white: { fill: "var(--white)", deep: "var(--ink-3)" },
  "peach-soft": { fill: "var(--peach-soft)", deep: "var(--peach-deep)" },
  "frost-soft": { fill: "var(--frost-soft)", deep: "var(--frost-deep)" },
};

type Shape = (props: SVGProps<SVGPathElement>) => ReactNode;

/** One shaded shape. `shape` draws the geometry (paths, circles…, no
 *  groups) with the props it's given; it's used as the clip and the fills. */
export function Puff({
  id,
  tone,
  fill,
  deep,
  shape,
  shade = [-1.5, -2.5],
}: {
  id: string;
  tone?: Tone;
  /** Overrides the tone, e.g. a creature's body pastel. */
  fill?: string;
  deep?: string;
  shape: Shape;
  /** How far the lit copy shifts up-left; bigger art uses a bigger crescent. */
  shade?: [number, number];
}) {
  const t = tone ? TONE[tone] : { fill: "var(--white)", deep: "var(--ink-3)" };
  const f = fill ?? t.fill;
  const d = deep ?? t.deep;
  return (
    <g>
      <clipPath id={id}>{shape({})}</clipPath>
      <g clipPath={`url(#${id})`}>
        {shape({ fill: f })}
        {shape({ fill: d, opacity: 0.18 })}
        <g transform={`translate(${shade[0]} ${shade[1]})`}>
          {shape({ fill: f })}
        </g>
      </g>
    </g>
  );
}

/** The blurred white highlight. Needs a <SoftBlur id> in the same SVG. */
export function Shine({
  filter,
  cx,
  cy,
  rx,
  ry,
  rotate = -25,
  opacity = 0.45,
}: {
  filter: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="var(--white)"
      opacity={opacity}
      filter={`url(#${filter})`}
      transform={`rotate(${rotate} ${cx} ${cy})`}
    />
  );
}

export function SoftBlur({ id, std = 1.5 }: { id: string; std?: number }) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={std} />
    </filter>
  );
}

/** A unique, CSS-safe id prefix from React's useId(). */
export const svgId = (reactId: string) =>
  reactId.replace(/[^a-zA-Z0-9_-]/g, "");
