"use client";

import { useId, type ReactNode } from "react";
import { heartPath, roundPoly, sparklePath, starPoints } from "./geometry";
import { Puff, Shine, SoftBlur, svgId } from "./Puff";

// The puffy icon set (design §8.2), drawn on a 48 × 48 grid inside a 40 px
// live area. Colours follow the table: each icon keeps its own meaning.

type Draw = (u: string) => ReactNode;
/** Rounded so server and browser render identical attributes. */
const n2 = (x: number) => Math.round(x * 100) / 100;
const s = (u: string) => `${u}s`;

const DETAIL = {
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

const ICONS = {
  bloom: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="p"
        shape={(p) =>
          [0, 1, 2, 3, 4].map((i) => {
            const a = ((-90 + i * 72) * Math.PI) / 180;
            return (
              <circle
                key={i}
                cx={n2(24 + 9.5 * Math.cos(a))}
                cy={n2(24 + 9.5 * Math.sin(a))}
                r={8.6}
                {...(p as object)}
              />
            );
          })
        }
      />
      <Puff
        id={`${u}b`}
        tone="butter"
        shape={(p) => <circle cx={24} cy={24} r={6.4} {...(p as object)} />}
      />
      <Shine filter={s(u)} cx={17} cy={14} rx={3.5} ry={2.2} />
      <circle cx={22} cy={22} r={1.6} fill="var(--white)" opacity={0.7} />
    </>
  ),
  ice: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="frost"
        shape={(p) => (
          <rect x={8} y={8} width={32} height={32} rx={9} {...(p as object)} />
        )}
      />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = ((-90 + i * 72) * Math.PI) / 180;
        return (
          <circle
            key={i}
            cx={n2(24 + 3.6 * Math.cos(a))}
            cy={n2(25 + 3.6 * Math.sin(a))}
            r={2.8}
            fill="var(--blush)"
            opacity={0.85}
          />
        );
      })}
      <circle cx={24} cy={25} r={1.9} fill="var(--butter)" />
      <path
        d="M14 15 L19 12"
        stroke="var(--white)"
        opacity={0.8}
        {...DETAIL}
      />
      <Shine filter={s(u)} cx={14} cy={20} rx={2} ry={4} rotate={0} />
    </>
  ),
  coin: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => <circle cx={24} cy={24} r={17} {...(p as object)} />}
      />
      <path d={heartPath(24.6, 25.2, 15)} fill="var(--butter-deep)" opacity={0.18} />
      <path d={heartPath(24, 24.4, 15)} fill="var(--butter-deep)" opacity={0.42} />
      <Shine filter={s(u)} cx={15.5} cy={14.5} rx={4.5} ry={2.6} />
    </>
  ),
  gift: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="blush"
        shape={(p) => (
          <>
            <rect x={10} y={21} width={28} height={19} rx={5} {...(p as object)} />
            <rect x={7.5} y={14.5} width={33} height={9} rx={4.5} {...(p as object)} />
          </>
        )}
      />
      <Puff
        id={`${u}b`}
        tone="butter"
        shape={(p) => (
          <>
            <rect x={21.5} y={14.5} width={5} height={25.5} rx={1.5} {...(p as object)} />
            <ellipse cx={18.5} cy={11} rx={5.5} ry={3.6} transform="rotate(20 18.5 11)" {...(p as object)} />
            <ellipse cx={29.5} cy={11} rx={5.5} ry={3.6} transform="rotate(-20 29.5 11)" {...(p as object)} />
          </>
        )}
      />
      <circle cx={24} cy={13} r={2.6} fill="var(--butter)" />
      <Shine filter={s(u)} cx={13} cy={17} rx={3} ry={1.6} rotate={0} />
    </>
  ),
  giftOpen: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="blush"
        shape={(p) => (
          <>
            <rect x={10} y={24} width={28} height={16} rx={5} {...(p as object)} />
            <rect x={7} y={16} width={31} height={8} rx={4} transform="rotate(-24 9 24)" {...(p as object)} />
          </>
        )}
      />
      <rect x={21.5} y={24} width={5} height={16} rx={1.5} fill="var(--butter)" />
      <path d={sparklePath(30, 16, 4)} fill="var(--butter)" />
      <path d={sparklePath(37, 23, 2.6)} fill="var(--butter)" />
      <path d={sparklePath(24, 18.5, 2.2)} fill="var(--white)" opacity={0.9} />
      <Shine filter={s(u)} cx={14} cy={28} rx={3} ry={1.6} rotate={0} />
    </>
  ),
  trophy: (u) => (
    <>
      <path
        d="M14 12.5H10C8.6 12.5 8 13.4 8 14.8C8 19.5 11.5 22 15 22M34 12.5H38C39.4 12.5 40 13.4 40 14.8C40 19.5 36.5 22 33 22"
        stroke="var(--butter)"
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <>
            <path d="M13.5 9.5Q13.5 8 15 8H33Q34.5 8 34.5 9.5V18C34.5 24.5 30 29 24 29C18 29 13.5 24.5 13.5 18Z" {...p} />
            <rect x={21.5} y={27} width={5} height={7} {...(p as object)} />
            <rect x={14.5} y={33} width={19} height={7} rx={3.5} {...(p as object)} />
          </>
        )}
      />
      <path d={roundPoly(starPoints(24, 18.2, 4.6, 2.1), 0.2)} fill="var(--butter-deep)" opacity={0.4} />
      <Shine filter={s(u)} cx={17.5} cy={13} rx={2} ry={4} rotate={0} />
    </>
  ),
  crown: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <path
            d={roundPoly(
              [
                [9, 17],
                [17, 25],
                [24, 12],
                [31, 25],
                [39, 17],
                [36, 37],
                [12, 37],
              ],
              0.16,
            )}
            {...p}
          />
        )}
      />
      <circle cx={9.5} cy={16} r={2.8} fill="var(--butter)" />
      <circle cx={24} cy={10.5} r={2.8} fill="var(--butter)" />
      <circle cx={38.5} cy={16} r={2.8} fill="var(--butter)" />
      <circle cx={24} cy={30} r={2.8} fill="var(--blush)" />
      <circle cx={16.5} cy={31} r={1.8} fill="var(--sky)" />
      <circle cx={31.5} cy={31} r={1.8} fill="var(--sky)" />
      <Shine filter={s(u)} cx={15} cy={24} rx={1.8} ry={3.2} rotate={-30} />
    </>
  ),
  star: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <path d={roundPoly(starPoints(24, 25, 19, 9), 0.18)} {...p} />
        )}
      />
      <Shine filter={s(u)} cx={19} cy={18} rx={2.5} ry={4} rotate={-35} />
    </>
  ),
  map: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="sky"
        shape={(p) => (
          <path
            d={roundPoly(
              [
                [7, 13],
                [18, 9],
                [30, 13],
                [41, 9],
                [41, 35],
                [30, 39],
                [18, 35],
                [7, 39],
              ],
              0.08,
            )}
            {...p}
          />
        )}
      />
      <path d="M18 10V34M30 14V38" stroke="var(--sky-deep)" opacity={0.3} {...DETAIL} />
      <path
        d="M12 33C16 28 20 31 24 25S31 18 35 16.5"
        stroke="var(--sky-deep)"
        strokeDasharray="0.1 4.4"
        {...DETAIL}
      />
      <path d={heartPath(35.5, 15.5, 7)} fill="var(--blush)" />
      <Shine filter={s(u)} cx={11} cy={17} rx={1.6} ry={3} rotate={0} />
    </>
  ),
  calendar: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="sky"
        shape={(p) => (
          <rect x={8} y={11} width={32} height={29} rx={8} {...(p as object)} />
        )}
      />
      <path d="M8.5 19H39.5" stroke="var(--sky-deep)" opacity={0.25} {...DETAIL} />
      <path d="M17 8V14M31 8V14" stroke="var(--sky-deep)" {...DETAIL} />
      {[
        [16, 26],
        [24, 26],
        [32, 26],
        [16, 33],
        [24, 33],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={2.2} fill="var(--white)" opacity={0.85} />
      ))}
      <circle cx={32} cy={33} r={2.6} fill="var(--blush)" />
      <Shine filter={s(u)} cx={13} cy={15} rx={3} ry={1.5} rotate={0} />
    </>
  ),
  wave: (u) => (
    <>
      <g transform="rotate(-14 24 28)">
        <Puff
          id={`${u}a`}
          tone="peach"
          shape={(p) => (
            <>
              <rect x={14} y={21} width={21} height={19} rx={9.5} {...(p as object)} />
              <rect x={14.5} y={11} width={5.4} height={18} rx={2.7} {...(p as object)} />
              <rect x={20.6} y={7.5} width={5.4} height={20} rx={2.7} {...(p as object)} />
              <rect x={26.7} y={8.5} width={5.4} height={19} rx={2.7} {...(p as object)} />
              <rect x={32.4} y={13} width={5} height={16} rx={2.5} {...(p as object)} />
              <rect x={7} y={24} width={13} height={5.4} rx={2.7} transform="rotate(35 13 27)" {...(p as object)} />
            </>
          )}
        />
      </g>
      <path d="M38 8C40.5 9.5 42 12 42 14.5M34.5 5.5C38 6 41 8 42.5 10.5" stroke="var(--peach-deep)" opacity={0.6} {...DETAIL} />
      <Shine filter={s(u)} cx={19} cy={13} rx={1.4} ry={3} rotate={-14} />
    </>
  ),
  hourglass: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="peach-soft"
        shape={(p) => (
          <path d="M14.5 11H33.5C33.5 18.5 28 21 26 24C28 27 33.5 29.5 33.5 37H14.5C14.5 29.5 20 27 22 24C20 21 14.5 18.5 14.5 11Z" {...p} />
        )}
      />
      <path d="M18 35.5C19.5 31 22 29.5 24 29C26 29.5 28.5 31 30 35.5Z" fill="var(--butter)" />
      <path d="M18.5 14H29.5C28.6 16.8 26 18.6 24 19.8C22 18.6 19.4 16.8 18.5 14Z" fill="var(--butter)" opacity={0.9} />
      <Puff
        id={`${u}b`}
        tone="peach"
        shape={(p) => (
          <>
            <rect x={11} y={6.5} width={26} height={6} rx={3} {...(p as object)} />
            <rect x={11} y={35.5} width={26} height={6} rx={3} {...(p as object)} />
          </>
        )}
      />
      <Shine filter={s(u)} cx={18} cy={20} rx={1.2} ry={3} rotate={-20} />
    </>
  ),
  sprout: (u) => (
    <>
      <path d="M24 37V24" stroke="var(--leaf-deep)" strokeWidth={3} strokeLinecap="round" />
      <Puff
        id={`${u}a`}
        tone="mint"
        shape={(p) => (
          <>
            <path d="M23 26C14 27.5 8.5 21 9.5 13C17 12 23 17 23 26Z" {...p} />
            <path d="M25 24C25.5 15 32 8.5 40.5 9.5C41.5 18 35 25 25 24Z" {...p} />
          </>
        )}
      />
      <Puff
        id={`${u}b`}
        tone="soil"
        shape={(p) => <ellipse cx={24} cy={38} rx={13} ry={4.6} {...(p as object)} />}
      />
      <Shine filter={s(u)} cx={14} cy={16} rx={1.5} ry={3} rotate={-40} />
    </>
  ),
  check: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="mint"
        shape={(p) => (
          <path d={roundPoly(starPoints(24, 24, 18.5, 15.6, 10), 0.45)} {...p} />
        )}
      />
      <path d="M16.5 24.5L22 30L32 18.5" stroke="var(--mint-deep)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Shine filter={s(u)} cx={15} cy={14} rx={3.5} ry={2} />
    </>
  ),
  scroll: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="lilac"
        shape={(p) => (
          <>
            <rect x={12} y={10} width={24} height={28} rx={3} {...(p as object)} />
            <rect x={9} y={7} width={30} height={7} rx={3.5} {...(p as object)} />
            <rect x={9} y={34} width={30} height={7} rx={3.5} {...(p as object)} />
          </>
        )}
      />
      <path d="M17.5 20H30.5M17.5 25H30.5M17.5 30H25.5" stroke="var(--lilac-deep)" opacity={0.5} {...DETAIL} />
      <Shine filter={s(u)} cx={14} cy={9.5} rx={3} ry={1.2} rotate={0} />
    </>
  ),
  chat: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="blush"
        shape={(p) => (
          <>
            <rect x={7} y={8} width={34} height={26} rx={12} {...(p as object)} />
            <path d="M14 30L12 40.5L24 32Z" {...p} />
          </>
        )}
      />
      <path d={heartPath(24, 21.5, 13)} fill="var(--white)" />
      <Shine filter={s(u)} cx={13} cy={14} rx={3.5} ry={1.8} />
    </>
  ),
  gear: (u) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      for (const [da, r] of [
        [-17, 14.5],
        [-9, 19],
        [9, 19],
        [17, 14.5],
      ] as const) {
        const a = ((i * 45 + da) * Math.PI) / 180;
        pts.push([n2(24 + r * Math.cos(a)), n2(24 + r * Math.sin(a))]);
      }
    }
    return (
      <>
        <Puff
          id={`${u}a`}
          tone="lilac"
          shape={(p) => <path d={roundPoly(pts, 0.25)} {...p} />}
        />
        <circle cx={24} cy={24} r={6} fill="var(--lilac-soft)" />
        <path d="M20.5 22a4.5 4.5 0 0 1 4-3.5" stroke="var(--lilac-deep)" opacity={0.3} {...DETAIL} />
        <Shine filter={s(u)} cx={15} cy={14} rx={3} ry={1.8} />
      </>
    );
  },
  code: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="sky"
        shape={(p) => (
          <rect x={7} y={9} width={34} height={30} rx={10} {...(p as object)} />
        )}
      />
      <path d="M19 18.5L13.5 24L19 29.5M29 18.5L34.5 24L29 29.5M26.2 16.5L21.8 31.5" stroke="var(--sky-deep)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Shine filter={s(u)} cx={13} cy={14} rx={3} ry={1.6} rotate={0} />
    </>
  ),
  moon: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <path d="M29 7.5A17 17 0 1 0 40.5 31A13.5 13.5 0 1 1 29 7.5Z" {...p} />
        )}
      />
      <path d={sparklePath(36, 12, 3)} fill="var(--butter)" />
      <circle cx={18} cy={30} r={2} fill="var(--butter-deep)" opacity={0.18} />
      <circle cx={14} cy={22} r={1.4} fill="var(--butter-deep)" opacity={0.18} />
      <Shine filter={s(u)} cx={15} cy={15} rx={2} ry={4} rotate={35} />
    </>
  ),
  sun: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <rect
                key={i}
                x={22}
                y={3.5}
                width={4}
                height={7.5}
                rx={2}
                transform={`rotate(${i * 45} 24 24)`}
                {...(p as object)}
              />
            ))}
            <circle cx={24} cy={24} r={11} {...(p as object)} />
          </>
        )}
      />
      <Shine filter={s(u)} cx={19.5} cy={19} rx={3} ry={2} />
    </>
  ),
  bell: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="peach"
        shape={(p) => (
          <>
            <circle cx={24} cy={37.5} r={3.8} {...(p as object)} />
            <path d="M24 8C16.5 8 13.5 13.5 13.5 20V27L10 31.5C8.8 33.2 9.8 35 11.8 35H36.2C38.2 35 39.2 33.2 38 31.5L34.5 27V20C34.5 13.5 31.5 8 24 8Z" {...p} />
            <circle cx={24} cy={7.5} r={2.6} {...(p as object)} />
          </>
        )}
      />
      <Shine filter={s(u)} cx={19} cy={15} rx={1.8} ry={3.5} rotate={15} />
    </>
  ),
  heart: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="blush"
        shape={(p) => <path d={heartPath(24, 24.5, 38)} {...p} />}
      />
      <Shine filter={s(u)} cx={15} cy={15.5} rx={3.5} ry={2.2} rotate={-35} />
    </>
  ),
  home: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="white"
        shape={(p) => (
          <rect x={11} y={20} width={26} height={19} rx={5} {...(p as object)} />
        )}
      />
      <Puff
        id={`${u}b`}
        tone="peach"
        shape={(p) => (
          <path d={roundPoly([[24, 7], [42, 22], [6, 22]], 0.14)} {...p} />
        )}
      />
      <rect x={20} y={28} width={8} height={11} rx={4} fill="var(--peach)" />
      <Shine filter={s(u)} cx={18} cy={14} rx={1.6} ry={3.2} rotate={50} />
    </>
  ),
  face: (u) => (
    <>
      <Puff
        id={`${u}a`}
        tone="white"
        shape={(p) => <circle cx={24} cy={24.5} r={16.5} {...(p as object)} />}
      />
      <ellipse cx={18.5} cy={23} rx={2.1} ry={2.6} fill="var(--plum)" />
      <ellipse cx={29.5} cy={23} rx={2.1} ry={2.6} fill="var(--plum)" />
      <circle cx={19.2} cy={22.1} r={0.8} fill="var(--white)" />
      <circle cx={30.2} cy={22.1} r={0.8} fill="var(--white)" />
      <ellipse cx={14.5} cy={28.5} rx={3} ry={1.8} fill="var(--blush)" opacity={0.6} />
      <ellipse cx={33.5} cy={28.5} rx={3} ry={1.8} fill="var(--blush)" opacity={0.6} />
      <path d="M21.5 28.5Q24 30.8 26.5 28.5" stroke="var(--plum)" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Shine filter={s(u)} cx={16} cy={14} rx={3.5} ry={2} />
    </>
  ),
  lock: (u) => (
    <>
      <path d="M16.5 21V16a7.5 7.5 0 0 1 15 0v5" stroke="var(--ink-3)" strokeWidth={4} strokeLinecap="round" fill="none" />
      <Puff
        id={`${u}a`}
        tone="butter"
        shape={(p) => (
          <rect x={10} y={19} width={28} height={21} rx={7} {...(p as object)} />
        )}
      />
      <path d={heartPath(24, 29, 9)} fill="var(--butter-deep)" opacity={0.45} />
      <Shine filter={s(u)} cx={15} cy={23} rx={3} ry={1.4} rotate={0} />
    </>
  ),
} satisfies Record<string, Draw>;

