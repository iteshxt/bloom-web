import { istParts, type DayKey } from "@/lib/time";

// Display helpers that format in IST without touching the device timezone
// (CLAUDE.md invariant 1).

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Sunday" for a day key. */
export function weekday(day: DayKey): string {
  return WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
}

/** "Sun, 1 Nov" for a day key. */
export function shortDate(day: DayKey): string {
  const d = new Date(`${day}T00:00:00Z`);
  return `${weekday(day).slice(0, 3)}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "9:41 pm" in IST. */
export function istClock(t: Date | string): string {
  const { minuteOfDay } = istParts(typeof t === "string" ? new Date(t) : t);
  const h24 = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
}

/** "just now", "4m ago", "2h ago", "3d ago". */
export function ago(t: Date, now: Date): string {
  const mins = Math.floor((now.getTime() - t.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** "two-sum" → "Two sum", for activity rows that only carry a slug. */
export function humanizeSlug(slug: string): string {
  const s = slug.replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
