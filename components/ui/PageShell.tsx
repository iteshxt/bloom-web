"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LineIcon } from "@/components/icons/line";
import { ScreenSky } from "@/components/sky/ScreenSky";

export { Chip } from "./Chip";

// A screen with a short sky on top and the calm panel below (design §5.3).
// Tabs reached from the floating nav have no back button; screens opened
// from elsewhere pass `back`.

export function PageShell({
  title,
  color,
  back,
  sky,
  skyClassName = "h-[176px]",
  petals,
  children,
}: {
  title: string;
  color?: string;
  /** Where the back button goes; omitted on nav tabs. */
  back?: string;
  /** Extra content on the sky, under the title. */
  sky?: ReactNode;
  skyClassName?: string;
  petals?: boolean;
  children: ReactNode;
}) {
  return (
    <main data-player-color={color} className="flex flex-1 flex-col">
      <ScreenSky className={skyClassName} petals={petals}>
        <div className="flex flex-col gap-3 px-4 pt-5">
          <div className="flex items-center gap-2">
            {back && (
              <Link
                href={back}
                aria-label="Back"
                className="bg-surface text-ink shadow-soft rounded-pill -ml-1 inline-flex h-11 w-11 shrink-0 items-center justify-center"
              >
                <LineIcon name="back" />
              </Link>
            )}
            <h1 className="sky-ink font-display text-[28px] leading-[1.15] font-extrabold">
              {title}
            </h1>
          </div>
          {sky}
        </div>
      </ScreenSky>
      <div className="flex flex-1 flex-col gap-5 px-4 pt-2 pb-32">
        {children}
      </div>
    </main>
  );
}

/** A section heading in the calm panel (H2, design §4). */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-[22px] leading-[1.2] font-bold">
        {children}
      </h2>
      {action}
    </div>
  );
}
