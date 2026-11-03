import type { MetadataRoute } from "next";

// techspec §12, design §2.3: installs full screen with the Bloom icon and a
// Cloud-coloured splash.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bloom",
    short_name: "Bloom",
    description:
      "Grow a little every day, together. A two-player LeetCode streak.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F4FC",
    theme_color: "#F6F4FC",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
