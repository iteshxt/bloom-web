import type { ReactNode } from "react";
import { roundPoly } from "@/components/icons/geometry";
import { Puff } from "@/components/icons/Puff";
import type { Companion } from "@/lib/players";

// The six original creatures (design §9.1–9.2), each a handful of round
// shapes on a 120 × 120 canvas standing on y = 112. Every kind supplies its
// own body parts; the mood engine in Companion.tsx adds the face, scarf and
// animations, so all creatures share the same moods.

export interface KindCtx {
  /** Unique id prefix for clip paths. */
  u: string;
  /** Sad posture: ears and spines droop. */
  droop: boolean;
  streak: number;
}

type Pt = [number, number];

export interface KindArt {
  name: string;
  fill: string;
  deep: string;
  /** Drawn behind the body (tails, back ears). */
  back?: (c: KindCtx) => ReactNode;
  body: (c: KindCtx) => ReactNode;
  /** Drawn over the body but under the face (ears, hats, spines). */
  front?: (c: KindCtx) => ReactNode;
  eyes: [Pt, Pt];
  cheeks: [Pt, Pt];
  mouth: Pt;
  /** Where the scarf sits and how wide the neck is. */
  scarf: { y: number; half: number };
  /** The right paw that waves and holds the celebration flower. */
  paw: Pt;
  /** Puff floats instead of sitting. */
  floats?: boolean;
}

const body = (
  k: Pick<KindArt, "fill" | "deep">,
  id: string,
  shape: (p: object) => ReactNode,
) => (
  <Puff id={id} fill={k.fill} deep={k.deep} shade={[-3, -4]} shape={shape} />
);

const MOCHI: KindArt = {
  name: "Mochi",
  fill: "var(--body-mochi)",
  deep: "var(--blush-deep)",
  back: ({ u, droop }) => (
    <g>
      {/* the straight ear, slightly behind the head */}
      <g transform={droop ? "rotate(14 72 50)" : undefined}>
        {body(MOCHI, `${u}e1`, (p) => (
          <ellipse
            cx={74}
            cy={28}
            rx={9}
            ry={24}
            transform="rotate(8 74 28)"
            {...p}
          />
        ))}
        <ellipse
          cx={74}
          cy={30}
          rx={4}
          ry={16}
          transform="rotate(8 74 30)"
          fill="var(--blush)"
          opacity={0.55}
        />
      </g>
      <circle cx={95} cy={98} r={8} fill={MOCHI.fill} />
    </g>
  ),
  body: ({ u }) => (
    <g>
      {body(MOCHI, `${u}b`, (p) => (
        <>
          <ellipse cx={60} cy={78} rx={35} ry={33} {...p} />
          <ellipse cx={45} cy={108} rx={11} ry={6} {...p} />
          <ellipse cx={75} cy={108} rx={11} ry={6} {...p} />
        </>
      ))}
    </g>
  ),
  front: ({ u, droop }) => (
    // the floppy ear, folded over to the side
    <g transform={droop ? "rotate(-10 44 50)" : undefined}>
      {body(MOCHI, `${u}e2`, (p) => (
        <path
          d="M44 52C34 40 22 32 14 38C8 43 14 54 26 58C34 61 42 58 44 52Z"
          {...p}
        />
      ))}
      <path
        d="M40 52C32 44 24 40 19 43C16 46 20 52 28 55Z"
        fill="var(--blush)"
        opacity={0.5}
      />
    </g>
  ),
  eyes: [
    [48, 74],
    [72, 74],
  ],
  cheeks: [
    [40, 84],
    [80, 84],
  ],
  mouth: [60, 82],
  scarf: { y: 98, half: 24 },
  paw: [92, 86],
};

