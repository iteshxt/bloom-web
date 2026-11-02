import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

// Every route returns errors as { error: { code, message } } (CLAUDE.md).

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Parses and validates a JSON body; on failure returns a ready 400. */
export async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: apiError(400, "invalid_json", "Body must be JSON"),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return { ok: false, response: apiError(400, "invalid_input", message) };
  }
  return { ok: true, data: parsed.data };
}
