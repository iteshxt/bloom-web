// The Bloom mark (design §2.2): a five-petal flower, Blush and Sky petals
// alternating 3 + 2 and turned so it doesn't sit symmetrically, with a
// Butter centre. Gummy shading like the puffy icons (§8.1): a deep-shade
// crescent on the lower edge, a soft shadow where petals meet the centre,
// and a blurred highlight top-left.
//
// One string builder feeds everything: the PNG icons, favicons and splash
// images (scripts/generate-icons.mjs passes hex colours) and the in-app mark
// (components/brand/LogoMark.tsx passes CSS variables). No imports, so Node
// can run it straight from the script.

export interface LogoPalette {
  cloud: string;
  white: string;
  plum: string;
  blush: string;
  blushDeep: string;
  sky: string;
  skyDeep: string;
  butter: string;
  butterDeep: string;
}

/** The design tokens' values, for raster assets (design §3.1–3.2). */
export const HEX_PALETTE: LogoPalette = {
  cloud: "#F6F4FC",
  white: "#FFFFFF",
  plum: "#2E2547",
  blush: "#F7A8C8",
  blushDeep: "#A8346C",
  sky: "#8ED3EA",
  skyDeep: "#1C6E8F",
  butter: "#FFE18F",
  butterDeep: "#7A5800",
};

/** The same, as CSS variables, for the mark drawn inside the app. */
export const CSS_PALETTE: LogoPalette = {
  cloud: "var(--cloud)",
  white: "var(--white)",
  plum: "var(--plum)",
  blush: "var(--blush)",
  blushDeep: "var(--blush-deep)",
  sky: "var(--sky)",
  skyDeep: "var(--sky-deep)",
  butter: "var(--butter)",
  butterDeep: "var(--butter-deep)",
};

export interface LogoOptions {
  palette?: LogoPalette;
  /** Fill the square with Cloud and a soft glow (app icons, splash). */
  background?: boolean;
  /** Flower size relative to the 200-unit square (maskable icons shrink). */
  scale?: number;
  /** A single-colour white silhouette (notification badge, monochrome). */
  silhouette?: boolean;
  /** A soft shadow under the flower. */
  shadow?: boolean;
  /** Prefix for SVG ids, unique per mark on a page. */
  id?: string;
}

// A round blossom petal with a soft notch at its tip, pointing up from the
// centre; five of them, turned 72° apart, overlap into the flower.
const PETAL =
  "M0 -8C-17 -12 -36 -30 -34 -55C-33 -70 -20 -79 -9 -75C-4 -73 -1.5 -69 0 -66C1.5 -69 4 -73 9 -75C20 -79 33 -70 34 -55C36 -30 17 -12 0 -8Z";
