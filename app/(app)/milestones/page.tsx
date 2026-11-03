"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bloom } from "@/components/bloom/Bloom";
import { JourneyRoad } from "@/components/game/JourneyRoad";
import { LineIcon } from "@/components/icons/line";
import { Button } from "@/components/ui/Button";
import { StatChip } from "@/components/ui/Chip";
import { PageShell } from "@/components/ui/PageShell";
import { Skeleton } from "@/components/ui/Progress";
import { api } from "@/lib/api/client";
import { asKind } from "@/lib/companions";
import { useDuel } from "@/lib/dashboard/useDuel";
import { useHydrated } from "@/lib/useHydrated";
import { useAchievements } from "@/lib/game/queries";
import { MAX_MILESTONE } from "@/lib/game/limits";

// The journey (design §11.5, PRD 5.7): stat chips on the sky, the winding
// garden road with a gift at every milestone, and a bottom card with the
// direction to your next gift and a slider whose thumb is your flower.

export default function MilestonesPage() {
  // Waits for hydration: the offline cache restores before it.
  const hydrated = useHydrated();
  const duel = useDuel();
  const achievements = useAchievements();

  if (!hydrated || !duel.data || !achievements.data) {
    return (
      <PageShell title="Journey">
        {duel.isError || achievements.isError ? (
          <p className="text-ink-2">Something went sideways. Try again.</p>
        ) : (
          <Skeleton className="h-[480px] rounded-xl" />
        )}
      </PageShell>
    );
  }

  const { me, partner, pair } = duel.data;
  const myStreak = me.run?.length ?? 0;
  const partnerStreak = partner?.run?.length ?? 0;
  const milestones = [...pair.milestones].sort((a, b) => a - b);
  const reached = (playerId: string, m: number) =>
    achievements.data.find(
      (a) => a.player_id === playerId && a.milestone === m,
    );
  const next = milestones.find((m) => m > myStreak);
  const prev = [...milestones].reverse().find((m) => m <= myStreak) ?? 0;
  const pct = next ? ((myStreak - prev) / (next - prev)) * 100 : 100;

  const reachedAny = (playerId: string, m: number) =>
    Boolean(reached(playerId, m));
  const left = next ? next - myStreak : 0;

  return (
    <PageShell
      title="Journey"
      color={me.color}
      skyClassName="pb-12"
      sky={
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <StatChip icon="bloom" value={myStreak} label="day streak" />
          <StatChip
            icon="gift"
            value={next ? left : "All"}
            label={next ? "to your next gift" : "gifts reached"}
          />
          <StatChip icon="crown" value={me.level} label="level" />
        </div>
      }
    >
      <JourneyRoad
        milestones={milestones}
        reached={reachedAny}
        me={{
          id: me.id,
          name: me.name,
          kind: asKind(me.avatarKey),
          color: me.color,
          streak: myStreak,
          onIce: Boolean(me.run?.atRiskDay),
        }}
        partner={
          partner
            ? {
                id: partner.id,
                name: partner.name,
                kind: asKind(partner.avatarKey),
                color: partner.color,
                streak: partnerStreak,
                onIce: Boolean(partner.run?.atRiskDay),
              }
            : null
        }
      />

      <section className="bg-surface shadow-float sticky bottom-24 z-10 flex flex-col gap-3 rounded-xl p-5">
        <p className="rounded-pill bg-p-soft text-p-deep inline-flex items-center gap-2 self-start py-1.5 pr-4 pl-1.5 text-sm font-semibold">
          <span className="bg-p rounded-pill inline-flex h-8 w-8 items-center justify-center">
            <LineIcon name="next" size={18} />
          </span>
          {next
            ? `${left} ${left === 1 ? "day" : "days"} to your next gift`
            : "You’ve passed every milestone"}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-ink-2 tabular text-sm">
            {myStreak} traveled
          </span>
          <div
            className="bg-p-soft rounded-pill relative h-2.5 flex-1"
            role="progressbar"
            aria-valuemin={prev}
            aria-valuemax={next ?? myStreak}
            aria-valuenow={myStreak}
            aria-label="Progress to the next milestone"
          >
            <div
              className="bg-p rounded-pill h-full"
              style={{ width: `${pct}%` }}
            />
            <span
              className="absolute top-1/2 -translate-x-1/2 -translate-y-[62%]"
              style={{ left: `${pct}%` }}
            >
              <Bloom streak={myStreak} size={34} />
            </span>
          </div>
          {next && (
            <span className="text-ink-2 tabular text-sm">{left} left</span>
          )}
        </div>
      </section>

      <AddMilestone existing={milestones} />
    </PageShell>
  );
}

/** Either player can add a higher milestone; none can be removed (PRD 4.8). */
function AddMilestone({ existing }: { existing: number[] }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function add() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > MAX_MILESTONE) {
      return setMessage(`Pick a whole number of days up to ${MAX_MILESTONE}`);
    }
    if (existing.includes(n))
      return setMessage("That milestone is already on the path");
    setBusy(true);
    setMessage(null);
    const res = await api("/api/pair", {
      method: "PATCH",
      body: { addMilestone: n },
    });
    setBusy(false);
    if (!res.ok) return setMessage(res.message);
    setValue("");
    await queryClient.invalidateQueries();
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <label htmlFor="add-milestone" className="text-sm font-semibold">
        Add a milestone
      </label>
      <div className="flex gap-2">
        <input
          id="add-milestone"
          inputMode="numeric"
          placeholder="e.g. 150"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="border-line bg-surface text-ink focus:border-p focus:ring-p-soft h-[52px] w-32 rounded-sm border-[1.5px] px-4 outline-none focus:ring-4"
        />
        <Button type="submit" variant="secondary" disabled={busy || !value}>
          Add
        </Button>
      </div>
      <p className="text-ink-2 text-sm" role="status">
        {message ?? "Milestones can be added but never removed."}
      </p>
    </form>
  );
}