const TOFU: KindArt = {
  name: "Tofu",
  fill: "var(--body-tofu)",
  deep: "var(--wood-deep)",
  body: ({ u }) => (
    <g>
      {body(TOFU, `${u}b`, (p) => (
        <>
          <rect x={22} y={56} width={76} height={56} rx={28} {...p} />
          <path
            d={roundPoly(
              [
                [25, 70],
                [28, 40],
                [48, 58],
              ],
              0.22,
            )}
            {...p}
          />
          <path
            d={roundPoly(
              [
                [95, 70],
                [92, 40],
                [72, 58],
              ],
              0.22,
            )}
            {...p}
          />
        </>
      ))}
      <path
        d={roundPoly(
          [
            [30, 62],
            [31, 49],
            [42, 59],
          ],
          0.25,
        )}
        fill="var(--blush)"
        opacity={0.45}
      />
      <path
        d={roundPoly(
          [
            [90, 62],
            [89, 49],
            [78, 59],
          ],
          0.25,
        )}
        fill="var(--blush)"
        opacity={0.45}
      />
    </g>
  ),
  front: ({ u, droop }) => (
    <g>
      {/* the tuft on top */}
      <path
        d={droop ? "M58 57q2-6 6-5" : "M57 57q-1-8 5-9q4 0 3 4"}
        stroke="var(--wood-deep)"
        strokeOpacity={0.6}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />
      {/* the tail curled around the front of the loaf */}
      {body(TOFU, `${u}t`, (p) => (
        <path
          d="M98 96C108 92 110 106 98 110C84 115 50 115 38 110C46 108 80 108 92 104C98 102 100 98 98 96Z"
          {...p}
        />
      ))}
      <path
        d="M44 109C60 111 80 110 92 106"
        stroke="var(--wood-deep)"
        strokeOpacity={0.25}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  eyes: [
    [48, 78],
    [72, 78],
  ],
  cheeks: [
    [38, 88],
    [82, 88],
  ],
  mouth: [60, 86],
  scarf: { y: 100, half: 30 },
  paw: [96, 90],
};

const PIP: KindArt = {
  name: "Pip",
  fill: "var(--body-pip)",
  deep: "var(--leaf-deep)",
  body: ({ u }) => (
    <g>
      {body(PIP, `${u}b`, (p) => (
        <>
          <ellipse cx={60} cy={88} rx={38} ry={25} {...p} />
          <circle cx={42} cy={64} r={13} {...p} />
          <circle cx={78} cy={64} r={13} {...p} />
          <ellipse cx={36} cy={109} rx={12} ry={5} {...p} />
          <ellipse cx={84} cy={109} rx={12} ry={5} {...p} />
        </>
      ))}
      <ellipse
        cx={60}
        cy={96}
        rx={22}
        ry={13}
        fill="var(--white)"
        opacity={0.35}
      />
    </g>
  ),
  front: ({ u, droop }) => (
    // the leaf hat
    <g transform={droop ? "rotate(-8 60 52)" : "rotate(-14 60 50)"}>
      <Puff
        id={`${u}h`}
        tone="leaf"
        shape={(p) => (
          <path d="M40 52C46 36 72 34 84 46C72 54 50 56 40 52Z" {...p} />
        )}
      />
      <path
        d="M44 51C56 48 70 46 80 46"
        stroke="var(--leaf-deep)"
        strokeOpacity={0.4}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M62 44q2-6 6-7"
        stroke="var(--leaf-deep)"
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </g>
  ),
  eyes: [
    [42, 65],
    [78, 65],
  ],
  cheeks: [
    [34, 88],
    [86, 88],
  ],
  mouth: [60, 84],
  scarf: { y: 98, half: 30 },
  paw: [94, 92],
};

const BUN: KindArt = {
  name: "Bun",
  fill: "var(--body-bun)",
  deep: "var(--soil-deep)",
  back: ({ u, droop }) => (
    <g transform={droop ? "translate(0 3)" : undefined}>
      {body(BUN, `${u}e`, (p) => (
        <>
          <circle cx={35} cy={46} r={12} {...p} />
          <circle cx={85} cy={46} r={12} {...p} />
        </>
      ))}
      <circle cx={35} cy={47} r={6} fill="var(--blush)" opacity={0.45} />
      <circle cx={85} cy={47} r={6} fill="var(--blush)" opacity={0.45} />
    </g>
  ),
  body: ({ u }) => (
    <g>
      {body(BUN, `${u}b`, (p) => (
        <>
          <ellipse cx={60} cy={100} rx={30} ry={14} {...p} />
          <circle cx={60} cy={72} r={32} {...p} />
        </>
      ))}
      <ellipse
        cx={60}
        cy={84}
        rx={13}
        ry={9.5}
        fill="var(--white)"
        opacity={0.55}
      />
      {/* the heart-shaped nose */}
      <path
        d="M60 83C56 80 55.5 76.5 58 76.5C59 76.5 59.6 77.2 60 78C60.4 77.2 61 76.5 62 76.5C64.5 76.5 64 80 60 83Z"
        fill="var(--plum)"
      />
    </g>
  ),
  eyes: [
    [47, 70],
    [73, 70],
  ],
  cheeks: [
    [38, 82],
    [82, 82],
  ],
  mouth: [60, 88],
  scarf: { y: 101, half: 26 },
  paw: [90, 92],
};

const PUFF: KindArt = {
  name: "Puff",
  fill: "var(--body-puff)",
  deep: "var(--frost-deep)",
  floats: true,
  body: ({ u }) => (
    <g>
      {body(PUFF, `${u}b`, (p) => (
        <>
          <circle cx={60} cy={72} r={28} {...p} />
          <circle cx={34} cy={82} r={16} {...p} />
          <circle cx={86} cy={82} r={16} {...p} />
          <circle cx={46} cy={94} r={15} {...p} />
          <circle cx={74} cy={94} r={15} {...p} />
          <circle cx={42} cy={56} r={12} {...p} />
          <circle cx={78} cy={56} r={12} {...p} />
        </>
      ))}
      {/* the fluffy edge wobbles */}
      <g fill={PUFF.fill}>
        <circle
          cx={26}
          cy={74}
          r={7}
          className="svg-origin-center animate-[fluff_3s_ease-in-out_infinite]"
        />
        <circle
          cx={94}
          cy={74}
          r={7}
          className="svg-origin-center animate-[fluff_3.4s_ease-in-out_infinite]"
        />
        <circle
          cx={60}
          cy={106}
          r={8}
          className="svg-origin-center animate-[fluff_2.8s_ease-in-out_infinite]"
        />
      </g>
    </g>
  ),
  eyes: [
    [50, 72],
    [70, 72],
  ],
  cheeks: [
    [41, 81],
    [79, 81],
  ],
  mouth: [60, 80],
  scarf: { y: 94, half: 22 },
  paw: [96, 84],
};

const SPRIG_FLOWER_SPOTS: Pt[] = [
  [40, 60],
  [80, 60],
  [60, 52],
  [30, 76],
  [90, 76],
];

const SPRIG: KindArt = {
  name: "Sprig",
  fill: "var(--body-sprig)",
  deep: "var(--soil-deep)",
  back: ({ u, droop }) => {
    // spines fan out behind the face; they flatten when sad
    const pts: Pt[] = [];
    const spikes = 11;
    for (let i = 0; i <= spikes * 2; i++) {
      const a = Math.PI + (i / (spikes * 2)) * Math.PI;
      const r = i % 2 === 0 ? (droop ? 36 : 40) : 30;
      pts.push([
        Math.round((60 + r * 1.15 * Math.cos(a)) * 100) / 100,
        Math.round((90 + r * Math.sin(a)) * 100) / 100,
      ]);
    }
    pts.push([102, 104], [18, 104]);
    return (
      <Puff
        id={`${u}s`}
        fill="var(--spine-sprig)"
        deep="var(--soil-deep)"
        shade={[-2, -3]}
        shape={(p) => <path d={roundPoly(pts, 0.18)} {...(p as object)} />}
      />
    );
  },
  body: ({ u }) => (
    <g>
      {body(SPRIG, `${u}b`, (p) => (
        <>
          <ellipse cx={60} cy={88} rx={30} ry={24} {...p} />
          <ellipse cx={44} cy={110} rx={9} ry={4.5} {...p} />
          <ellipse cx={76} cy={110} rx={9} ry={4.5} {...p} />
        </>
      ))}
      <circle cx={60} cy={92} r={3.4} fill="var(--plum)" />
    </g>
  ),
  front: ({ streak }) => {
    // tiny flowers among the spines bloom with the streak
    const count = Math.min(
      SPRIG_FLOWER_SPOTS.length,
      1 + Math.floor(streak / 7),
    );
    return (
      <g>
        {SPRIG_FLOWER_SPOTS.slice(0, count).map(([x, y], i) => (
          <g key={i}>
            {[0, 1, 2, 3, 4].map((k) => {
              const a = ((-90 + k * 72) * Math.PI) / 180;
              return (
                <circle
                  key={k}
                  cx={Math.round((x + 3.4 * Math.cos(a)) * 100) / 100}
                  cy={Math.round((y + 3.4 * Math.sin(a)) * 100) / 100}
                  r={2.7}
                  fill={i % 2 === 0 ? "var(--blush)" : "var(--white)"}
                />
              );
            })}
            <circle cx={x} cy={y} r={1.9} fill="var(--butter)" />
          </g>
        ))}
      </g>
    );
  },
  eyes: [
    [50, 82],
    [70, 82],
  ],
  cheeks: [
    [42, 92],
    [78, 92],
  ],
  mouth: [60, 98],
  scarf: { y: 104, half: 24 },
  paw: [88, 96],
};

export const KINDS: Record<Companion, KindArt> = {
  mochi: MOCHI,
  tofu: TOFU,
  pip: PIP,
  bun: BUN,
  puff: PUFF,
  sprig: SPRIG,
};
