import { PuffyIcon } from "@/components/icons/puffy";
import { Chip } from "@/components/ui/Chip";
import type { PlayerView } from "@/lib/dashboard/derive";
import type { Solve } from "@/lib/dashboard/useDuel";
import { istClock, shortDate, weekday } from "@/lib/format/ist";
import { addDays } from "@/lib/time";
import { Seeds } from "./Seeds";

// design §10.4 and §11.3 states: a glass card overlapping the sky edge.
// Progress seeds, the make-up chip, the latest solves and Sync now.

export function TodayQuestCard({
  me,
  partner,
  startDate,
  solves,
  sync,
  celebrating = false,
}: {
  /** Day complete: a momentary mint glow (design §12.4, t = 120 ms). */
  celebrating?: boolean;
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
    <Card done={f.done} glow={celebrating}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="font-display tabular text-lg font-semibold">
          {Math.min(f.solved, f.required)} of {f.required}
        </span>
      </div>

      <Seeds solved={f.solved} target={f.target} makeup={f.makeup} />
      {f.makeup > 0 && (
        <Chip tone="frost" icon="ice" className="self-start">
          +{f.makeup} make-up for {weekday(addDays(f.day, -1))}
        </Chip>
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
        <ul className="border-line flex flex-col gap-1.5 border-t pt-3">
          {solves.slice(0, 2).map((s) => (
            <li
              key={s.submittedAt + s.title}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate">
                <span className="font-semibold">{s.title}</span>
                <span className="text-ink-2">
                  {s.difficulty ? ` · ${s.difficulty}` : ""} ·{" "}
                  {istClock(s.submittedAt)}
                </span>
              </span>
              {s.xp > 0 && (
                <span className="text-butter-ink shrink-0 font-semibold">
                  +{s.xp} XP
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

function Card({
  done = false,
  glow = false,
  children,
}: {
  done?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`glass relative flex flex-col gap-3 rounded-lg p-5 transition-shadow duration-[600ms] ${glow ? "shadow-glow-mint!" : ""}`}
    >
      {done && (
        <span className="absolute -top-3 -right-2" aria-label="Done">
          <PuffyIcon name="check" size={44} />
        </span>
      )}
      {children}
    </section>
  );
}
