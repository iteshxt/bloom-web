"use client";

import type { ReactNode } from "react";
import { useOnline } from "@/lib/offline/cache";
import { useSkyBand } from "@/lib/useSkyBand";
import { SkyScene } from "./SkyScene";
import { WaveEdge } from "./WaveEdge";

// The sky at the top of a screen (design §5.3) with the wave edge where it
// meets the calm panel. It follows the IST band and dims when offline.

export function ScreenSky({
  className = "",
  petals = false,
  children,
}: {
  className?: string;
  petals?: boolean;
  children?: ReactNode;
}) {
  const band = useSkyBand();
  const online = useOnline();
  return (
    <SkyScene
      band={band}
      petals={petals}
      dim={!online}
      className={`pt-[env(safe-area-inset-top)] ${className}`}
    >
      <div className="relative">{children}</div>
      <WaveEdge className="absolute inset-x-0 -bottom-px" />
    </SkyScene>
  );
}
