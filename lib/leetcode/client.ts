import "server-only";
import { z } from "zod";
import type { Difficulty } from "@/lib/engine/types";

// LeetCode's public GraphQL endpoint (techspec §8). Unofficial: it can change
// or rate-limit without notice, so every response is validated and any
// mismatch becomes a sync failure, never a crash. Server-side only (CORS).

export const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";
const TIMEOUT_MS = 8_000;

const HEADERS = {
  "Content-Type": "application/json",
  Referer: "https://leetcode.com",
  "User-Agent": "Bloom/1.0 (personal two-user tracker)",
};

export const Q_RECENT_AC = /* GraphQL */ `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

export const Q_QUESTION = /* GraphQL */ `
  query questionMeta($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
    }
  }
`;

export const Q_USER = /* GraphQL */ `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        userAvatar
        realName
        ranking
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

export type LeetCodeErrorCode = "network" | "http" | "graphql" | "schema";

export class LeetCodeError extends Error {
  constructor(
    readonly code: LeetCodeErrorCode,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LeetCodeError";
  }
}

// ───────── Response schemas ─────────

const difficulty = z.enum(["Easy", "Medium", "Hard"]);

const recentAcSchema = z.object({
  recentAcSubmissionList: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string(),
        titleSlug: z.string().min(1),
        timestamp: z.string().regex(/^\d+$/),
      }),
    )
    .nullable(),
});

const questionSchema = z.object({
  question: z
    .object({
      questionFrontendId: z.string().nullable(),
      title: z.string(),
      titleSlug: z.string(),
      difficulty: difficulty.nullable(),
      topicTags: z.array(z.object({ name: z.string(), slug: z.string() })),
    })
    .nullable(),
});

const userSchema = z.object({
  matchedUser: z
    .object({
      username: z.string(),
      profile: z.object({ userAvatar: z.string().nullable() }),
      submitStatsGlobal: z.object({
        acSubmissionNum: z.array(
          z.object({ difficulty: z.string(), count: z.number() }),
        ),
      }),
    })
    .nullable(),
});

// ───────── Public API ─────────

export interface RecentAc {
  id: string;
  title: string;
  slug: string;
  submittedAt: Date;
}

export interface ProblemMeta {
  slug: string;
  frontendId: string | null;
  title: string;
  difficulty: Difficulty | null;
  topicTags: string[];
}

export interface LeetCodeUser {
  username: string;
  avatar: string | null;
  solved: { all: number; easy: number; medium: number; hard: number };
}

/** The player's latest accepted submissions (LeetCode keeps about 20). */
export async function getRecentAc(
  username: string,
  limit = 20,
): Promise<RecentAc[]> {
  const data = await query(Q_RECENT_AC, { username, limit }, recentAcSchema);
  return (data.recentAcSubmissionList ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.titleSlug,
    submittedAt: new Date(Number(s.timestamp) * 1000),
  }));
}

/** Problem metadata, or null when the slug doesn't exist. */
export async function getQuestion(slug: string): Promise<ProblemMeta | null> {
  const { question } = await query(
    Q_QUESTION,
    { titleSlug: slug },
    questionSchema,
  );
  if (!question) return null;
  return {
    slug: question.titleSlug,
    frontendId: question.questionFrontendId,
    title: question.title,
    difficulty: question.difficulty,
    topicTags: question.topicTags.map((t) => t.slug),
  };
}

/** Public profile, or null when the username doesn't exist. */
export async function getUser(username: string): Promise<LeetCodeUser | null> {
  const { matchedUser } = await query(Q_USER, { username }, userSchema);
  if (!matchedUser) return null;
  const count = (d: string) =>
    matchedUser.submitStatsGlobal.acSubmissionNum.find(
      (n) => n.difficulty === d,
    )?.count ?? 0;
  return {
    username: matchedUser.username,
    avatar: matchedUser.profile.userAvatar,
    solved: {
      all: count("All"),
      easy: count("Easy"),
      medium: count("Medium"),
      hard: count("Hard"),
    },
  };
}

// ───────── Transport ─────────

const envelope = z.object({
  data: z.unknown().optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

/** POSTs a query with an 8 s timeout and one retry on network or 5xx
 *  errors (never on 4xx), then validates `data` against `schema`. */
async function query<T>(
  q: string,
  variables: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await post(q, variables);
    if (response.status >= 500) response = await post(q, variables);
  } catch {
    try {
      response = await post(q, variables);
    } catch (err) {
      throw new LeetCodeError(
        "network",
        `LeetCode unreachable: ${String(err)}`,
      );
    }
  }

  if (!response.ok) {
    throw new LeetCodeError(
      "http",
      `LeetCode returned ${response.status}`,
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new LeetCodeError("schema", "LeetCode returned a non-JSON body");
  }

  const parsedEnvelope = envelope.safeParse(body);
  if (!parsedEnvelope.success) {
    throw new LeetCodeError("schema", "Unexpected LeetCode response envelope");
  }
  const { data, errors } = parsedEnvelope.data;
  // "That user does not exist." comes back as an error *with* data, so only
  // fail on errors when there's no data at all.
  if (data === undefined || data === null) {
    throw new LeetCodeError(
      "graphql",
      errors?.[0]?.message ?? "LeetCode returned no data",
    );
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new LeetCodeError(
      "schema",
      `Unexpected LeetCode response: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}

function post(
  q: string,
  variables: Record<string, unknown>,
): Promise<Response> {
  return fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query: q, variables }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
}
