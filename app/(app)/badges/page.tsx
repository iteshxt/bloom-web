"use client";

import * as m from "motion/react-m";
import { useState } from "react";
import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { BADGES } from "@/lib/badges/catalog";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useBadges } from "@/lib/game/queries";
import { spring } from "@/lib/motion";
import { useHydrated } from "@/lib/useHydrated";

// Badges (design §11.10, PRD 5.11): your cabinet, or your partner's.

export default function BadgesPage() {
  const hydrated = useHydrated();
  const duel = useDuel();
  const badges = useBadges();
  const [whose, setWhose] = useState<"me" | "partner">("me");

  if (!hydrated || !duel.data || !badges.data) {
    return (
      <PageShell title="Badges" back="/player/me">
        {duel.isError || badges.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <Skeleton className="h-72 rounded-xl" />
        )}
      </PageShell>
    );
  }
  const { me, partner } = duel.data;
  const player = whose === "partner" && partner ? partner : me;
  const earned: Record<string, string> = {};
  for (const b of badges.data) {
    if (b.player_id === player.id) earned[b.badge_key] = b.earned_at;
  }
  const total = Object.keys(BADGES).length;
  const count = Object.keys(earned).filter((k) => k in BADGES).length;

  return (
    <PageShell
      title="Badges"
      back="/player/me"
      color={player.color}
      skyClassName="pb-12"
      sky={
        <div className="flex flex-col gap-3">
          <p className="sky-ink font-semibold">
            {count} of {total} earned
          </p>
          {partner && (
            <div
              role="tablist"
              aria-label="Whose badges"
              className="bg-surface shadow-soft rounded-pill grid grid-cols-2 gap-1 p-1"
            >
              {(["me", "partner"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={whose === t}
                  onClick={() => setWhose(t)}
                  className={`rounded-pill relative h-11 font-semibold ${whose === t ? "text-p-deep" : "text-ink-2"}`}
                >
                  {whose === t && (
                    <m.span
                      layoutId="badge-tab"
                      className="bg-p rounded-pill absolute inset-0"
                      transition={spring.soft}
                    />
                  )}
                  <span className="relative">
                    {t === "me" ? "Mine" : partner.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      <BadgeGrid earned={earned} />
    </PageShell>
  );
}
