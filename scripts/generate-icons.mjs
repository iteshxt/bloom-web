// Generates every brand image from the one logo in lib/brand/logo.ts
// (design §2): app and maskable icons, the monochrome and badge
// silhouettes, favicons (SVG, PNG and a multi-size .ico), iPhone and iPad
// launch screens, and the link-preview image. The wordmark is drawn from
// the real Baloo 2 glyphs, so it matches the app.
//
// Run with: node scripts/generate-icons.mjs

import { mkdir, readFile, writeFile } from "node:fs/promises";
import opentype from "opentype.js";
import sharp from "sharp";
import { HEX_PALETTE as C, logoFragment, logoSvg } from "../lib/brand/logo.ts";
import { SPLASH_SCREENS } from "../lib/brand/splash.ts";

const font = async (path) => {
  const b = await readFile(path);
  return opentype.parse(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
};
const baloo = await font(
  "node_modules/@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff",
);
const figtree = await font(
  "node_modules/@fontsource/figtree/files/figtree-latin-600-normal.woff",
);

const png = (svg, w, h = w) =>
  sharp(Buffer.from(svg), { density: 300 })
    .resize(w, h)
    .png({ compressionLevel: 9 });

/** "bloom" with its two o's as overlapping Blush and Sky circles (§2.1),
 *  as SVG, `size` px tall-ish, starting at (x, baseline). Returns the
 *  markup and its width. */
function wordmark(x, baseline, size, ink = C.plum) {
  const scale = size / baloo.unitsPerEm;
  const xh = (baloo.tables.os2.sxHeight || 500) * scale;
  const track = -0.02 * size;
  const bl = baloo.getPath("bl", x, baseline, size).toPathData(2);
  const blW = baloo.getAdvanceWidth("bl", size) + track;
  const r = xh * 0.54;
  const c1 = x + blW + r;
  const c2 = c1 + r * 1.62;
  const cy = baseline - xh / 2;
  const mX = c2 + r + track + size * 0.02;
  const m = baloo.getPath("m", mX, baseline, size).toPathData(2);
  const mW = baloo.getAdvanceWidth("m", size);
  // the lens where the two o's overlap
  const d = c2 - c1;
  const hx = c1 + d / 2;
  const hy = Math.sqrt(r * r - (d / 2) ** 2);
  const svg = `<g>
    <path d="${bl}" fill="${ink}"/>
    <circle cx="${c1}" cy="${cy}" r="${r}" fill="${C.blush}"/>
    <circle cx="${c2}" cy="${cy}" r="${r}" fill="${C.sky}"/>
    <path d="M${hx} ${cy - hy}A${r} ${r} 0 0 1 ${hx} ${cy + hy}A${r} ${r} 0 0 1 ${hx} ${cy - hy}Z" fill="#C9B4E8"/>
    <circle cx="${c1 - r * 0.32}" cy="${cy - r * 0.38}" r="${r * 0.2}" fill="#fff" opacity="0.5"/>
    <circle cx="${c2 - r * 0.32}" cy="${cy - r * 0.38}" r="${r * 0.2}" fill="#fff" opacity="0.5"/>
    <path d="${m}" fill="${ink}"/>
  </g>`;
  return { svg, width: mX + mW - x };
}

function text(str, x, y, size, fill, f = figtree, anchor = "start") {
  const w = f.getAdvanceWidth(str, size);
  const x0 = anchor === "middle" ? x - w / 2 : x;
  return `<path d="${f.getPath(str, x0, y, size).toPathData(2)}" fill="${fill}"/>`;
}

const icons = "public/icons";
const splash = "public/splash";
await mkdir(icons, { recursive: true });
await mkdir(splash, { recursive: true });

// ── Icons ─────────────────────────────────────────────────────────────
const full = logoSvg({ background: true, shadow: true, scale: 0.9 }, 512);
// Maskable: launchers crop to a circle or squircle, so the flower keeps to
// the central 80% safe zone.
const maskable = logoSvg({ background: true, scale: 0.7 }, 512);
const silhouette = logoSvg({ silhouette: true, scale: 1.1 }, 512);

await Promise.all([
  png(full, 192).toFile(`${icons}/icon-192.png`),
  png(full, 512).toFile(`${icons}/icon-512.png`),
  png(maskable, 192).toFile(`${icons}/maskable-192.png`),
  png(maskable, 512).toFile(`${icons}/maskable-512.png`),
  // Android themes this one in the system colours.
  png(silhouette, 512).toFile(`${icons}/monochrome-512.png`),
  // Notification badge: Android uses only the alpha channel.
  png(silhouette, 72).toFile(`${icons}/badge-72.png`),
  // iOS rounds the corners itself; no transparency allowed.
  png(logoSvg({ background: true, scale: 0.8 }, 180), 180)
    .flatten({ background: C.cloud })
    .toFile(`${icons}/apple-touch-icon.png`),
]);

// ── Favicons ──────────────────────────────────────────────────────────
// The SVG favicon has a rounded Cloud tile so it reads on light and dark
// browser tabs alike.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="46" fill="${C.cloud}"/>
  ${logoFragment({ scale: 1.02 })}
</svg>`;
await writeFile("app/icon.svg", faviconSvg);

// A classic .ico for older browsers: PNG images inside an ICO container.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => png(faviconSvg, s).toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); // width
  header.writeUInt8(s, e + 1); // height
  header.writeUInt8(0, e + 2); // palette
  header.writeUInt8(0, e + 3); // reserved
  header.writeUInt16LE(1, e + 4); // planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
await writeFile("app/favicon.ico", Buffer.concat([header, ...pngs]));

// ── Launch screens (iPhone and iPad) ──────────────────────────────────
// Android builds its own from the manifest (icon + name on Cloud); iOS
// needs an exact-size image per device.
function launchScreen(w, h) {
  const unit = Math.min(w, h);
  const mark = unit * 0.38;
  const mx = (w - mark) / 2;
  const my = h * 0.42 - mark / 2;
  const size = unit * 0.15;
  const probe = wordmark(0, 0, size);
  const word = wordmark((w - probe.width) / 2, my + mark + size * 1.15, size);
  const tagline = text(
    "Grow a little every day, together.",
    w / 2,
    my + mark + size * 1.15 + size * 0.62,
    size * 0.28,
    "#6E6589",
    figtree,
    "middle",
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs><radialGradient id="g" cx="${w / 2}" cy="${h * 0.4}" r="${Math.max(w, h) * 0.6}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${C.cloud}"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <svg x="${mx}" y="${my}" width="${mark}" height="${mark}" viewBox="0 0 200 200">${logoFragment({ shadow: true, id: "s" })}</svg>
    ${word.svg}
    ${tagline}
  </svg>`;
}
for (const s of SPLASH_SCREENS) {
  await png(launchScreen(s.width, s.height), s.width, s.height)
    .flatten({ background: C.cloud })
    .toFile(`${splash}/${s.file}`);
}

// ── Link preview (Open Graph) ─────────────────────────────────────────
{
  const w = 1200;
  const h = 630;
  const word = wordmark(560, 330, 150);
  const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#CDB8F5"/><stop offset="1" stop-color="#FFC9DD"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <circle cx="1080" cy="560" r="170" fill="#FFB991" opacity="0.35"/>
    <path d="M0 560C200 500 360 520 520 560C700 606 900 520 1200 548V630H0Z" fill="#D9CFF0"/>
    <path d="M0 600C260 560 460 590 640 606C840 624 1000 580 1200 596V630H0Z" fill="#C6E8CF"/>
    <svg x="90" y="105" width="420" height="420" viewBox="0 0 200 200">${logoFragment({ shadow: true, id: "o" })}</svg>
    ${word.svg}
    ${text("Grow a little every day, together.", 566, 408, 36, C.plum)}
    ${text("A two-player LeetCode streak garden", 566, 462, 28, "#6E6589")}
  </svg>`;
  await png(og, w, h).toFile("public/og.png");
}

console.log(
  `Wrote icons, favicons, ${SPLASH_SCREENS.length} launch screens and og.png`,
);
