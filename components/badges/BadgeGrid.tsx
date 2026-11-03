"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { SectionTitle } from "@/components/ui/PageShell";
import { Sheet } from "@/components/ui/Sheet";
import { BADGES, badgeInfo } from "@/lib/badges/catalog";
import { shortDate } from "@/lib/format/ist";
import { useBadges } from "@/lib/game/queries";
import { istParts } from "@/lib/time";
import { Medallion } from "./Medallion";

// The badge cabinet (design §11.10): a 3-column grid of medallions, earned
// ones in full colour with their date, locked ones frosted with the
// condition. Tapping opens a sheet where the medallion slowly turns.

export function BadgeGrid({
  earned,
  limit,
}: {
  /** badge key → when it was earned */
  earned: Record<string, string>;
  /** Show only this many (the profile preview); earned ones first. */
  limit?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const keys = Object.keys(BADGES).sort(
    (a, b) => Number(Boolean(earned[b])) - Number(Boolean(earned[a])),
  );
  const shown = limit ? keys.slice(0, limit) : keys;
  const info = open ? badgeInfo(open) : null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
        {shown.map((k) => {
          const at = earned[k];
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => setOpen(k)}
                className="flex w-full flex-col items-center gap-1 text-center transition-transform active:scale-[0.96]"
                aria-label={`${badgeInfo(k).name}: ${at ? "earned" : badgeInfo(k).condition}`}
              >
                <Medallion badge={k} locked={!at} />
                <span
                  className={`text-sm font-semibold ${at ? "" : "text-ink-2"}`}
                >
                  {badgeInfo(k).name}
                </span>
                <span className="text-ink-3 text-xs leading-tight">
                  {at
                    ? shortDate(istParts(new Date(at)).day)
                    : badgeInfo(k).condition}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <Sheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={info?.name ?? ""}
      >
        {open && info && (
          <div className="flex flex-col items-center gap-3 pb-4 text-center">
            <motion.div
              style={{ transformPerspective: 600 }}
              animate={{ rotateY: [-12, 12, -12] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Medallion badge={open} size={160} locked={!earned[open]} />
            </motion.div>
            {earned[open] ? (
              <Chip tone="mint" icon="check">
                Earned {shortDate(istParts(new Date(earned[open])).day)}
              </Chip>
            ) : (
              <Chip tone="muted" icon="lock">
                Not yet
              </Chip>
            )}
            <p className="text-ink-2">
              {earned[open] ? info.cheer : info.condition}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}

/** design §11.4: six badges on a profile, with "See all". */
export function BadgesPreview({ playerId }: { playerId: string }) {
  const badges = useBadges();
  if (!badges.data) return null;
  const earned: Record<string, string> = {};
  for (const b of badges.data) {
    if (b.player_id === playerId) earned[b.badge_key] = b.earned_at;
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        action={
          <Link
            href="/badges"
            className="text-p-ink inline-flex h-11 items-center text-sm font-semibold"
          >
            See all
          </Link>
        }
      >
        Badges
      </SectionTitle>
      <div className="bg-surface shadow-soft rounded-lg p-4">
        <BadgeGrid earned={earned} limit={6} />
      </div>
    </section>
  );
}
