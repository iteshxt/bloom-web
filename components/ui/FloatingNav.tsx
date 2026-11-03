"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LineIcon, type LineName } from "@/components/icons/line";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useGifts } from "@/lib/game/queries";
import { spring } from "@/lib/motion";
import { useHydrated } from "@/lib/useHydrated";

// design §10.7: a glass pill floating 16 px above the safe area. The active
// item becomes a player-colour pill with a puffy icon and label that glides
// between items; the rest are line icons.

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

export function FloatingNav() {
  const path = usePathname();
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

  return (
    <nav
      aria-label="Main"
      data-player-color={me?.color}
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[398px]"
    >
      <ul className="glass rounded-pill flex h-16 items-center justify-between px-2">
        {ITEMS.map((item) => {
          // Decided after hydration, so the first client render matches the
          // server's however the route was prerendered.
          const active =
            hydrated &&
            (item.match(path) || (item.href === "/player/me" && onMyProfile));
          return (
            <li key={item.href} className="relative flex flex-1 justify-center">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`rounded-pill relative flex h-12 items-center justify-center gap-1.5 ${active ? "text-p-deep px-3" : "text-ink-2 w-12"}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="bg-p shadow-player rounded-pill absolute inset-0"
                    transition={spring.soft}
                  />
                )}
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
                    className="bg-peach ring-surface rounded-pill absolute top-1.5 right-1.5 h-2.5 w-2.5 ring-2"
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
