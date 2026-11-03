import "server-only";
import { randomUUID } from "node:crypto";
import { checkInOpen } from "@/lib/checkin";
import { ensureToday, processSubmissions, type DayKey } from "@/lib/engine";
import { getQuestion, LeetCodeError } from "@/lib/leetcode/client";
import { humanizeSlug } from "@/lib/format/ist";
import { withPlayerLock } from "./lock";
import { deliverNotifications } from "./notify";
import { loadPlayer, type Admin } from "./player";
import type { ProblemInfo } from "./problems";
import { saveEngineResult } from "./save";

export type CheckInResult =
  | { ok: true; counted: boolean; assignedDay: DayKey; xp: number }
  | { ok: false; code: "closed" | "busy" | "not_ready" | "unknown_problem" };

/** Manual check-in (PRD 5.13): records `slug` as a solve at `now`, only
 *  while sync is failing. It runs through the engine like any synced solve,
 *  under the player's lock (invariant 7), and is marked manual. */
export async function manualCheckIn(
  admin: Admin,
  input: { playerId: string; slug: string; now: Date },
): Promise<CheckInResult> {
  const run = await withPlayerLock(
    admin,
    input.playerId,
    "checkin",
    async () => {
      const { data: sync, error } = await admin
        .from("sync_state")
        .select("last_success_at, consecutive_failures")
        .eq("player_id", input.playerId)
        .maybeSingle();
      if (error) throw new Error(`sync_state read failed: ${error.message}`);
      const open = checkInOpen({
        lastSuccessAt: sync?.last_success_at ?? null,
        consecutiveFailures: sync?.consecutive_failures ?? 0,
        now: input.now,
      });
      if (!open) return { ok: false, code: "closed" } as const;

      const player = await loadPlayer(admin, input.playerId);
      if (!player) return { ok: false, code: "not_ready" } as const;

      const problem = await problemInfo(admin, input.slug);
      if (problem === "unknown")
        return { ok: false, code: "unknown_problem" } as const;

      const ctx = { now: input.now, newId: randomUUID };
      const processed = processSubmissions(
        player.state,
        [
          {
            id: `manual:${randomUUID()}`,
            slug: input.slug,
            submittedAt: input.now,
            difficulty: problem.difficulty,
            topics: problem.topics,
            manual: true,
          },
        ],
        ctx,
      );
      const today = ensureToday(processed.state, ctx);
      const sent = await saveEngineResult(admin, {
        refs: player,
        state: today.state,
        effects: [...processed.effects, ...today.effects],
        submissions: processed.value,
        now: input.now,
      });
      await deliverNotifications(admin, sent);

      const [sub] = processed.value;
      return {
        ok: true,
        counted: sub.counted,
        assignedDay: sub.assignedDay,
        xp: sub.xp,
      } as const;
    },
  );
  return run.locked ? { ok: false, code: "busy" } : run.value;
}

/** Problem metadata, from the cache or LeetCode. A slug LeetCode doesn't
 *  know is refused. While LeetCode is down (the usual reason for checking
 *  in), the problem is taken on trust with a title from the slug; the next
 *  sync that reaches LeetCode fills in the rest (see ensureProblems). */
async function problemInfo(
  admin: Admin,
  slug: string,
): Promise<ProblemInfo | "unknown"> {
  const { data: cached, error } = await admin
    .from("problems")
    .select("difficulty, topic_tags, frontend_id")
    .eq("title_slug", slug)
    .maybeSingle();
  if (error) throw new Error(`problems read failed: ${error.message}`);
  if (cached?.frontend_id) {
    return {
      difficulty: cached.difficulty ?? undefined,
      topics: cached.topic_tags,
    };
  }

  let meta: Awaited<ReturnType<typeof getQuestion>> | undefined;
  try {
    meta = await getQuestion(slug);
  } catch (err) {
    if (!(err instanceof LeetCodeError)) throw err;
  }
  if (meta === null) return "unknown";

  const { error: upsertError } = await admin.from("problems").upsert(
    {
      title_slug: slug,
      title: meta?.title ?? humanizeSlug(slug),
      difficulty: meta?.difficulty ?? null,
      topic_tags: meta?.topicTags ?? [],
      frontend_id: meta?.frontendId ?? null,
    },
    { onConflict: "title_slug" },
  );
  if (upsertError)
    throw new Error(`problems upsert failed: ${upsertError.message}`);
  return {
    difficulty: meta?.difficulty ?? undefined,
    topics: meta?.topicTags ?? [],
  };
}