const TURN = -14; // degrees, so the flower leans a little
const COLOURS = ["blush", "sky", "blush", "sky", "blush"] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The mark as an SVG fragment on a 200 × 200 canvas (no <svg> wrapper). */
export function logoFragment(opts: LogoOptions = {}): string {
  const p = opts.palette ?? HEX_PALETTE;
  const id = opts.id ?? "bloom";
  const s = opts.scale ?? 1;
  const out: string[] = [];

  out.push(`<defs>
    <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
    <radialGradient id="${id}-glow" cx="100" cy="88" r="125" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${p.white}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${p.cloud}" stop-opacity="0"/>
    </radialGradient>
    ${(["blush", "sky"] as const)
      .map(
        (
          c,
        ) => `<radialGradient id="${id}-${c}-core" cx="0" cy="0" r="72" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${p[`${c}Deep`]}" stop-opacity="0.5"/>
      <stop offset="0.36" stop-color="${p[`${c}Deep`]}" stop-opacity="0.22"/>
      <stop offset="0.62" stop-color="${p[`${c}Deep`]}" stop-opacity="0"/>
    </radialGradient>`,
      )
      .join("")}
  </defs>`);

  if (opts.background) {
    out.push(`<rect width="200" height="200" fill="${p.cloud}"/>`);
    out.push(`<rect width="200" height="200" fill="url(#${id}-glow)"/>`);
  }

  out.push(`<g transform="translate(100 100) scale(${s})">`);
  if (opts.shadow && !opts.silhouette) {
    out.push(
      `<ellipse cx="0" cy="78" rx="52" ry="7" fill="${p.plum}" opacity="0.12" filter="url(#${id}-soft)"/>`,
    );
  }

  if (opts.silhouette) {
    // One colour, so petals and centre are told apart by thin gaps cut
    // with a mask (badge and monochrome icons use only the shape).
    const petals = COLOURS.map(
      (_, i) => `<path d="${PETAL}" transform="rotate(${TURN + i * 72})"/>`,
    ).join("");
    out.push(`<mask id="${id}-m" maskUnits="userSpaceOnUse" x="-100" y="-100" width="200" height="200">
      <g fill="#fff">${petals}</g>
      <g fill="none" stroke="#000" stroke-width="5">${petals}</g>
      <circle r="24" fill="#000"/>
      <circle r="17" fill="#fff"/>
    </mask>
    <rect x="-100" y="-100" width="200" height="200" fill="${p.white}" mask="url(#${id}-m)"/></g>`);
    return out.join("");
  }

  COLOURS.forEach((c, i) => {
    const angle = TURN + i * 72;
    const t = `rotate(${angle})`;
    const fill = p[c];
    const deep = p[`${c}Deep`];
    // The petal's middle, for a highlight lit from the top-left of the
    // whole flower rather than of each petal.
    const a = ((angle - 90) * Math.PI) / 180;
    const hx = r2(50 * Math.cos(a) - 10);
    const hy = r2(50 * Math.sin(a) - 12);
    out.push(`<g>
      <clipPath id="${id}-p${i}"><path d="${PETAL}" transform="${t}"/></clipPath>
      <g clip-path="url(#${id}-p${i})">
        <path d="${PETAL}" transform="${t}" fill="${fill}"/>
        <path d="${PETAL}" transform="${t}" fill="${deep}" opacity="0.2"/>
        <path d="${PETAL}" transform="translate(-2.5 -4) ${t}" fill="${fill}"/>
        <circle r="72" fill="url(#${id}-${c}-core)"/>
        <ellipse cx="${hx}" cy="${hy}" rx="10" ry="5.5" transform="rotate(${r2(angle - 30)} ${hx} ${hy})" fill="${p.white}" opacity="0.5" filter="url(#${id}-blur)"/>
      </g>
    </g>`);
  });

  {
    const seeds = Array.from({ length: 7 }, (_, k) => {
      const a = (k / 7) * Math.PI * 2 + 0.4;
      return `<circle cx="${r2(9 * Math.cos(a) + 1)}" cy="${r2(9 * Math.sin(a) + 1.5)}" r="1.5" fill="${p.butterDeep}" opacity="0.28"/>`;
    }).join("");
    out.push(`<g>
      <clipPath id="${id}-c"><circle r="19"/></clipPath>
      <g clip-path="url(#${id}-c)">
        <circle r="19" fill="${p.butter}"/>
        <circle r="19" fill="${p.butterDeep}" opacity="0.28"/>
        <circle cx="-2" cy="-3" r="19" fill="${p.butter}"/>
        ${seeds}
        <ellipse cx="-7" cy="-9" rx="6" ry="3.6" transform="rotate(-30 -7 -9)" fill="${p.white}" opacity="0.7" filter="url(#${id}-blur)"/>
      </g>
    </g>`);
  }
  out.push(`</g>`);
  return out.join("");
}

/** The mark as a complete SVG document. */
export function logoSvg(opts: LogoOptions = {}, size = 200): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${logoFragment(opts)}</svg>`;
}
