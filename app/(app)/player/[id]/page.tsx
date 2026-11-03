"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Bloom } from "@/components/bloom/Bloom";
import { Companion } from "@/components/companions/Companion";
import { TokenPouch } from "@/components/game/TokenPouch";
import { LineIcon } from "@/components/icons/line";
import { PuffyIcon } from "@/components/icons/puffy";
import { Island } from "@/components/sky/Island";
import { Button } from "@/components/ui/Button";
import { NudgeSheet } from "@/components/game/NudgeSheet";
import { ProfileHistory } from "@/components/game/ProfileHistory";
import { PageShell, SectionTitle } from "@/components/ui/PageShell";
import { ProgressBar, Skeleton } from "@/components/ui/Progress";
import { api } from "@/lib/api/client";
import { bloomLabel, growthFor } from "@/lib/bloom";
import { asKind } from "@/lib/companions";
import { derivePlayer, moodFor } from "@/lib/dashboard/derive";
import { targetFor } from "@/lib/engine";
import { levelTitle } from "@/lib/push/copy";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { shortDate } from "@/lib/format/ist";
import { useTargetHistory } from "@/lib/game/queries";
import { addDays, todayIST } from "@/lib/time";

// Player profile (design §11.4): the sky zooms in on that player's island,
// then their stats and the daily target, which only the partner can change
// (PRD 4.3). The heatmap, difficulty split and badges join with the P1
// features. "/player/me" is the Me tab (§11.11).

export default function PlayerPage() {
  // useParams() reads the URL, so it must sit behind a Suspense boundary.
  return (
    <Suspense>
      <PlayerProfile />
    </Suspense>
  );
}

