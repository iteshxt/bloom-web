import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";
import { BootSplash } from "@/components/brand/BootSplash";
import { SPLASH_SCREENS, splashMedia } from "@/lib/brand/splash";
import { THEME_BOOT_SCRIPT } from "@/lib/sky";
import { Providers } from "./providers";

// design.md §4: only the weights listed there are loaded.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const DESCRIPTION =
  "Grow a little every day, together. A two-player LeetCode streak garden.";

export const metadata: Metadata = {
  // Absolute links for the share image; APP_URL is the live address.
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "Bloom",
  description: DESCRIPTION,
  applicationName: "Bloom",
  // techspec §12: full screen when installed, sky running under the notch,
  // and an exact-size launch screen per iPhone and iPad.
  appleWebApp: {
    capable: true,
    title: "Bloom",
    statusBarStyle: "black-translucent",
    startupImage: SPLASH_SCREENS.map((s) => ({
      url: `/splash/${s.file}`,
      media: splashMedia(s),
    })),
  },
  // app/favicon.ico is linked by convention; the SVG (sharp at any size)
  // is listed here because setting `icons` replaces the convention's list.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
  // The card shown when a Bloom link (like an invite) is shared.
  openGraph: {
    type: "website",
    siteName: "Bloom",
    title: "Bloom",
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Bloom" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloom",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  // theme-color is set by the boot script and useDocumentTheme instead, so
  // it follows the day/night palette and page changes don't reset it.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${figtree.variable} h-full antialiased`}
      // The boot script sets data-theme and data-motion before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <BootSplash />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
