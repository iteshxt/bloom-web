"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { describe, type Person } from "@/components/game/ActivityList";
import { Companion } from "@/components/companions/Companion";
import { PuffyIcon, type PuffyName } from "@/components/icons/puffy";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { asKind } from "@/lib/companions";
import { useDuel, type ActivityItem } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { markFeedSeen } from "@/lib/feedSeen";
import { istClock, shortDate } from "@/lib/format/ist";
import { useActivityFeed } from "@/lib/game/queries";
import { spring } from "@/lib/motion";
import { addDays, istParts, todayIST } from "@/lib/time";

// Activity (PRD 5.14, design §11.12): a shared timeline grouped by day.
// Each row has its owner's companion; XP gains are butter chips; the big
// moments (milestones, restores, gifts, levels, badges) are larger cards.
// The bell on home opens it.

const BIG: Partial<Record<string, PuffyName>> = {
  milestone: "gift",
  restore_approved: "heart",
  restore_rejected: "ice",
  restore_expired: "ice",
  gift_revealed: "giftOpen",
  gift_received: "giftOpen",
  level_up: "crown",
  badge: "trophy",
  run_ended: "sprout",
};

export default function FeedPage() {
  const now = useNow();
  const duel = useDuel();
  const feed = useActivityFeed();
  const meId = duel.data?.me.id;
  const newest = feed.data?.[0]?.id;

  useEffect(() => {
    if (meId && newest) markFeedSeen(meId, newest);
  }, [meId, newest]);

  if (!now || !duel.data || !feed.data) {
    return (
      <PageShell title="Activity" back="/">
        {feed.isError || duel.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </>
        )}
      </PageShell>
    );
  }

  const people: Record<string, Person> = {};
  for (const p of [duel.data.me, duel.data.partner]) {
    if (p)
      people[p.id] = {
        name: p.name,
        kind: asKind(p.avatarKey),
        color: p.color,
      };
  }
  const today = todayIST(now);
  const groups = new Map<string, ActivityItem[]>();
  for (const a of feed.data) {
    const day = istParts(new Date(a.createdAt)).day;
    groups.set(day, [...(groups.get(day) ?? []), a]);
  }
  const label = (day: string) =>
    day === today
      ? "Today"
      : day === addDays(today, -1)
        ? "Yesterday"
        : shortDate(day);

  return (
    <PageShell title="Activity" back="/" color={duel.data.me.color}>
      {feed.data.length === 0 ? (
        <section className="bg-surface shadow-soft flex flex-col items-center gap-2 rounded-xl p-6 text-center">
          <Companion
            kind={people[duel.data.me.id].kind}
            mood="waiting"
            size={96}
          />
          <p className="text-ink-2">Your story starts with the first solve.</p>
        </section>
      ) : (
        [...groups].map(([day, items]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-semibold">{label(day)}</h2>
            <ol className="border-line relative ml-[18px] flex flex-col gap-2 border-l-2 border-dashed pl-0">
              <AnimatePresence initial={false}>
                {items.map((a) => {
                  const who = people[a.actorId ?? ""];
                  const big = BIG[a.kind];
                  const xp = a.kind === "solve" ? Number(a.payload.xp) : 0;
                  return (
                    <motion.li
                      key={a.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={spring.soft}
                      className="relative -ml-[19px] flex items-start gap-2.5"
                    >
                      <span className="bg-cloud rounded-pill shrink-0">
                        {who ? (
                          <Companion
                            kind={who.kind}
                            color={who.color}
                            size={36}
                            mood="idle"
                          />
                        ) : (
                          <span className="block h-9 w-9" />
                        )}
                      </span>
                      <div
                        data-player-color={who?.color}
                        className={`flex flex-1 items-center gap-2 rounded-md ${
                          big ? "bg-p-wash shadow-player p-3" : "py-1.5"
                        }`}
                      >
                        {big && (
                          <PuffyIcon
                            name={big}
                            size={40}
                            className="shrink-0"
                          />
                        )}
                        <span
                          className={`flex-1 ${big ? "font-semibold" : "text-sm"}`}
                        >
                          {describe(a, who?.name ?? "Someone", people)}
                        </span>
                        {xp > 0 && (
                          <span className="rounded-pill bg-butter-soft text-butter-deep shrink-0 px-2 py-0.5 text-xs font-semibold">
                            +{xp} XP
                          </span>
                        )}
                        <span className="text-ink-3 shrink-0 text-xs">
                          {istClock(a.createdAt)}
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </section>
        ))
      )}
    </PageShell>
  );
}
