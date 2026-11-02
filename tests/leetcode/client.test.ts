import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw/http";
import { setupServer } from "msw/node";
import {
  LEETCODE_GRAPHQL,
  LeetCodeError,
  getQuestion,
  getRecentAc,
  getUser,
} from "@/lib/leetcode/client";
import recentAc from "../fixtures/leetcode/recent-ac.json";
import questionTwoSum from "../fixtures/leetcode/question-two-sum.json";
import questionMissing from "../fixtures/leetcode/question-missing.json";
import user from "../fixtures/leetcode/user.json";
import userMissing from "../fixtures/leetcode/user-missing.json";

// Recorded-shape fixtures only: tests never reach the real LeetCode API.
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Answers each request with the next response in the list. */
function respond(...responses: Array<() => Response>) {
  let calls = 0;
  server.use(
    http.post(LEETCODE_GRAPHQL, () =>
      responses[Math.min(calls++, responses.length - 1)](),
    ),
  );
  return () => calls;
}

const json =
  (body: unknown, status = 200) =>
  () =>
    HttpResponse.json(body as object, { status });

describe("LeetCode client", () => {
  it("parses recent accepted submissions", async () => {
    respond(json(recentAc));
    const subs = await getRecentAc("bloom-test-player");
    expect(subs).toHaveLength(3);
    expect(subs[0]).toEqual({
      id: "1800000003",
      title: "Valid Parentheses",
      slug: "valid-parentheses",
      submittedAt: new Date(1793548200 * 1000),
    });
  });

  it("sends the query, variables and polite headers", async () => {
    let seen: { body: unknown; ua: string | null } | undefined;
    server.use(
      http.post(LEETCODE_GRAPHQL, async ({ request }) => {
        seen = {
          body: await request.json(),
          ua: request.headers.get("user-agent"),
        };
        return HttpResponse.json(recentAc);
      }),
    );
    await getRecentAc("bloom-test-player");
    expect(seen?.body).toMatchObject({
      variables: { username: "bloom-test-player", limit: 20 },
    });
    expect(seen?.ua).toContain("Bloom");
  });

  it("parses problem metadata, and null for an unknown slug", async () => {
    respond(json(questionTwoSum));
    expect(await getQuestion("two-sum")).toEqual({
      slug: "two-sum",
      frontendId: "1",
      title: "Two Sum",
      difficulty: "Easy",
      topicTags: ["array", "hash-table"],
    });
    respond(json(questionMissing));
    expect(await getQuestion("no-such-problem")).toBeNull();
  });

  it("parses a user, and null for an unknown username", async () => {
    respond(json(user));
    expect(await getUser("bloom-test-player")).toEqual({
      username: "bloom-test-player",
      avatar: "https://assets.leetcode.com/users/default_avatar.jpg",
      solved: { all: 42, easy: 25, medium: 15, hard: 2 },
    });
    respond(json(userMissing));
    expect(await getUser("no-such-user")).toBeNull();
  });

  it("treats a shape mismatch as a schema error, never a crash", async () => {
    respond(
      json({ data: { recentAcSubmissionList: [{ id: 1, titleSlug: "x" }] } }),
    );
    await expect(getRecentAc("p")).rejects.toMatchObject({ code: "schema" });
    respond(() => new HttpResponse("<html>blocked</html>", { status: 200 }));
    await expect(getRecentAc("p")).rejects.toMatchObject({ code: "schema" });
  });

  it("fails on GraphQL errors without data", async () => {
    respond(json({ errors: [{ message: "rate limited" }] }));
    await expect(getRecentAc("p")).rejects.toMatchObject({ code: "graphql" });
  });

  it("retries once on a 5xx", async () => {
    const calls = respond(json({}, 502), json(recentAc));
    expect(await getRecentAc("p")).toHaveLength(3);
    expect(calls()).toBe(2);

    const failing = respond(json({}, 503), json({}, 503));
    await expect(getRecentAc("p")).rejects.toMatchObject({
      code: "http",
      status: 503,
    });
    expect(failing()).toBe(2);
  });

  it("doesn't retry on a 4xx", async () => {
    const calls = respond(json({}, 403), json(recentAc));
    const err = await getRecentAc("p").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LeetCodeError);
    expect(err).toMatchObject({ code: "http", status: 403 });
    expect(calls()).toBe(1);
  });

  it("retries once on a network error", async () => {
    const calls = respond(() => HttpResponse.error(), json(recentAc));
    expect(await getRecentAc("p")).toHaveLength(3);
    expect(calls()).toBe(2);

    respond(() => HttpResponse.error());
    await expect(getRecentAc("p")).rejects.toMatchObject({ code: "network" });
  });
});
