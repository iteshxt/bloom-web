import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { tickPlayer, type PlayerTickResult } from "@/lib/services/tick";
import { createAdminClient } from "@/lib/supabase/admin";

// The heartbeat (techspec §9.3). Supabase pg_cron POSTs every 10 minutes;
// Vercel Cron GETs once a day as a backup. Both send
// `Authorization: Bearer $CRON_SECRET`.

export const maxDuration = 30;

export const GET = handle;
export const POST = handle;

type Result =
  PlayerTickResult | { playerId: string; status: "error"; error: string };

async function handle(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Missing or wrong cron secret",
        },
      },
      { status: 401 },
    );
  }

  const startedAt = Date.now();
  const now = new Date();
  const admin = createAdminClient();
  const { data: players, error } = await admin
    .from("profiles")
    .select("id")
    .not("pair_id", "is", null);
  if (error) {
    return NextResponse.json(
      { error: { code: "database", message: error.message } },
      { status: 500 },
    );
  }

  // Each player is independent and locked separately, so run them together.
  const settled = await Promise.allSettled(
    (players ?? []).map((p) => tickPlayer(admin, p.id, now)),
  );
  const results: Result[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { playerId: players![i].id, status: "error", error: String(s.reason) },
  );
  const failed = results.some((r) => r.status === "error");
  const durationMs = Date.now() - startedAt;

  console.log(JSON.stringify({ event: "tick", durationMs, results }));
  return NextResponse.json(
    { ok: !failed, durationMs, players: results },
    { status: failed ? 500 : 200 },
  );
}

/** Constant-time comparison so the secret can't be guessed byte by byte. */
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
