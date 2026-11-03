import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "Bloom",
  description: "Grow a little every day, together.",
  applicationName: "Bloom",
  // techspec §12: full screen when installed, sky running under the notch.
  appleWebApp: {
    capable: true,
    title: "Bloom",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F6F4FC", // Cloud (design.md §2.3)
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
