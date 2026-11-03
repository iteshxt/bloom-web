import type { ActivityItem } from "@/lib/dashboard/useDuel";
import { ago, humanizeSlug } from "@/lib/format/ist";

// The "Recent" list on home (design §11.3): the last few pair events.

export function ActivityList({
  items,
  names,
  now,
}: {
  items: ActivityItem[];
  names: Record<string, string>;
  now: Date;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[22px] leading-[1.2] font-bold">
        Recent
      </h2>
      {items.length === 0 ? (
        <p className="text-ink-2">Your story starts with the first solve.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 text-sm">
              <span>{describe(a, names[a.actorId ?? ""] ?? "Someone")}</span>
              <span className="text-ink-3 shrink-0">
                {ago(new Date(a.createdAt), now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function describe(a: ActivityItem, name: string): string {
  const p = a.payload;
  switch (a.kind) {
    case "solve":
      return `${name} solved ${humanizeSlug(String(p.slug ?? "a problem"))}${
        Number(p.xp) > 0 ? ` · +${p.xp} XP` : ""
      }`;
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
    default:
      return `${name}: ${a.kind.replace(/_/g, " ")}`;
  }
}
