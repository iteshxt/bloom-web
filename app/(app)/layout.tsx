"use client";

import { Suspense } from "react";
import { SkyScene } from "@/components/sky/SkyScene";
import { FloatingNav } from "@/components/ui/FloatingNav";
import { useDuelRealtime } from "@/lib/dashboard/useDuel";
import { useSkyBand } from "@/lib/useSkyBand";

// The signed-in, paired screens: one Realtime subscription for the pair and
// the floating nav (design §10.7). From 768 px the app is a centred 430 px
// column with the sky full-bleed behind it, a phone-shaped window into the
// garden (§5.3).
export default function AppLayout({ children }: LayoutProps<"/">) {
  useDuelRealtime();
  const band = useSkyBand();
  return (
    <>
      <SkyScene band={band} className="fixed! inset-0 hidden md:block" />
      <div className="bg-cloud md:shadow-float relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-xl">
        {children}
      </div>
      {/* usePathname() is request data, so the nav streams in. */}
      <Suspense>
        <FloatingNav />
      </Suspense>
    </>
  );
}
