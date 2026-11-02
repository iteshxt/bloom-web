import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree } from "next/font/google";
import "./globals.css";

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
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
