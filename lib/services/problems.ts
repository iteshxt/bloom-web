import "server-only";
import type { Difficulty } from "@/lib/engine";
import { getQuestion } from "@/lib/leetcode/client";
import type { Admin } from "./player";

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
    .select("title_slug, difficulty, topic_tags")
    .in("title_slug", unique);
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const info: Record<string, ProblemInfo> = {};
  for (const p of data ?? []) {
    info[p.title_slug] = {
      difficulty: p.difficulty ?? undefined,
      topics: p.topic_tags,
    };
  }

  const missing = unique.filter((s) => !info[s]);
  const rows = [];
  for (const slug of missing) {
    const meta = await getQuestion(slug); // sequential: be polite to LeetCode
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
      .upsert(rows, { onConflict: "title_slug", ignoreDuplicates: true });
    if (upsertError)
      throw new Error(`Supabase upsert failed: ${upsertError.message}`);
  }
  return info;
}
