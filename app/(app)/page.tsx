"use client";

import Link from "next/link";
import { ActivityList, type Person } from "@/components/game/ActivityList";
import { Banner } from "@/components/game/Banner";
import { CountdownPill } from "@/components/game/CountdownPill";
import { PlayerCard } from "@/components/game/PlayerCard";
import { PlayerIsland } from "@/components/game/PlayerIsland";
import { SyncButton } from "@/components/game/SyncButton";
import { TodayQuestCard } from "@/components/game/TodayQuestCard";
import { Companion } from "@/components/companions/Companion";
import { LineIcon } from "@/components/icons/line";
import { PuffyTile, type PuffyName } from "@/components/icons/puffy";
import { RemindersPrompt } from "@/components/push/RemindersPrompt";
import { InstallCard } from "@/components/pwa/InstallCard";
import { Rainbow } from "@/components/sky/Rainbow";
import { ScreenSky } from "@/components/sky/ScreenSky";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Progress";
import { asKind } from "@/lib/companions";
import { derivePlayer, moodFor, pickBanner } from "@/lib/dashboard/derive";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { MomentHost } from "@/components/moments/Moments";
import {
  useAchievements,
  useGifts,
  useRestoreHistory,
} from "@/lib/game/queries";
import type { Snapshot } from "@/lib/moments";
import { todayIST } from "@/lib/time";
import { useMoments } from "@/lib/useMoments";

// The duel dashboard (PRD 5.2, design §11.3): your island and your
// partner's in the sky, today's quest on glass over the sky edge, then the
// calm panel with a banner, quick actions, both player cards and recent
// activity. Realtime keeps it live.

export default function HomePage() {
  const now = useNow();
  const { data, isPending, isError, refetch } = useDuel();
  const gifts = useGifts();
  const restores = useRestoreHistory();
  const achievements = useAchievements();
  const snapshot = momentSnapshot(
    data ?? null,
    now,
    restores.data,
    achievements.data,
  );
  const moments = useMoments(data?.me.id ?? null, snapshot);

  // Cached data (e.g. offline) beats an error screen; only show the error
  // when there's nothing to show.
  if (isError && !data) {
    return (
      <main className="flex flex-1 flex-col">
        <ScreenSky className="h-[260px]" />
        <section className="flex flex-col items-center gap-3 px-4 pt-4 text-center">
          <Companion kind="mochi" mood="sad" size={120} />
          <p className="text-ink-2">
            Something went sideways. Pull to try again.
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </section>
      </main>
    );
  }
  if ((isPending && !data) || !now || !data) {
    return (
      <main className="flex flex-1 flex-col" aria-busy>
        <ScreenSky className="h-[360px]" />
        <div className="flex flex-col gap-4 px-4">
          <Skeleton className="h-16" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-56 rounded-lg" />
            <Skeleton className="h-56 rounded-lg" />
          </div>
        </div>
      </main>
    );
  }

  const me = derivePlayer(data.me, data.pair, now);
  const partner = data.partner
    ? derivePlayer(data.partner, data.pair, now)
    : null;
  const myKind = asKind(data.me.avatarKey);
  const partnerKind = asKind(data.partner?.avatarKey);
  const myMood = moodFor(me, now);
  const partnerMood = partner ? moodFor(partner, now) : "idle";
  const banner = pickBanner({
    me,
    pendingRequestFromPartner: data.pendingRequestFromPartner,
    giftOwed: gifts.data?.giving.find((g) => g.owed) ?? null,
  });
  const focusDay = me.focus?.day;
  const bothDone =
    me.focus?.which === "today" &&
    me.focus.done &&
    partner?.focus?.which === "today" &&
    partner.focus.done;
  const milestoneToday = [me, partner].some(
    (p) =>
      p?.focus?.which === "today" &&
      p.focus.done &&
      data.pair.milestones.includes(p.streak),
  );
  const people: Record<string, Person> = {
    [data.me.id]: { name: data.me.name, kind: myKind, color: data.me.color },
  };
  if (data.partner) {
    people[data.partner.id] = {
      name: data.partner.name,
      kind: partnerKind,
      color: data.partner.color,
    };
  }

  const celebrating = moments.queue[0]?.kind === "day";

  return (
    <main data-player-color={me.color} className="flex flex-1 flex-col">
      <MomentHost
        queue={moments.queue}
        onDone={moments.next}
        cast={{
          name: me.name,
          kind: myKind,
          color: me.color,
          streak: me.streak,
          tokensMax: me.tokensMax,
          partnerName: partner?.name ?? "your partner",
        }}
      />
      <ScreenSky petals={milestoneToday} className="pb-12">
        <header className="flex items-center justify-between gap-2 px-4 pt-4">
          <Link
            href="/player/me"
            className="sky-ink flex min-w-0 items-center gap-1.5"
          >
            <Companion kind={myKind} mood="idle" size={40} color={me.color} />
            <span className="font-display truncate text-[22px] leading-none font-bold">
              Hi {me.name}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <CountdownPill me={me} />
            <Link
              href="/settings"
              aria-label="Notification settings"
              className="bg-surface text-ink shadow-soft rounded-pill inline-flex h-11 w-11 items-center justify-center"
            >
              <LineIcon name="bell" />
            </Link>
          </div>
        </header>

        <div className="relative mt-3 flex items-end justify-between px-1">
          {bothDone && (
            <Rainbow className="absolute -top-2 left-1/2 w-[58%] -translate-x-1/2" />
          )}
          <PlayerIsland
            name={me.name}
            kind={myKind}
            color={me.color}
            streak={me.streak}
            mood={myMood}
            side="left"
            done={me.focus?.done}
          />
          {partner && data.partner ? (
            <PlayerIsland
              name={partner.name}
              kind={partnerKind}
              color={partner.color}
              streak={partner.streak}
              mood={partnerMood}
              side="right"
              done={partner.focus?.done}
            />
          ) : (
            <EmptyIsland code={data.pair.inviteCode} />
          )}
        </div>

        <div className="relative z-10 mt-4 px-4">
          <TodayQuestCard
            celebrating={celebrating}
            me={me}
            partner={partner}
            startDate={data.pair.startDate}
            solves={focusDay ? (data.me.recentSolves[focusDay] ?? []) : []}
            sync={<SyncButton lastSyncAt={data.me.lastSyncAt} now={now} />}
          />
        </div>
      </ScreenSky>

      <div className="flex flex-col gap-6 px-4 pt-3 pb-32">
        {banner && (
          <Banner
            banner={banner}
            partnerName={partner?.name ?? "your partner"}
          />
        )}

        <RemindersPrompt />
        <InstallCard dismissible />

        <nav aria-label="Quick actions" className="flex justify-between gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-1 flex-col items-center gap-1.5 text-[13px] font-semibold transition-transform duration-150 active:scale-[0.94]"
            >
              <PuffyTile name={a.icon} tone={a.tone} />
              {a.label}
            </Link>
          ))}
        </nav>

        {partner ? (
          <div className="grid grid-cols-2 gap-3">
            <Card href={`/player/${me.id}`}>
              <PlayerCard player={me} kind={myKind} mood={myMood} label="You" />
            </Card>
            <Card href={`/player/${partner.id}`}>
              <PlayerCard
                player={partner}
                kind={partnerKind}
                mood={partnerMood}
                label="Partner"
              />
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Card href={`/player/${me.id}`}>
              <PlayerCard player={me} kind={myKind} mood={myMood} label="You" />
            </Card>
            <InviteCard code={data.pair.inviteCode} />
          </div>
        )}

        <ActivityList
          items={data.activity.slice(0, 3)}
          people={people}
          now={now}
        />
      </div>
    </main>
  );
}