export type PuffyName = keyof typeof ICONS;

/** A puffy icon. Decorative unless `title` is given. */
export function PuffyIcon({
  name,
  size = 48,
  title,
  className,
}: {
  name: PuffyName;
  size?: number;
  title?: string;
  className?: string;
}) {
  const u = svgId(useId());
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <SoftBlur id={s(u)} />
      </defs>
      {size >= 40 && (
        <ellipse cx={24} cy={44.5} rx={13} ry={2} fill="var(--ink)" opacity={0.1} />
      )}
      {ICONS[name](u)}
    </svg>
  );
}

/** design §8.1: in grids the icon sits in a 64 px circle of its soft shade. */
export function PuffyTile({
  name,
  tone,
  size = 64,
}: {
  name: PuffyName;
  tone: "blush" | "sky" | "lilac" | "peach" | "butter" | "mint" | "frost";
  size?: number;
}) {
  const bg = {
    blush: "bg-blush-soft",
    sky: "bg-sky-soft",
    lilac: "bg-lilac-soft",
    peach: "bg-peach-soft",
    butter: "bg-butter-soft",
    mint: "bg-mint-soft",
    frost: "bg-frost-soft",
  }[tone];
  return (
    <span
      className={`rounded-pill inline-flex shrink-0 items-center justify-center ${bg}`}
      style={{ width: size, height: size }}
    >
      <PuffyIcon name={name} size={Math.round(size * 0.66)} />
    </span>
  );
}
