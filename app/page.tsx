"use client";

import Link from "next/link";
import { ActivityList } from "@/components/game/ActivityList";
import { RemindersPrompt } from "@/components/push/RemindersPrompt";
import { Banner } from "@/components/game/Banner";
import { CountdownPill } from "@/components/game/CountdownPill";
import { PlayerCard } from "@/components/game/PlayerCard";
import { SyncButton } from "@/components/game/SyncButton";
import { TodayQuestCard } from "@/components/game/TodayQuestCard";
import { Button } from "@/components/ui/Button";
import { derivePlayer, pickBanner } from "@/lib/dashboard/derive";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { useGifts } from "@/lib/game/queries";

// The duel dashboard (PRD 5.2, design §11.3), functional pass: both players
// side by side, kept live by Realtime. The sky, islands, creatures and
// flowers arrive with the design pass (build step 9).

export default function HomePage() {
  const now = useNow();
  const { data, isPending, isError, refetch } = useDuel();
  const gifts = useGifts();

  // Cached data (e.g. offline) beats an error screen; only show the error
  // when there's nothing to show.
  if (isError && !data) {
    return (
      <Shell>
        <p className="text-ink-2">
          Something went sideways. Pull to try again.
        </p>
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </Shell>
    );
  }
  if ((isPending && !data) || !now || !data) {
    return (
      <Shell>
        <p className="text-ink-2">Loading…</p>
      </Shell>
    );
  }

  const me = derivePlayer(data.me, data.pair, now);
  const partner = data.partner
    ? derivePlayer(data.partner, data.pair, now)
    : null;
  const banner = pickBanner({
    me,
    pendingRequestFromPartner: data.pendingRequestFromPartner,
    giftOwed: gifts.data?.giving.find((g) => g.owed) ?? null,
  });
  const focusDay = me.focus?.day;
  const names = Object.fromEntries(
    [data.me, data.partner]
      .filter((p) => p !== null)
      .map((p) => [p.id, p.name]),
  );

  return (
    <Shell color={me.color}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] leading-[1.15] font-extrabold">
          Hi {me.name}
        </h1>
        <CountdownPill me={me} />
      </header>

      {banner && (
        <Banner banner={banner} partnerName={partner?.name ?? "your partner"} />
      )}

      <RemindersPrompt />

      <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="bg-surface shadow-soft flex h-14 items-center justify-center rounded-md text-sm font-semibold"
          >
            {a.label}
          </Link>
        ))}
      </nav>

      <TodayQuestCard
        me={me}
        partner={partner}
        startDate={data.pair.startDate}
        solves={focusDay ? (data.me.recentSolves[focusDay] ?? []) : []}
        sync={<SyncButton lastSyncAt={data.me.lastSyncAt} now={now} />}
      />

      {partner ? (
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/player/${me.id}`}>
            <PlayerCard player={me} label="You" />
          </Link>
          <Link href={`/player/${partner.id}`}>
            <PlayerCard player={partner} label="Partner" />
          </Link>
        </div>
      ) : (
        <>
          <section className="bg-surface shadow-soft flex flex-col gap-2 rounded-lg p-5">
            <p>Waiting for your partner to join. Share this code:</p>
            <p className="font-display text-[32px] font-extrabold tracking-[0.12em]">
              {data.pair.inviteCode}
            </p>
          </section>
          <PlayerCard player={me} label="You" />
        </>
      )}

      <ActivityList items={data.activity.slice(0, 3)} names={names} now={now} />

      <Link
        href="/settings"
        className="text-ink-2 inline-flex h-11 items-center self-start text-sm font-semibold"
      >
        Settings
      </Link>
    </Shell>
  );
}

// design §11.3 quick actions; badges, days and nudge join as they're built.
const QUICK_ACTIONS = [
  { href: "/gifts", label: "Gifts" },
  { href: "/restores", label: "Restores" },
  { href: "/milestones", label: "Journey" },
] as const;

function Shell({
  color,
  children,
}: {
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <main
      data-player-color={color}
      className="mx-auto flex w-full max-w-[430px] flex-1 flex-col gap-5 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-10"
    >
      {children}
    </main>
  );
}
