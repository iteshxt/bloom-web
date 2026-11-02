# CLAUDE.md — Bloom

Bloom is a cozy, pastel, two-player PWA where a couple keeps daily LeetCode streaks. Each player's streak is a growing flower. Solves are auto-verified from LeetCode. A missed day can only be restored by the *partner* (3 tokens per run). Milestones (15/30/50/100) unlock real-world gifts from the partner.

## Source-of-truth documents
Read the relevant one before changing behavior, data or UI. **Don't invent rules.**

| Doc | Owns |
|---|---|
| `docs/prd.md` | Game rules (§4 is canonical), features, notifications, edge cases |
| `docs/techspec.md` | Architecture, schema, engine algorithms, API contracts, scheduler, push, PWA |
| `docs/design.md` | Tokens, components, screens, motion, sound, copy |

If the docs disagree: **prd §4 > techspec > design** for behavior; **design** wins for anything visual or copy. If you change behavior, update the doc in the same change.

## Stack
Next.js (App Router, TypeScript strict) · Tailwind · Motion (`motion`) · TanStack Query · Supabase (Postgres, Auth with Google sign-in, Realtime, pg_cron + pg_net) · `web-push` (VAPID) · Zod · Vitest · hosted on Vercel Hobby (region `bom1`). Everything must stay on free tiers.

## Commands
```bash
pnpm install
pnpm dev                      # local app on :3000
pnpm test                     # vitest (engine + services)
pnpm test:watch
pnpm lint && pnpm typecheck   # run both before calling work done
```
There is **no local database** (no Docker, no `supabase start`). Development and checks run against the hosted Supabase project through the **Supabase MCP server**: write each migration as a file in `supabase/migrations/`, apply it with the MCP `apply_migration` tool, inspect with `list_tables` / `execute_sql` / `get_logs`, and regenerate `lib/supabase/types.ts` with `generate_typescript_types` after any schema change.
To trigger the heartbeat locally: `curl -X POST localhost:3000/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"`.

## Layout
```
docs/             prd.md, techspec.md, design.md (source of truth)
app/              routes: (auth)/login, onboarding, (app)/… screens, api/** route handlers, manifest.ts
lib/time.ts       IST helpers (pure)
lib/engine/       PURE rules engine: assign, evaluate, milestones, xp, badges
lib/services/     side effects: sync, finalize, restore, targets, gifts, notify, lock, activity
lib/leetcode/     GraphQL client
lib/push/         web-push sender
lib/supabase/     browser / server / admin clients + generated types
lib/motion.ts     spring + duration tokens (design.md §12.2)
components/       sky/ bloom/ companions/ icons/ ui/ game/ moments/
public/sw.js      service worker (push, notificationclick, offline shell)
supabase/migrations/   SQL (schema, RLS, cron)
tests/engine/     scenario tests (techspec §14.1)
```

