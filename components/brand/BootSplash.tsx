"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/ui/Wordmark";
import { LogoMark } from "./LogoMark";

// The launch screen inside the installed app (design §2.3). Android shows
// its own splash from the manifest (the icon on Cloud); this one is in the
// first HTML so it continues that look without a flash while the app
// starts, then fades once it has hydrated. Only in the installed app: a
// normal browser tab opens straight to the page.

const MIN_MS = 500;

export function BootSplash() {
  const [state, setState] = useState<"shown" | "leaving" | "gone">("shown");

  useEffect(() => {
    // From the moment the page started loading, so a fast start still shows
    // the mark briefly instead of blinking.
    const wait = Math.max(0, MIN_MS - performance.now());
    const leave = setTimeout(() => setState("leaving"), wait);
    const gone = setTimeout(() => setState("gone"), wait + 360);
    return () => {
      clearTimeout(leave);
      clearTimeout(gone);
    };
  }, []);

  if (state === "gone") return null;
  return (
    <div
      aria-hidden
      className={`boot-splash text-plum fixed inset-0 z-[100] flex-col items-center justify-center gap-5 transition-opacity duration-300 ${
        state === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <LogoMark size={148} shadow className="animate-breathe" />
      <Wordmark height={44} />
      <p className="text-[15px] font-semibold opacity-70">
        Grow a little every day, together.
      </p>
    </div>
  );
}
