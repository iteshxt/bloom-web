"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { LineIcon, type LineName } from "@/components/icons/line";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useGifts } from "@/lib/game/queries";
import { spring } from "@/lib/motion";
import { DockWave } from "./Ground";
import { useHydrated } from "@/lib/useHydrated";

// design §10.7: the nav sits on the plum dock at the bottom of the screen,
// which runs straight into Android's plum navigation bar. The active item
// becomes a player-colour pill with a puffy icon and label that glides
// between items; the rest are soft lavender line icons.

const ITEMS: {
  href: string;
  label: string;
  line: LineName;
  puffy: PuffyName;
  match: (path: string) => boolean;
}[] = [
  {
    href: "/",
    label: "Home",
    line: "home",
    puffy: "home",
    match: (p) =>
      p === "/" || p.startsWith("/restores") || p.startsWith("/feed"),
  },
  {
    href: "/milestones",
    label: "Journey",
    line: "map",
    puffy: "map",
    match: (p) => p.startsWith("/milestones"),
  },
  {
    href: "/gifts",
    label: "Gifts",
    line: "gift",
    puffy: "gift",
    match: (p) => p.startsWith("/gifts"),
  },
  {
    href: "/player/me",
    label: "Me",
    line: "me",
    puffy: "face",
    match: (p) =>
      p.startsWith("/player/me") ||
      p.startsWith("/settings") ||
      p.startsWith("/badges"),
  },
];

export function FloatingNav({
  previewPath,
}: {
  /** The dev gallery drives the nav with a pretend path. */
  previewPath?: string;
} = {}) {
  const realPath = usePathname();
  const path = previewPath ?? realPath;
  const hydrated = useHydrated();
  const duel = useDuel();
  const gifts = useGifts();
  const me = hydrated ? duel.data?.me : undefined;
  // Profile pages for my own id count as "Me" too.
  const onMyProfile = me && path === `/player/${me.id}`;

  const dots: Record<string, boolean> = {
    "/": hydrated && Boolean(duel.data?.pendingRequestFromPartner),
    "/gifts": hydrated && Boolean(gifts.data?.receiving.some((g) => g.canOpen)),
  };

  // Decided after hydration, so the first client render matches the
  // server's however the route was prerendered.
  const activeIndex = hydrated
    ? ITEMS.findIndex(
        (item) =>
          item.match(path) || (item.href === "/player/me" && onMyProfile),
      )
    : -1;

  // The pill is one element that slides to the active tab's measured box
  // inside the nav. (A shared-layout animation measured against the page,
  // so leaving a long, scrolled page made it fly in from below.)
  // Links are looked up in the list itself rather than kept in per-item
  // refs, which React may detach and reattach around the effect.
  const list = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    /** false for the first placement, which shouldn't animate */
    glide: boolean;
  } | null>(null);
  useLayoutEffect(() => {
    const links = list.current?.querySelectorAll("a") ?? [];
    const measure = () => {
      const el = links[activeIndex];
      setBox((prev) =>
        el
          ? {
              x: el.offsetLeft,
              y: el.offsetTop,
              w: el.offsetWidth,
              h: el.offsetHeight,
              glide: prev !== null,
            }
          : null,
      );
    };
    measure();
    // Fonts arriving or the window resizing change the label widths.
    const ro = new ResizeObserver(measure);
    links.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [activeIndex]);
  return (
    <nav
      aria-label="Main"
      data-player-color={me?.color}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] md:bottom-6"
    >
      <DockWave />
      <ul
        ref={list}
        className="bg-dock pointer-events-auto relative box-content flex h-16 items-center justify-between px-3 pb-[env(safe-area-inset-bottom)] md:rounded-b-xl"
      >
        <motion.span
          aria-hidden
          className="bg-p rounded-pill pointer-events-none absolute top-0 left-0 shadow-[0_8px_24px_-10px_rgb(var(--p-rgb)/0.9)]"
          initial={false}
          animate={
            box
              ? { x: box.x, y: box.y, width: box.w, height: box.h, opacity: 1 }
              : { opacity: 0 }
          }
          // The first placement is instant; after that it glides.
          transition={box?.glide ? spring.soft : { duration: 0 }}
        />
        {ITEMS.map((item, i) => {
          const active = i === activeIndex;
          return (
            <li key={item.href} className="flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`rounded-pill relative flex h-12 items-center justify-center gap-1.5 transition-colors ${
                  active
                    ? "text-p-deep px-3"
                    : "text-dock-ink hover:text-dock-ink-strong w-12"
                }`}
              >
                <span className="relative flex items-center gap-1.5">
                  {active ? (
                    <>
                      <span className="rounded-pill flex h-8 w-8 items-center justify-center bg-white/80">
                        <PuffyIcon name={item.puffy} size={28} />
                      </span>
                      <span className="text-sm font-semibold">
                        {item.label}
                      </span>
                    </>
                  ) : (
                    <LineIcon name={item.line} />
                  )}
                </span>
                {dots[item.href] && (
                  <span
                    aria-label="New"
                    className="bg-peach ring-dock rounded-pill absolute top-1.5 right-1.5 h-2.5 w-2.5 ring-2"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
