import type { MetadataRoute } from "next";

// techspec §12, design §2.2–2.3: installs full screen with the Bloom flower.
// Android draws the launch screen from this: the icon and name on plum.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bloom",
    short_name: "Bloom",
    description:
      "Grow a little every day, together. A two-player LeetCode streak garden.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Night plum, the dock colour: Android paints the navigation bar (and
    // its launch screen) once from these, so they match the bottom of
    // every screen in both themes (design §2.3, §10.7).
    background_color: "#1D1836",
    theme_color: "#1D1836",
    categories: ["education", "productivity", "games"],
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
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // Android's themed icons tint this one in the system colours.
      {
        src: "/icons/monochrome-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "monochrome",
      },
    ],
    // Lets the site know when its own app is installed on this phone
    // (navigator.getInstalledRelatedApps), so it can say so.
    related_applications: [
      {
        platform: "webapp",
        url: `${process.env.APP_URL ?? "http://localhost:3000"}/manifest.webmanifest`,
      },
    ],
    // Long-press the home-screen icon for these.
    shortcuts: [
      {
        name: "Activity",
        url: "/feed",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Journey",
        url: "/milestones",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Gifts",
        url: "/gifts",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
