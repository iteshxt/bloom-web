import type { PlayerView } from "@/lib/dashboard/derive";
import type { Solve } from "@/lib/dashboard/useDuel";
import { istClock, shortDate, weekday } from "@/lib/format/ist";
import { addDays } from "@/lib/time";

// design §10.4 and §11.3 states. Seeds: one per required problem; make-up
// seeds are frost. More than 6 switches to a segmented bar.

export function TodayQuestCard({
  me,
  partner,
  startDate,
  solves,
  sync,
}: {
  me: PlayerView;
  partner: PlayerView | null;
  startDate: string;
  solves: Solve[];
  sync: React.ReactNode;
}) {
  if (me.startsInDays !== null) {
    return (
      <Card>
        <h2 className="font-display text-lg font-semibold">Before the start</h2>
        <p className="text-ink-2">
          Your first day is {shortDate(startDate)}. Warm up with any problem;
          it’ll show as pre-season.
        </p>
        {sync}
      </Card>
    );
  }
  const f = me.focus;
  if (!f) return null;

  const minutesLeft = Math.max(0, Math.ceil(f.msLeft / 60_000));
  const title =
    f.which === "yesterday"
      ? `Still yesterday · ${minutesLeft} min of grace`
      : "Today";
  const bothDone = f.done && partner?.focus?.done;

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {f.done && (
          <span className="rounded-pill bg-mint-soft text-mint-deep px-3 py-1 text-[13px] font-semibold">
            Done
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Seeds solved={f.solved} target={f.target} makeup={f.makeup} />
        <span className="font-display text-lg font-semibold tabular-nums">
          {Math.min(f.solved, f.required)} of {f.required}
        </span>
      </div>
      {f.makeup > 0 && (
        <span className="rounded-pill bg-frost-soft text-frost-deep self-start px-3 py-1 text-[13px] font-semibold">
          +{f.makeup} make-up for {weekday(addDays(f.day, -1))}
        </span>
      )}

      <p className="text-ink-2">
        {bothDone
          ? "You both bloomed today."
          : f.done
            ? partner?.focus
              ? `Done. ${partner.name}: ${Math.min(partner.focus.solved, partner.focus.required)} of ${partner.focus.required}.`
              : "Done for today. Your flower’s happy."
            : f.solved === 0
              ? `Today’s quest: ${f.required} ${f.required === 1 ? "problem" : "problems"}. Any one counts.`
              : `${f.required - f.solved} more to go.`}
      </p>

      {solves.length > 0 && (
        <ul className="border-line flex flex-col gap-1 border-t pt-3">
          {solves.slice(0, 2).map((s) => (
            <li
              key={s.submittedAt + s.title}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="truncate">
                {s.title}
                {s.difficulty ? ` · ${s.difficulty}` : ""} ·{" "}
                {istClock(s.submittedAt)}
              </span>
              {s.xp > 0 && (
                <span className="text-butter-deep shrink-0 font-semibold">
                  +{s.xp}xp
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {sync}
    </Card>
  );
}

function Seeds({
  solved,
  target,
  makeup,
}: {
  solved: number;
  target: number;
  makeup: number;
}) {
  const total = target + makeup;
  const filled = Math.min(solved, total);
  if (total > 6) {
    return (
      <div className="flex h-3 w-40 gap-0.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`rounded-pill flex-1 ${i < filled ? "bg-p" : "bg-p-soft"}`}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-2" aria-hidden>
      {Array.from({ length: total }, (_, i) => {
        const isMakeup = i >= target;
        const on = i < filled;
        return (
          <span
            key={i}
            className={`rounded-pill h-6 w-6 border-2 ${
              isMakeup
                ? on
                  ? "border-frost-deep bg-frost"
                  : "border-frost-deep bg-frost-soft"
                : on
                  ? "border-p bg-p"
                  : "border-p bg-surface"
            }`}
          />
        );
      })}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-surface shadow-player flex flex-col gap-3 rounded-lg p-5">
      {children}
    </section>
  );
}
