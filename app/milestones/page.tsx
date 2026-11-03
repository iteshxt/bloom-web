"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip, PageShell } from "@/components/ui/PageShell";
import { api } from "@/lib/api/client";
import { useDuel } from "@/lib/dashboard/useDuel";
import { shortDate } from "@/lib/format/ist";
import { useAchievements } from "@/lib/game/queries";
import { MAX_MILESTONE } from "@/lib/validation/game";

// The journey (design §11.5, PRD 5.7), functional pass: the milestone path
// with both players' progress and lifetime achievements. The illustrated
// garden road arrives with the design pass.

export default function MilestonesPage() {
  const duel = useDuel();
  const achievements = useAchievements();

  if (!duel.data || !achievements.data) {
    return (
      <PageShell title="Journey">
        <p className="text-ink-2">
          {duel.isError || achievements.isError
            ? "Something went sideways. Try again."
            : "Loading…"}
        </p>
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

  return (
    <PageShell title="Journey" color={me.color}>
      <section className="bg-surface shadow-player flex flex-col gap-3 rounded-xl p-5">
        <p className="font-display text-xl font-bold">
          {next
            ? `${next - myStreak} ${next - myStreak === 1 ? "day" : "days"} to your next gift`
            : "You've passed every milestone"}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-ink-2 text-sm tabular-nums">
            {myStreak} traveled
          </span>
          <div
            className="bg-p-soft rounded-pill h-2.5 flex-1 overflow-hidden"
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
          </div>
          {next && (
            <span className="text-ink-2 text-sm tabular-nums">
              {next - myStreak} left
            </span>
          )}
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {milestones.map((m) => {
          const mine = reached(me.id, m);
          const theirs = partner ? reached(partner.id, m) : undefined;
          return (
            <li
              key={m}
              className="bg-surface shadow-soft flex flex-col gap-2 rounded-lg p-4"
            >
              <h2 className="font-display text-lg font-semibold">{m} days</h2>
              <div className="flex flex-wrap gap-2">
                <Chip tone={mine ? "mint" : "muted"}>
                  You:{" "}
                  {mine
                    ? `reached ${shortDate(mine.achieved_on)}`
                    : `${Math.max(0, m - myStreak)} to go`}
                </Chip>
                {partner && (
                  <Chip tone={theirs ? "mint" : "muted"}>
                    {partner.name}:{" "}
                    {theirs
                      ? `reached ${shortDate(theirs.achieved_on)}`
                      : `${Math.max(0, m - partnerStreak)} to go`}
                  </Chip>
                )}
              </div>
            </li>
          );
        })}
      </ol>

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
          className="border-line bg-surface focus:border-p focus:ring-p-soft h-[52px] w-32 rounded-sm border-[1.5px] px-4 outline-none focus:ring-4"
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