## Invariants: never break these
1. **IST is fixed UTC+05:30.** Use `lib/time.ts` only. Never use `new Date().getDate()`, device timezone, or `toLocaleDateString` for game logic. Day keys are `'YYYY-MM-DD'` strings.
2. **A challenge day ends at 01:00 IST the next day.** Grace-hour solves fill *yesterday first* (only if yesterday is pending, unfinalized, still short, and the slug isn't already counted there), then overflow to today. Process solves in timestamp order.
3. **The engine is pure.** No I/O, no `Date.now()`; `now` is a parameter. It returns new state plus `Effect[]`. Services persist the state and run the effects.
4. **The server is the only writer.** The client reads via supabase-js under RLS and mutates only through `/api/*`. The Supabase secret key never reaches the client or a `NEXT_PUBLIC_*` variable.
5. **Gifts are server-only.** No client RLS policy on `gifts`. `GET /api/gifts` masks title, details and link from the receiver until revealed.
6. **Idempotency everywhere.** Sync, tick, finalize, XP, badges and notifications must be safe to re-run. Rely on the unique constraints (`submissions(player_id, lc_submission_id)`, `xp_events(player_id, reason, ref)`, `notification_log.dedupe_key`, and others) plus status checks.
7. **Take the per-player lease lock** (`lib/services/lock.ts`) in any path that changes game state (tick, `/api/sync`, restore, target, manual check-in).
8. **Finalize a day** only when `now >= dayEndsAt(D)` and either a sync succeeded after that boundary or 6 h have passed. Finalize overdue days in ascending order, so recovering from downtime gives the same result as never going down.
9. **Permissions:** only the partner sets a player's target (effective tomorrow) and only the partner answers a restore. Players act on their own requests and gifts' receive side only.
10. **Day rows snapshot `target`** when created. Never recompute past days with the current target.

## Rules engine workflow
- Any change to streak, restore, milestone, XP or badge behavior starts with a **failing test** in `tests/engine/` mirroring the prd §4 rule or edge case, then the fix.
- Keep the scenario table in techspec §14.1 and the tests in sync (test names reference scenario numbers, for example `it('#11 makeup failure reverts restored day')`).
- `pnpm test` must stay green. Don't mark work done with failing or skipped engine tests.

## Database
- Schema changes go in a **new migration**. Never edit an applied migration.
- Every new table: `pair_id` column, RLS enabled, a select-only policy `pair_id = my_pair_id()` (unless it's server-only), and indexes for its main query.
- Add a table to the `supabase_realtime` publication only if the client needs live updates.
- Regenerate `lib/supabase/types.ts` after schema changes.

## LeetCode
- The endpoint is the unofficial `https://leetcode.com/graphql`, called **server-side only** (CORS). Queries live in `lib/leetcode/client.ts` (recentAcSubmissionList limit 20, question, matchedUser).
- Validate every response with Zod and treat a shape mismatch as a sync failure, never a crash.
- Be polite: about 10-minute polling plus on-demand sync rate-limited to once per 60 s per player. Cache problem metadata in `problems`.
- Tests mock LeetCode with recorded fixtures (msw). **Never hit the real API in tests.**

## Scheduler
- The heartbeat is Supabase `pg_cron` → `pg_net` POST to `/api/cron/tick` every 10 min. It also keeps the free Supabase project from pausing.
- Vercel Cron on Hobby only allows once a day; it's used only as a daily backup (`vercel.json`, 20:30 UTC). Don't add sub-daily Vercel crons; the deploy will fail.
- `/api/cron/tick` accepts GET (Vercel) and POST (pg_cron) and requires `Authorization: Bearer $CRON_SECRET` (constant-time compare). Keep it under about 10 s.

## UI and design rules
- Use tokens only: Tailwind utilities backed by CSS variables in `app/globals.css`. **No raw hex in components.** Player-owned elements use `data-player-color` and the `--p*` variables.
- Fonts: **Baloo 2** for display and numbers, **Figtree** for text. Sentence case, no all-caps labels. Use tabular numbers for countdowns.
- Colours each have one meaning: player colour = theirs, peach = streak/urgency, butter = XP/tokens, mint = done, frost = on ice. Text on pastels uses the `-deep` shade.
- Radii follow hierarchy (`tile 8 / sm 14 / md 20 / lg 28 / xl 36 / pill`). Shadows are tinted, never generic grey.
- Glass (`backdrop-filter`) on at most 3 elements per screen, with a solid fallback.
- Motion: use `spring` and `dur` from `lib/motion.ts`. Animate only `transform` and `opacity` (SVG masks only during signature moments). Every animated component must honor reduced motion (design §12.5). Ambient loops pause when `document.hidden`.
- Creatures, flowers, icons and skies are hand-built SVG React components with props (`mood`, `stage`, `color`). No stock art, no LeetCode logo, no emoji in the in-app UI (emoji are allowed in notifications and celebration copy, at most one at the end).
- Copy comes from design §14. Refer to the partner by display name, never "she" or "he". Failure copy stays kind.
- Mobile-first at 390 px. Check 360 px and the desktop centred column. Touch targets ≥ 44 px. Respect safe-area insets.

## Push and PWA
- Push goes only through `lib/services/notify.ts`: insert into `notification_log` with a dedupe key first, respect `notif_prefs`, then send. Delete subscriptions on 404/410.
- Request notification permission only from a user tap (an iOS requirement, and only in the installed PWA).
- `public/sw.js` is hand-written (no PWA plugin) and served with `Cache-Control: no-cache`.
- Auth is **Google sign-in only** (Supabase Google provider, PKCE redirect to `/auth/callback`). No email OTP, magic links or passwords, so there is no email service to run.

## Security
- `ALLOWED_EMAILS` (the two Google account emails) gates sign-in at `/auth/callback` and again at onboarding. Every mutating route checks session → pair membership → role (self or partner) before acting.
- Validate all route input with Zod. Return `{ error: { code, message } }` with an appropriate status code.
- Parse manual check-in URLs with a strict regex for the problem slug; never fetch user-supplied URLs.

## Conventions
- TypeScript strict, no `any`. Shared types live in `lib/engine/types.ts`.
- Server code in route handlers and `lib/services`; client components are marked `'use client'` and kept presentational where possible.
- Keep naming consistent across code, UI and docs: **run** (a streak), **restore**, **token** (heart-coin), **make-up**, **milestone**, **gift**, **on ice**, **grace hour**.
- Small, focused commits. Conventional prefixes (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Commits are authored by the repo owner only. **Never add a `Co-Authored-By` trailer or any Claude/AI attribution** to commits or PRs.

## Definition of done
- `pnpm lint`, `pnpm typecheck` and `pnpm test` all pass.
- New behavior has tests; changed behavior has updated docs (prd / techspec / design).
- UI changes are checked at 390 px in day and night themes and with reduced motion on.
- No new paid services, no secrets in client code, no Vercel crons more frequent than daily.

## Environment variables
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `ALLOWED_EMAILS`, `APP_URL`. Keep `.env.example` updated; never commit `.env.local`.

## Build order
Follow techspec §18: scaffold → time + **engine with full tests** → LeetCode sync + tick + lock + cron → auth/onboarding/pairing → dashboard + realtime → restores/targets/gifts/milestones → push → PWA → design pass (design §16.4) → P1 features → QA on a real Android phone and iPhone.
