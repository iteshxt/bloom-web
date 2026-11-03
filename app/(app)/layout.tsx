"use client";

import { FloatingNav } from "@/components/ui/FloatingNav";
import { useDuelRealtime } from "@/lib/dashboard/useDuel";

// The signed-in, paired screens share the floating nav (design §10.7) and
// one Realtime subscription for the pair.
export default function AppLayout({ children }: LayoutProps<"/">) {
  useDuelRealtime();
  return (
    <>
      {children}
      <FloatingNav />
    </>
  );
}
