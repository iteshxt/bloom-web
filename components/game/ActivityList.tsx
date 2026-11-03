import { AnimatePresence, motion } from "motion/react";
import { Companion } from "@/components/companions/Companion";
import { spring } from "@/lib/motion";
import { SectionTitle } from "@/components/ui/PageShell";
import type { ActivityItem } from "@/lib/dashboard/useDuel";
import { ago, humanizeSlug } from "@/lib/format/ist";
import type { Companion as Kind } from "@/lib/validation/onboarding";

// The "Recent" list on home (design §11.3, §11.12): the last few pair
// events, each with its owner's 36 px companion in their colour.

export interface Person {
  name: string;
  kind: Kind;
  color: string;
}

export function ActivityList({
  items,
  people,
  now,
}: {
  items: ActivityItem[];
  people: Record<string, Person>;
  now: Date;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle>Recent</SectionTitle>
      {items.length === 0 ? (
        <p className="text-ink-2">Your story starts with the first solve.</p>
      ) : (
        <ul className="bg-surface shadow-soft flex flex-col gap-1 rounded-md p-2">
          {/* Only new items animate in, never the whole list (§12.3). */}
          <AnimatePresence initial={false}>
            {items.map((a) => {
              const who = people[a.actorId ?? ""];
              const xp = a.kind === "solve" ? Number(a.payload.xp) : 0;
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={spring.soft}
                  className="flex items-center gap-2.5 py-1 pr-2"
                >
                  {who ? (
                    <Companion
                      kind={who.kind}
                      color={who.color}
                      size={36}
                      mood="idle"
                      className="shrink-0"
                    />
                  ) : (
                    <span className="w-9" />
                  )}
                  <span className="flex-1 text-sm">
                    {describe(a, who?.name ?? "Someone", people)}
                  </span>
                  {xp > 0 && (
                    <span className="rounded-pill bg-butter-soft text-butter-deep shrink-0 px-2 py-0.5 text-xs font-semibold">
                      +{xp}
                    </span>
                  )}
                  <span className="text-ink-3 shrink-0 text-xs">
                    {ago(new Date(a.createdAt), now)}
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

/** One line of copy for an activity row (design §11.12). */
export function describe(
  a: ActivityItem,
  name: string,
  people: Record<string, Person> = {},
): string {
  const p = a.payload;
  switch (a.kind) {
    case "solve":
      return `${name} solved ${humanizeSlug(String(p.slug ?? "a problem"))}`;
    case "day_complete":
      return `${name} bloomed: day ${p.streak ?? ""} done`;
    case "milestone":
      return `${name} reached ${p.milestone} days`;
    case "level_up":
      return `${name} reached level ${p.level}`;
    case "badge":
      return `${name} earned a badge`;
    case "streak_on_ice":
      return `${name}’s flower is frosted`;
    case "run_ended":
      return `${name}’s ${p.length}-day streak ended. A new seed is planted.`;
    case "restore_requested":
      return `${name} asked for a restore`;
    case "restore_approved":
      return `${name}’s restore was approved`;
    case "restore_rejected":
      return `${name}’s restore was turned down`;
    case "restore_expired":
      return `${name}’s restore request expired`;
    case "restore_cancelled":
      return `${name} cancelled a restore request`;
    case "makeup_changed":
      return `${name} turned make-up days ${p.makeupEnabled ? "on" : "off"}`;
    case "milestone_added":
      return `${name} added a ${p.milestone}-day milestone`;
    case "start_date_changed":
      return `${name} moved day 1`;
    case "target_changed":
      return `${name} set a new daily target: ${p.target}`;
    case "nudge":
      return `${name} nudged ${people[String(p.toId)]?.name ?? "their partner"}: “${p.message}”`;
    case "gift_wrapped":
      return `${name} wrapped a ${p.milestone}-day gift`;
    case "gift_revealed":
      return `${name} opened a ${p.milestone}-day gift`;
    case "gift_received":
      return `${name} received a ${p.milestone}-day gift`;
    default:
      return `${name}: ${a.kind.replace(/_/g, " ")}`;
  }
}
