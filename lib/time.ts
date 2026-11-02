// IST helpers (techspec §5). India has no daylight saving, so IST is a fixed
// +05:30 offset and no timezone library is needed. Pure: never reads the clock.

export const IST_OFFSET_MS = 330 * 60 * 1000;

/** A calendar day in IST, formatted 'YYYY-MM-DD'. Sorts correctly as a string. */
export type DayKey = string;

/** IST calendar date and minutes since IST midnight for an instant. */
export function istParts(t: Date): { day: DayKey; minuteOfDay: number } {
  const shifted = new Date(t.getTime() + IST_OFFSET_MS);
  return {
    day: shifted.toISOString().slice(0, 10),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Instant when IST midnight of `day` begins. */
export function istMidnight(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** Instant when challenge day `day` ends: next IST midnight + grace. */
export function dayEndsAt(day: DayKey, graceMinutes = 60): Date {
  return new Date(
    istMidnight(addDays(day, 1)).getTime() + graceMinutes * 60_000,
  );
}

export const todayIST = (now: Date): DayKey => istParts(now).day;

/** Days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round(
    (istMidnight(to).getTime() - istMidnight(from).getTime()) / 86_400_000,
  );
}
