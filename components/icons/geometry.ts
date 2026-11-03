// Small geometry helpers for the hand-built SVG art (icons, flowers,
// creatures). Pure string builders.

type Pt = [number, number];

const r1 = (n: number) => Math.round(n * 100) / 100;

/** A closed path through `points` with every corner rounded: `t` is how far
 *  (0–0.5) along each edge the curve starts. Keeps puffy shapes free of
 *  sharp corners (design §8.1). */
export function roundPoly(points: Pt[], t = 0.2): string {
  const n = points.length;
  const lerp = (a: Pt, b: Pt, k: number): Pt => [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
  ];
  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const a = lerp(cur, prev, t);
    const b = lerp(cur, next, t);
    d += `${i === 0 ? "M" : "L"}${r1(a[0])} ${r1(a[1])}Q${r1(cur[0])} ${r1(cur[1])} ${r1(b[0])} ${r1(b[1])}`;
  }
  return d + "Z";
}

/** Points of an n-pointed star (or a gear-like ring) around (cx, cy). */
export function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  n = 5,
  rotateDeg = -90,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotateDeg + (i * 180) / n) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

/** A soft heart centred on (cx, cy), `s` wide. */
export function heartPath(cx: number, cy: number, s: number): string {
  const k = s / 20;
  const p = (x: number, y: number) => `${r1(cx + x * k)} ${r1(cy + y * k)}`;
  return `M${p(0, 8)}C${p(-11, 1)} ${p(-9, -9)} ${p(-3.5, -8)}C${p(-1.7, -7.6)} ${p(-0.6, -6.4)} ${p(0, -5)}C${p(0.6, -6.4)} ${p(1.7, -7.6)} ${p(3.5, -8)}C${p(9, -9)} ${p(11, 1)} ${p(0, 8)}Z`;
}

/** A four-point sparkle centred on (cx, cy). */
export function sparklePath(cx: number, cy: number, s: number): string {
  const p = (x: number, y: number) => `${r1(cx + x * s)} ${r1(cy + y * s)}`;
  return `M${p(0, -1)}Q${p(0.15, -0.15)} ${p(1, 0)}Q${p(0.15, 0.15)} ${p(0, 1)}Q${p(-0.15, 0.15)} ${p(-1, 0)}Q${p(-0.15, -0.15)} ${p(0, -1)}Z`;
}
