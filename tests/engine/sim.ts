// Test harness: drives the pure engine the way the services will (sync →
// finalize → actions), collecting effects. All times are IST.

import {
  cancelRestore,
  createPlayerState,
  finalizeOverdue,
  processSubmissions,
  requestRestore,
  respondRestore,
  type Day,
  type Difficulty,
  type Effect,
  type NotificationKind,
  type PairRules,
  type PlayerState,
  type ProcessedSubmission,
  type Run,
  type TargetChange,
} from "@/lib/engine";
import { addDays, istMidnight, type DayKey } from "@/lib/time";

export const START: DayKey = "2026-11-01";
export const day = (n: number): DayKey => addDays(START, n);

/** Instant for an IST wall-clock time, 'HH:MM' or 'HH:MM:SS'. */
export function at(d: DayKey, time: string): Date {
  const [h, m, s = 0] = time.split(":").map(Number);
  return new Date(istMidnight(d).getTime() + ((h * 60 + m) * 60 + s) * 1000);
}

export interface SolveInput {
  slug: string;
  at: Date;
  difficulty?: Difficulty;
  topics?: string[];
  /** A manual check-in (PRD 5.13) rather than a synced LeetCode solve. */
  manual?: boolean;
}

export class Sim {
  state: PlayerState;
  effects: Effect[] = [];
  private ids = 0;
  private subIds = 0;
  newId = (): string => `id-${++this.ids}`;

  constructor(rules: Partial<PairRules> = {}, targets: TargetChange[] = []) {
    this.state = createPlayerState({
      playerId: "p1",
      rules: {
        milestones: [15, 30, 50, 100],
        tokensPerRun: 3,
        graceMinutes: 60,
        makeupEnabled: true,
        startDate: START,
        ...rules,
      },
      targets,
      newId: this.newId,
    });
  }

  /** One sync that picks up these solves, running at `syncAt`. */
  sync(solves: SolveInput[], syncAt?: Date): ProcessedSubmission[] {
    const now = syncAt ?? solves[solves.length - 1].at;
    const r = processSubmissions(
      this.state,
      solves.map((s) => ({
        id: `sub-${++this.subIds}`,
        slug: s.slug,
        submittedAt: s.at,
        difficulty: s.difficulty ?? "Easy",
        topics: s.topics ?? [],
        ...(s.manual ? { manual: true } : {}),
      })),
      { now, newId: this.newId },
    );
    this.apply(r);
    return r.value;
  }

  solve(
    slug: string,
    d: DayKey,
    time: string,
    difficulty: Difficulty = "Easy",
    topics: string[] = [],
  ): ProcessedSubmission {
    return this.sync([{ slug, at: at(d, time), difficulty, topics }])[0];
  }

  finalize(now: Date, lastSyncSuccessAt: Date = now): DayKey[] {
    const r = finalizeOverdue(this.state, {
      now,
      newId: this.newId,
      lastSyncSuccessAt,
    });
    this.apply(r);
    return r.value;
  }

  /** A complete day: one fresh problem at 14:00, then the 02:00 tick. */
  play(d: DayKey): void {
    this.solve(`p-${d}`, d, "14:00");
    this.finalize(at(addDays(d, 1), "02:00"));
  }

  playDays(from: DayKey, n: number): void {
    for (let i = 0; i < n; i++) this.play(addDays(from, i));
  }

  /** Nothing solved on `d`; the tick runs at 02:00 the next day. */
  miss(d: DayKey): void {
    this.finalize(at(addDays(d, 1), "02:00"));
  }

  request(now: Date, message?: string) {
    const r = requestRestore(
      this.state,
      { now, newId: this.newId },
      { message },
    );
    if (r.ok) this.apply(r);
    return r;
  }

  cancel(now: Date, requestId: string) {
    const r = cancelRestore(this.state, { now, newId: this.newId }, requestId);
    if (r.ok) this.apply(r);
    return r;
  }

  respond(now: Date, approve: boolean, approvalsGiven = 0, reply?: string) {
    const pending = this.state.restores.find((q) => q.status === "pending");
    const r = respondRestore(
      this.state,
      { now, newId: this.newId },
      {
        requestId: pending?.id ?? "missing",
        approve,
        reply,
        approver: { approvalsGiven, badges: [] },
      },
    );
    if (r.ok) this.apply(r);
    return r;
  }

  get run(): Run {
    return this.state.runs.find((r) => r.endedOn === undefined)!;
  }

  runStartedOn(d: DayKey): Run | undefined {
    return this.state.runs.find((r) => r.startedOn === d);
  }

  day(d: DayKey): Day | undefined {
    return this.state.days[d];
  }

  notifs(kind: NotificationKind) {
    return this.effects.filter(
      (e): e is Extract<Effect, { kind: "notify" }> =>
        e.kind === "notify" && e.notif === kind,
    );
  }

  of<K extends Effect["kind"]>(kind: K): Extract<Effect, { kind: K }>[] {
    return this.effects.filter(
      (e): e is Extract<Effect, { kind: K }> => e.kind === kind,
    );
  }

  badgeCount(key: string): number {
    return this.of("badge").filter((b) => b.key === key).length;
  }

  private apply(r: { state: PlayerState; effects: Effect[] }): void {
    this.state = r.state;
    this.effects.push(...r.effects);
  }
}