function PlayerProfile() {
  const params = useParams<{ id: string }>();
  const now = useNow();
  const duel = useDuel();
  // "/player/me" is the Me tab (design §11.11).
  const id = params.id === "me" ? (duel.data?.me.id ?? "") : params.id;
  const history = useTargetHistory(id);

  if (!now || !duel.data || !history.data) {
    return (
      <PageShell title="Profile" skyClassName="h-[300px]">
        {duel.isError || history.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <>
            <Skeleton className="h-14" />
            <Skeleton className="h-40 rounded-lg" />
          </>
        )}
      </PageShell>
    );
  }
  const { me, partner } = duel.data;
  const player = id === me.id ? me : id === partner?.id ? partner : null;
  if (!player) {
    return (
      <PageShell title="Profile" back="/">
        <p className="text-ink-2">That player isn’t in your pair.</p>
      </PageShell>
    );
  }

  const isPartner = player.id === partner?.id;
  const today = todayIST(now);
  const tomorrow = addDays(today, 1);
  const todayTarget = targetFor(player.targets, today);
  const tomorrowTarget = targetFor(player.targets, tomorrow);

  const view = derivePlayer(player, duel.data.pair, now);
  const kind = asKind(player.avatarKey);
  const mood = moodFor(view, now);
  const growth = growthFor(view.streak);

  return (
    <PageShell
      title={isPartner ? player.name : "You"}
      color={player.color}
      back={isPartner ? "/" : undefined}
      skyClassName="pb-14"
      sky={
        <>
          <div className="sky-ink -mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <PuffyIcon name="crown" size={28} />
            Level {player.level} · {levelTitle(player.level)}
            {!isPartner && (
              <Link
                href="/settings"
                aria-label="Settings"
                className="bg-surface text-ink shadow-soft rounded-pill absolute top-5 right-4 inline-flex h-11 w-11 items-center justify-center"
              >
                <LineIcon name="gear" />
              </Link>
            )}
          </div>
          <div className="flex justify-center pt-2">
            <Island width={260} frozen={view.onIce}>
              <Companion
                kind={kind}
                mood={mood}
                size={140}
                streak={view.streak}
                label={`${player.name}’s companion`}
                className="-mr-6"
              />
              <Bloom
                streak={view.streak}
                size={120}
                frozen={view.onIce}
                label={bloomLabel({
                  name: player.name,
                  streak: view.streak,
                  state: view.onIce
                    ? "frozen"
                    : view.focus?.done
                      ? "done"
                      : "pending",
                })}
              />
            </Island>
          </div>
        </>
      }
    >
      {isPartner && <NudgeButton meId={me.id} partner={player} />}

      <ProfileHistory
        playerId={player.id}
        name={player.name}
        color={player.color}
        streak={view.streak}
        today={today}
        startDate={duel.data.pair.startDate}
      />

      <section className="bg-surface shadow-soft flex flex-col gap-3 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            Level {player.level} · {growth.label}
          </h2>
          <span className="text-butter-ink tabular text-sm font-semibold">
            {view.xpIntoLevel} / {view.xpLevelSpan} XP
          </span>
        </div>
        <ProgressBar
          value={view.xpIntoLevel}
          max={view.xpLevelSpan}
          tone="butter"
          label="XP to next level"
        />
        <div className="flex items-center justify-between gap-3">
          <TokenPouch
            tokens={view.tokens}
            max={view.tokensMax}
            label="restore tokens"
          />
          {view.nextMilestone && (
            <span className="text-p-ink text-sm font-semibold">
              {view.nextMilestone.daysToGo === 1
                ? "Next gift tomorrow"
                : `Next gift in ${view.nextMilestone.daysToGo} days`}
            </span>
          )}
        </div>
        {player.leetcode && (
          <p className="text-ink-2 inline-flex items-center gap-1.5 text-sm">
            <PuffyIcon name="code" size={24} /> LeetCode: {player.leetcode}
          </p>
        )}
      </section>

      {isPartner ? (
        <TargetStepper
          playerId={player.id}
          name={player.name}
          current={tomorrowTarget}
          today={todayTarget}
          tomorrow={tomorrow}
        />
      ) : (
        <section className="bg-surface shadow-soft flex flex-col gap-1 rounded-lg p-5">
          <h2 className="font-display text-lg font-semibold">
            Your daily target: {todayTarget}
          </h2>
          {tomorrowTarget !== todayTarget && (
            <p className="text-ink-2 text-sm">
              {partner?.name ?? "Your partner"} set it to {tomorrowTarget} from{" "}
              {shortDate(tomorrow)}.
            </p>
          )}
          <p className="text-ink-2 text-sm">
            Only {partner?.name ?? "your partner"} can change it.
          </p>
        </section>
      )}

      {history.data.length > 0 && (
        <section className="flex flex-col gap-3">
          <SectionTitle>Target history</SectionTitle>
          <ul className="bg-surface shadow-soft flex flex-col gap-2 rounded-md p-4">
            {history.data.map((t) => (
              <li
                key={t.effective_from}
                className="flex justify-between text-sm"
              >
                <span>From {shortDate(t.effective_from)}</span>
                <span className="font-semibold">
                  {t.target} {t.target === 1 ? "problem" : "problems"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}

/** design §11.4: "{Partner}'s daily target: 2", −/+, takes effect tomorrow. */
function TargetStepper({
  playerId,
  name,
  current,
  today,
  tomorrow,
}: {
  playerId: string;
  name: string;
  current: number;
  today: number;
  tomorrow: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await api<{ effectiveFrom: string }>("/api/target", {
      body: { playerId, target: value },
    });
    setBusy(false);
    if (!res.ok) return setMessage(res.message);
    setMessage(
      `Saved. ${name}'s target is ${value} from ${shortDate(res.data.effectiveFrom)}.`,
    );
    await queryClient.invalidateQueries();
  }

  return (
    <section className="bg-surface shadow-soft flex flex-col gap-3 rounded-lg p-5">
      <h2 className="font-display text-lg font-semibold">
        {name}’s daily target: {value}
      </h2>
      <div className="flex items-center gap-4">
        <Button
          variant="secondary"
          className="w-12! px-0!"
          aria-label="One fewer"
          disabled={value <= 1}
          onClick={() => setValue(value - 1)}
        >
          <LineIcon name="minus" />
        </Button>
        <span className="font-display w-10 text-center text-[40px] leading-none font-extrabold tabular-nums">
          {value}
        </span>
        <Button
          variant="secondary"
          className="w-12! px-0!"
          aria-label="One more"
          disabled={value >= 10}
          onClick={() => setValue(value + 1)}
        >
          <LineIcon name="plus" />
        </Button>
      </div>
      <p className="text-ink-2 text-sm">
        Changes start tomorrow, {shortDate(tomorrow)}. Today stays at {today}.
      </p>
      <Button disabled={busy || value === current} onClick={save}>
        {busy ? "Saving…" : "Save target"}
      </Button>
      {message && (
        <p role="status" className="text-ink-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

/** Nudge from the partner's profile (PRD 5.12). */
function NudgeButton({
  meId,
  partner,
}: {
  meId: string;
  partner: { name: string; color: string; avatarKey: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="soft"
        tone="peach"
        className="self-start"
        onClick={() => setOpen(true)}
      >
        <PuffyIcon name="wave" size={28} /> Nudge {partner.name}
      </Button>
      <NudgeSheet
        open={open}
        onClose={() => setOpen(false)}
        meId={meId}
        partnerName={partner.name}
        partnerKind={asKind(partner.avatarKey)}
        partnerColor={partner.color}
      />
    </>
  );
}
