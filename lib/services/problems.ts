import "server-only";
import type { Difficulty } from "@/lib/engine";
import { getQuestion } from "@/lib/leetcode/client";
import type { Admin } from "./player";

const FETCH_CONCURRENCY = 4;

export interface ProblemInfo {
  difficulty?: Difficulty;
  topics: string[];
}

/** Problem metadata for these slugs, fetching and caching unknown ones in
 *  `problems` (fetched once per new slug, techspec §8). */
export async function ensureProblems(
  admin: Admin,
  slugs: string[],
): Promise<Record<string, ProblemInfo>> {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return {};

  const { data, error } = await admin
    .from("problems")
    .select("title_slug, difficulty, topic_tags, frontend_id")
    .in("title_slug", unique);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const info: Record<string, ProblemInfo> = {};
  // A row without a frontend id is a placeholder from a manual check-in
  // made while LeetCode was down: fetch it again to fill it in.
  for (const p of (data ?? []).filter((p) => p.frontend_id !== null)) {
    info[p.title_slug] = {
      difficulty: p.difficulty ?? undefined,
      topics: p.topic_tags,
    };
  }

  const missing = unique.filter((s) => !info[s]);
  const rows = [];
  // A few at a time: fast enough for a first sync of 20 solves, still polite.
  const metas = new Map<string, Awaited<ReturnType<typeof getQuestion>>>();
  for (let i = 0; i < missing.length; i += FETCH_CONCURRENCY) {
    const batch = missing.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(batch.map((slug) => getQuestion(slug)));
    batch.forEach((slug, j) => metas.set(slug, results[j]));
  }
  for (const slug of missing) {
    const meta = metas.get(slug);
    rows.push({
      title_slug: slug,
      frontend_id: meta?.frontendId ?? null,
      title: meta?.title ?? slug,
      difficulty: meta?.difficulty ?? null,
      topic_tags: meta?.topicTags ?? [],
    });
    info[slug] = {
      difficulty: meta?.difficulty ?? undefined,
      topics: meta?.topicTags ?? [],
    };
  }
  if (rows.length > 0) {
    const { error: upsertError } = await admin
      .from("problems")
      .upsert(rows, { onConflict: "title_slug" });
    if (upsertError)
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
  }
  return info;
}
