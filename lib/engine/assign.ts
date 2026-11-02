// Day assignment with the grace hour, and solve processing (PRD 4.2–4.4,
// techspec §7.2).

import { addDays, istParts, type DayKey } from "@/lib/time";
import { badgesForSolve } from "./badges";
import { advance, markComplete } from "./evaluate";
import { activity, addXp, awardBadge, beginTx, ensureDay, type Tx } from "./tx";
import { solveXp } from "./xp";
import {
  required,
  type EngineContext,
  type EngineResult,
  type PlayerState,
  type ProcessedSubmission,
  type Submission,
} from "./types";

/** The challenge day a solve counts toward. A grace-hour solve (00:00–00:59
 *  IST) fills yesterday first, but only if yesterday is still pending,
 *  unfinalized, short of its requirement, and hasn't counted this slug. */
export function assignDay(sub: Submission, s: PlayerState): DayKey {
  const { day: C, minuteOfDay } = istParts(sub.submittedAt);
  if (minuteOfDay >= s.rules.graceMinutes) return C;

  const P = addDays(C, -1);
  if (P < s.rules.startDate) return C;
  if (s.lastFinalizedDay !== undefined && s.lastFinalizedDay >= P) return C;

  const prev = s.days[P];
  // No row yet means nothing was solved yesterday: it still needs problems.
  if (!prev) return P;
  if (
    prev.status === "pending" &&
    !prev.finalized &&
    !prev.solvedSlugs.includes(sub.slug) &&
    prev.solvedSlugs.length < required(prev)
  ) {
    return P;
  }
  return C;
}

/** Processes new solves in timestamp order: assigns each to a day, counts it
 *  once per day, awards XP and badges, and completes days live. */
export function processSubmissions(
  state: PlayerState,
  subs: Submission[],
  ctx: EngineContext,
): EngineResult<ProcessedSubmission[]> {
  const tx = beginTx(state, ctx);
  const ordered = [...subs].sort(
    (a, b) =>
      a.submittedAt.getTime() - b.submittedAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  const processed = ordered.map((sub) => processOne(tx, sub));
  return { state: tx.s, effects: tx.effects, value: processed };
}

function processOne(tx: Tx, sub: Submission): ProcessedSubmission {
  const { s } = tx;
  const { day: calendarDay, minuteOfDay } = istParts(sub.submittedAt);
  const assignedDay = assignDay(sub, s);

  // Pre-season: stored for stats, no effect on streaks or XP.
  if (assignedDay < s.rules.startDate) {
    return { ...sub, assignedDay, counted: false, isResolve: false, xp: 0 };
  }

  const day = ensureDay(tx, assignedDay);
  const counted = !day.solvedSlugs.includes(sub.slug);
  const firstDay = s.history.firstCountedDay[sub.slug];
  const isResolve = counted && firstDay !== undefined && firstDay < assignedDay;
  const xp = solveXp({ difficulty: sub.difficulty, counted, isResolve });
  const result = { ...sub, assignedDay, counted, isResolve, xp };
  if (!counted) return result;

  day.solvedSlugs.push(sub.slug);
  recordHistory(tx, sub, assignedDay);
  addXp(tx, xp, "solve", sub.id);
  activity(tx, "solve", { slug: sub.slug, day: assignedDay, xp, isResolve });
  badgesForSolve(tx, sub, day, minuteOfDay);

  const wasPending = day.status === "pending";
  markComplete(tx, day);
  advance(tx);
  // A grace-hour solve that completed yesterday saved it.
  if (assignedDay !== calendarDay && wasPending && day.status === "complete") {
    awardBadge(tx, "night_owl");
  }
  return result;
}

function recordHistory(tx: Tx, sub: Submission, day: DayKey): void {
  const { history } = tx.s;
  const first = history.firstCountedDay[sub.slug];
  if (first === undefined || day < first)
    history.firstCountedDay[sub.slug] = day;
  if (sub.difficulty === "Hard" && !history.hardSlugs.includes(sub.slug)) {
    history.hardSlugs.push(sub.slug);
  }
  for (const topic of sub.topics) {
    if (!history.topics.includes(topic)) history.topics.push(topic);
  }
}
