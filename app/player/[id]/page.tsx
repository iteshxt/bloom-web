"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/ui/PageShell";
import { api } from "@/lib/api/client";
import { targetFor } from "@/lib/engine";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useNow } from "@/lib/dashboard/useNow";
import { shortDate } from "@/lib/format/ist";
import { useTargetHistory } from "@/lib/game/queries";
import { addDays, todayIST } from "@/lib/time";

// Player profile (design §11.4), functional pass: the daily target and its
// history. Only the partner can change it (PRD 4.3). The heatmap, stats and
// badges arrive later in the build.

export default function PlayerPage() {
  // useParams() reads the URL, so it must sit behind a Suspense boundary.
  return (
    <Suspense>
      <PlayerProfile />
    </Suspense>
  );
}

function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const now = useNow();
  const duel = useDuel();
  const history = useTargetHistory(id);

  if (!now || !duel.data || !history.data) {
    return (
      <PageShell title="Profile">
        <p className="text-ink-2">
          {duel.isError || history.isError
            ? "Something went sideways. Try again."
            : "Loading…"}
        </p>
      </PageShell>
    );
  }
  const { me, partner } = duel.data;
  const player = id === me.id ? me : id === partner?.id ? partner : null;
  if (!player) {
    return (
      <PageShell title="Profile">
        <p className="text-ink-2">That player isn’t in your pair.</p>
      </PageShell>
    );
  }

  const isPartner = player.id === partner?.id;
  const today = todayIST(now);
  const tomorrow = addDays(today, 1);
  const todayTarget = targetFor(player.targets, today);
  const tomorrowTarget = targetFor(player.targets, tomorrow);

  return (
    <PageShell title={isPartner ? player.name : "You"} color={player.color}>
      <section className="bg-p-soft flex flex-col gap-1 rounded-lg p-5">
        <p className="font-display text-[48px] leading-none font-extrabold tabular-nums">
          {player.run?.length ?? 0}
        </p>
        <p className="text-ink-2 text-sm">
          day streak · Lv {player.level} · {player.xpTotal} XP
        </p>
        {player.leetcode && (
          <p className="text-ink-2 text-sm">LeetCode: {player.leetcode}</p>
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
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[22px] leading-[1.2] font-bold">
            Target history
          </h2>
          <ul className="flex flex-col gap-1">
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
          className="w-11! px-0!"
          aria-label="One fewer"
          disabled={value <= 1}
          onClick={() => setValue(value - 1)}
        >
          −
        </Button>
        <span className="font-display w-8 text-center text-3xl font-extrabold tabular-nums">
          {value}
        </span>
        <Button
          variant="secondary"
          className="w-11! px-0!"
          aria-label="One more"
          disabled={value >= 10}
          onClick={() => setValue(value + 1)}
        >
          +
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