/** What the moment detector needs; null until everything has loaded, so a
 *  half-loaded screen never records a wrong baseline. */
function momentSnapshot(
  data: ReturnType<typeof useDuel>["data"] | null,
  now: Date | null,
  restores: ReturnType<typeof useRestoreHistory>["data"],
  achievements: ReturnType<typeof useAchievements>["data"],
): Snapshot | null {
  if (!data || !now || !restores || !achievements) return null;
  const me = derivePlayer(data.me, data.pair, now);
  const partner = data.partner
    ? derivePlayer(data.partner, data.pair, now)
    : null;
  const doneToday = me.focus?.which === "today" && me.focus.done;
  return {
    today: todayIST(now),
    doneToday,
    bothDoneToday:
      doneToday && partner?.focus?.which === "today" && partner.focus.done,
    streak: me.streak,
    onIceDay: me.atRiskDay,
    level: data.me.level,
    milestonesReached: achievements
      .filter((a) => a.player_id === me.id)
      .map((a) => a.milestone),
    answered: restores
      .filter(
        (r) =>
          r.playerId === me.id &&
          (r.status === "approved" ||
            r.status === "rejected" ||
            r.status === "expired"),
      )
      .map((r) => ({
        id: r.id,
        day: r.missedDay,
        status: r.status as "approved" | "rejected" | "expired",
        streak: data.me.lastEndedRunLength ?? 0,
      })),
  };
}

// design §11.3 quick actions; badges and nudges join with the P1 features.
const QUICK_ACTIONS: {
  href: string;
  label: string;
  icon: PuffyName;
  tone: "blush" | "frost" | "sky" | "lilac";
}[] = [
  { href: "/gifts", label: "Gifts", icon: "gift", tone: "blush" },
  { href: "/restores", label: "Restores", icon: "ice", tone: "frost" },
  { href: "/player/me", label: "Days", icon: "calendar", tone: "sky" },
  { href: "/settings", label: "Settings", icon: "gear", tone: "lilac" },
];

function Card({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg transition-transform duration-150 active:scale-[0.97]"
    >
      {children}
    </Link>
  );
}

/** The partner's spot before they join: an empty island with a hint. */
function EmptyIsland({ code }: { code: string }) {
  return (
    <div className="sky-ink flex w-[168px] flex-col items-center gap-1 pb-6 text-center text-sm font-semibold">
      <span className="bg-surface text-ink shadow-soft rounded-pill px-3 py-1">
        Waiting for your partner
      </span>
      <span className="font-display text-lg tracking-[0.12em]">{code}</span>
    </div>
  );
}

function InviteCard({ code }: { code: string }) {
  return (
    <section className="bg-surface shadow-soft flex flex-col justify-center gap-2 rounded-lg p-4">
      <p className="text-ink-2 text-sm">
        Share this code so your partner can join:
      </p>
      <p className="font-display text-[28px] font-extrabold tracking-[0.12em]">
        {code}
      </p>
    </section>
  );
}
