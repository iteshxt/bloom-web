// Renders Bloom's app icons from one SVG (design.md §2.2): a five-petal
// flower on Cloud, petals alternating blush and sky (3 + 2, turned so it
// isn't symmetrical), a butter centre with a highlight, gummy shading.
// Run: node scripts/generate-icons.mjs

import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const CLOUD = "#F6F4FC";
const BLUSH = ["#F7A8C8", "#A8346C"];
const SKY = ["#8ED3EA", "#1C6E8F"];
const BUTTER = ["#FFE18F", "#7A5800"];

/** The flower on a 200×200 canvas, centred. `scale` shrinks it for the
 *  maskable icon's safe zone. Shading per design §8.1: a deep-shade crescent
 *  on the lower edge (a shifted copy of the shape clipped to itself) and a
 *  soft white highlight top-left. */
function flower({ scale = 1, silhouette = false } = {}) {
  const RX = 25;
  const RY = 31;
  const petals = [BLUSH, SKY, BLUSH, SKY, BLUSH]
    .map(([fill, deep], i) => {
      const angle = -90 + i * 72 + 12;
      if (silhouette) {
        return `<g transform="rotate(${angle}) translate(0 -38)"><ellipse rx="${RX}" ry="${RY}" fill="#FFFFFF"/></g>`;
      }
      return `<g transform="rotate(${angle}) translate(0 -38)" clip-path="url(#petal)">
        <ellipse rx="${RX}" ry="${RY}" fill="${deep}" opacity="0.32"/>
        <ellipse cx="-3" cy="-5" rx="${RX}" ry="${RY}" fill="${fill}"/>
        <ellipse cx="-8" cy="-14" rx="7" ry="11" fill="#FFFFFF" opacity="0.45" filter="url(#soft)"/>
      </g>`;
    })
    .join("");
  const centre = silhouette
    ? `<circle r="19" fill="#FFFFFF"/>`
    : `<g clip-path="url(#centre)">
         <circle r="19" fill="${BUTTER[1]}" opacity="0.3"/>
         <circle cx="-2" cy="-3" r="19" fill="${BUTTER[0]}"/>
         <circle cx="-7" cy="-8" r="5" fill="#FFFFFF" opacity="0.65" filter="url(#soft)"/>
       </g>`;
  return `<g transform="translate(100 100) scale(${scale})">${petals}${centre}</g>`;
}

function svg({ background = true, scale = 1, silhouette = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <filter id="soft"><feGaussianBlur stdDeviation="1.5"/></filter>
    <clipPath id="petal"><ellipse rx="25" ry="31"/></clipPath>
    <clipPath id="centre"><circle r="19"/></clipPath>
  </defs>
  ${background ? `<rect width="200" height="200" fill="${CLOUD}"/>` : ""}
  ${flower({ scale, silhouette })}
</svg>`;
}

const out = "public/icons";
await mkdir(out, { recursive: true });

const render = (source, size, file) =>
  sharp(Buffer.from(source), { density: ((72 * size) / 200) * 2 })
    .resize(size, size)
    .png()
    .toFile(`${out}/${file}`);

await Promise.all([
  render(svg(), 192, "icon-192.png"),
  render(svg(), 512, "icon-512.png"),
  // Maskable: launchers crop to a circle or squircle, so the flower stays
  // inside the central 80% safe zone.
  render(svg({ scale: 0.82 }), 512, "maskable-512.png"),
  render(svg(), 180, "apple-touch-icon.png"),
  // Notification badge: Android uses only the alpha channel.
  render(svg({ background: false, silhouette: true }), 72, "badge-72.png"),
]);
await writeFile("app/icon.svg", svg());
console.log("Icons written to public/icons and app/icon.svg");
