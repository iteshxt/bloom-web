# Tech Spec — Bloom

> Implements every rule in `prd.md`. If this document and the PRD disagree, the PRD's rules (section 4) win, and this doc should be fixed.

| | |
|---|---|
| Status | Draft v1.0 |
| Date | 2 Nov 2026 |
| Hosting | Vercel (Hobby, free) |
| Backend | Supabase (Free): Postgres, Auth, Realtime, Cron |
| Client | Next.js PWA |

---

## 1. Architecture overview

```
 ┌──────────────── Phones (installed PWA) ────────────────┐
 │  Next.js client UI  ◄── Supabase Realtime (read-only)  │
 │  Service worker (push, offline shell)                  │
 └───────┬──────────────────────────────▲─────────────────┘
         │ HTTPS (actions)              │ Web Push
         ▼                              │
 ┌──────────────── Vercel (region hnd1) ┴─────────────────┐
 │  Next.js route handlers (/api/*)                       │
 │   • game actions (restore, target, gifts, nudge…)      │
 │   • /api/cron/tick  ← the heartbeat                    │
 │  lib/engine  (pure rules engine, unit tested)          │
 │  lib/leetcode (GraphQL client)  lib/push (web-push)    │
 └───────┬───────────────────────────────┬────────────────┘
         │ supabase-js (secret key)      │ POST graphql
         ▼                               ▼
 ┌─ Supabase (ap-northeast-1) ───┐   ┌── leetcode.com ──┐
 │ Postgres + RLS                │   │ /graphql (public, │
 │ Auth (Google sign-in)         │   │  unofficial)      │
 │ Realtime                      │   └───────────────────┘
 │ pg_cron + pg_net ─────────────┼──► every 10 min POST /api/cron/tick
 └───────────────────────────────┘
```

**Principles**
- **The server is the only writer of game state.** The client reads through Supabase (with Row Level Security and realtime updates) and makes changes only by calling `/api/*` routes. Those routes check the session, then write using the Supabase secret key.
- **The rules engine is pure TypeScript** (`lib/engine`): no I/O and no clock reads. "Now" is always passed in. Every PRD rule maps to unit tests.
- **Everything is idempotent.** Unique constraints and status checks make it safe to re-run sync, finalization or notifications.
- **IST everywhere.** Day keys are `YYYY-MM-DD` strings in IST. All timestamps are stored as `timestamptz` (UTC).

### Why a database at all?
The two phones need **one shared source of truth**: her solves have to be visible on your phone, your approval has to reach hers, and a gift you create has to unlock on her side. Push subscriptions, restore requests and scheduled jobs also need to live somewhere that's always reachable. Supabase gives a Postgres database, authentication, realtime updates and a scheduler in one free project.

### Keeping Supabase from pausing
Free Supabase projects pause after a week of low database activity. The 10-minute `pg_cron` heartbeat calls `/api/cron/tick`, which reads and writes the database through the Supabase API on every run (about 144 times a day). That is real database activity, so the project stays active. On top of that, the two of you use the app daily.

### Why not Vercel Cron for the heartbeat?
On the Hobby plan, Vercel Cron only allows schedules that run at most **once per day**, and the run can fire anywhere within the scheduled hour. That isn't enough for 10-minute syncing and reminders. So:
- **Primary scheduler:** Supabase `pg_cron` + `pg_net`, every 10 minutes.
- **Safety net:** one Vercel Cron job daily at 20:30 UTC (02:00–02:59 IST) that calls the same tick, so days still get finalized if pg_cron ever breaks.

---

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (latest stable, App Router) + **TypeScript** (strict) | Route handlers for the API. Lock versions in `package.json`. |
| Styling | **Tailwind CSS** | Design tokens defined in design.md. |
| Animation | **Motion** (`motion`, formerly Framer Motion) + `canvas-confetti` | Final animation library choices are confirmed in design.md (Lottie or Rive optional). |
| Data fetching | **TanStack Query** + Supabase Realtime for cache invalidation | |
| DB / Auth / Realtime | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) | Region ap-northeast-1 (Tokyo). Vercel functions run in `hnd1` (Tokyo) so every server→database query stays local; phones in India pay about 100 ms once per request instead of on every query. |
| Scheduler | Supabase **pg_cron + pg_net**; Vercel Cron as a daily backup | |
| Push | **Web Push** with VAPID via the `web-push` npm package | No Firebase needed. |
| PWA | `app/manifest.ts` + hand-written `public/sw.js` | No PWA plugin needed for our needs. |
| Validation | **Zod** | All API inputs. |
| Testing | **Vitest** (engine and services), **Playwright** (smoke, optional) | |
| Lint/format | ESLint + Prettier | |

### Free tier budget
| Service | What we use | Fits free tier because |
|---|---|---|
| Vercel Hobby | Hosting, serverless functions, 1 cron job | 2 users, about 144 tick invocations a day plus a handful of user requests |
| Supabase Free | Postgres (a few MB), Auth (2 users), Realtime (2 clients) | Tiny data; the heartbeat prevents pausing |
| Web Push | Browser push services (Google/Apple/Mozilla) | Free |
| LeetCode GraphQL | About 300 requests a day | Public, unofficial endpoint; polite polling |
| Google sign-in | One Google Cloud OAuth client | Free; no email service is needed because there are no OTP or magic-link emails |

---

## 3. Repository layout

```
/app
  /(auth)/login/page.tsx
  /auth/callback/route.ts        # Google OAuth return (section 13)
  /onboarding/page.tsx
  /(app)/layout.tsx              # authenticated shell: floating nav, the one Realtime subscription, desktop frame
  /(app)/template.tsx            # tab-switch transition (design §12.3)
  /(app)/page.tsx                # duel dashboard
  /(app)/player/[id]/page.tsx    # "/player/me" is the Me tab
  /(app)/restores/page.tsx
  /(app)/gifts/page.tsx
  /(app)/milestones/page.tsx
  /(app)/badges/page.tsx
  /(app)/feed/page.tsx
  /(app)/history/page.tsx
  /(app)/settings/page.tsx
  /dev/gallery/page.tsx          # development only (404 in production): every sky, flower, creature, icon and moment
  /api/...                       # see section 10
  manifest.ts
  layout.tsx
/lib
  time.ts                        # IST helpers (pure)
  /engine                        # PURE rules engine
    types.ts
    assign.ts                    # grace-hour day assignment
    evaluate.ts                  # completion, finalization, restores
    milestones.ts
    xp.ts
    badges.ts
  /services                      # side effects: DB + engine
    sync.ts                      # LeetCode → submissions → engine
    finalize.ts
    restore.ts
    targets.ts
    gifts.ts
    notify.ts                    # notification rules + dedupe
    lock.ts                      # per-player lease lock
    activity.ts
  /leetcode/client.ts
  /push/webpush.ts
  /supabase/{browser.ts,server.ts,admin.ts}
  /validation/*.ts               # zod schemas
  sky.ts                         # IST sky bands (pure) + the theme boot script
  bloom.ts                       # flower growth stages (pure)
  moments.ts                     # which signature moments to play (pure)
  nudges.ts                      # nudge presets and the daily limit (pure)
  /game/heatmap.ts               # heatmap tiles, grids and profile stats (pure)
  presence.ts                    # partner-opened wave, once an hour
  prefs.ts  motion.ts  sound.ts  haptics.ts  confetti.ts
/components
  /sky /bloom /companions /icons /ui /game /moments   # hand-built SVG art and UI (design §16.3)
/public
  sw.js
  /icons/*                       # 192, 512, maskable, apple-touch
  /sounds/*.{mp3,ogg}            # generated by scripts/generate-sounds.sh
/supabase
  /migrations/0001_init.sql
  /migrations/0002_rls.sql
  /migrations/0003_cron.sql      # applied only after the first Vercel deploy
  /migrations/0004_advisor_fixes.sql
  /migrations/0005_state_functions.sql   # save_player_state, try_lock / release_lock, level_for_xp
  seed.sql                       # badges catalogue etc.
/tests
  /engine/*.test.ts
proxy.ts                         # Supabase session refresh + page routing (Next.js 16's name for middleware)
vercel.json
```

---

## 4. Environment variables

| Name | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Public key (the "anon" key on older projects) |
| `SUPABASE_SECRET_KEY` | server only | Admin writes (the "service_role" key on older projects) |
| `CRON_SECRET` | server; also stored in Supabase Vault | Authenticates `/api/cron/tick`. Vercel Cron sends it automatically as `Authorization: Bearer <CRON_SECRET>`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | client + server | Web Push |
| `VAPID_PRIVATE_KEY` | server only | Web Push |
| `VAPID_SUBJECT` | server only | `mailto:you@example.com` |
| `APP_URL` | server | `https://<name>.vercel.app`, used in push links |

---

## 5. Time model (`lib/time.ts`)

India has no daylight saving time, so IST is a **fixed +05:30 offset**. No timezone library is needed for game logic.

```ts
export const IST_OFFSET_MS = 330 * 60 * 1000;
export type DayKey = string; // 'YYYY-MM-DD' in IST

/** IST calendar date and minutes since IST midnight for an instant. */
export function istParts(t: Date): { day: DayKey; minuteOfDay: number } {
  const shifted = new Date(t.getTime() + IST_OFFSET_MS);
  return {
    day: shifted.toISOString().slice(0, 10),
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Instant when IST midnight of `day` begins. */
export function istMidnight(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** Instant when challenge day `day` ends: next IST midnight + grace. */
export function dayEndsAt(day: DayKey, graceMinutes = 60): Date {
  return new Date(istMidnight(addDays(day, 1)).getTime() + graceMinutes * 60_000);
}

export const todayIST = (now: Date) => istParts(now).day;
```

Rules:
- A solve with IST minute-of-day `< graceMinutes` is a **grace candidate** (00:00:00–00:59:59).
- Day `D` is **overdue** when `now >= dayEndsAt(D)`.

---

## 6. Data model (`supabase/migrations/0001_init.sql`)

```sql
create extension if not exists pgcrypto;

create type day_status       as enum ('pending','complete','missed','restored');
create type run_end_reason   as enum ('missed','no_tokens','restore_rejected','restore_expired','makeup_failed');
create type restore_status   as enum ('pending','approved','rejected','expired','cancelled');
create type gift_status      as enum ('locked','unlocked','revealed','delivered');
create type submission_source as enum ('leetcode','manual');
create type lc_difficulty    as enum ('Easy','Medium','Hard');

-- ───────── Pair & players ─────────
create table pairs (
  id             uuid primary key default gen_random_uuid(),
  invite_code    text unique not null,
  start_date     date,                           -- IST day the challenge begins
  milestones     int[] not null default '{15,30,50,100}',
  tokens_per_run int  not null default 3,
  grace_minutes  int  not null default 60,
  makeup_enabled boolean not null default true,
  created_by     uuid not null,
  created_at     timestamptz not null default now()
);

create table profiles (
  id                   uuid primary key references auth.users on delete cascade,
  pair_id              uuid references pairs on delete set null,
  display_name         text not null,
  avatar_key           text not null default 'mochi',      -- companion kind: mochi|tofu|pip|bun|puff|sprig
  color                text not null default 'blush' check (color in ('blush','sky','lilac')),
  leetcode_username    text,
  leetcode_verified_at timestamptz,
  xp_total             int  not null default 0,
  level                int  not null default 1,
  best_streak          int  not null default 0,
  notif_prefs          jsonb not null default '{}'::jsonb,  -- { "<kind>": false } to opt out
  created_at           timestamptz not null default now()
);

-- Enforce max 2 players per pair (search_path pinned in 0004)
create function enforce_pair_size() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.pair_id is not null and
     (select count(*) from public.profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'pair is full';
  end if;
  return new;
end $$;
create trigger trg_pair_size before insert or update of pair_id on profiles
  for each row execute function enforce_pair_size();

-- The two players can't share a colour (design.md §3.4)
create unique index one_color_per_pair on profiles (pair_id, color) where pair_id is not null;

-- ───────── Targets (history) ─────────
create table daily_targets (
  id             bigserial primary key,
  pair_id        uuid not null references pairs on delete cascade,
  player_id      uuid not null references profiles on delete cascade,
  target         int  not null check (target between 1 and 10),
  effective_from date not null,
  set_by         uuid references profiles,
  created_at     timestamptz not null default now(),
  unique (player_id, effective_from)            -- latest write for a date wins (upsert)
);

-- ───────── Problems cache ─────────
create table problems (
  title_slug   text primary key,
  frontend_id  text,
  title        text not null,
  difficulty   lc_difficulty,
  topic_tags   text[] not null default '{}',
  fetched_at   timestamptz not null default now()
);

-- ───────── Runs (streaks) ─────────
create table runs (
  id               uuid primary key default gen_random_uuid(),
  pair_id          uuid not null references pairs on delete cascade,
  player_id        uuid not null references profiles on delete cascade,
  started_on       date not null,
  length           int  not null default 0,     -- counted days (complete + restored)
  last_counted_day date,
  tokens_remaining int  not null,
  restores_used    int  not null default 0,
  at_risk_day      date,                        -- missed day awaiting restore resolution
  ended_on         date,                        -- the missed day that ended it
  end_reason       run_end_reason,
  created_at       timestamptz not null default now()
);
create unique index one_active_run_per_player on runs (player_id) where ended_on is null;

-- ───────── Days ─────────
create table days (
  pair_id         uuid not null references pairs on delete cascade,
  player_id       uuid not null references profiles on delete cascade,
  day             date not null,
  target          int  not null,               -- snapshot of target effective that day
  makeup_required int  not null default 0,
  solved_count    int  not null default 0,     -- distinct counted problems
  status          day_status not null default 'pending',
  run_id          uuid references runs,
  completed_at    timestamptz,
  finalized_at    timestamptz,
  primary key (player_id, day)
);

-- ───────── Submissions ─────────
create table submissions (
  id               bigserial primary key,
  pair_id          uuid not null references pairs on delete cascade,
  player_id        uuid not null references profiles on delete cascade,
  source           submission_source not null,
  lc_submission_id text,                       -- null for manual
  title_slug       text not null references problems,
  submitted_at     timestamptz not null,
  assigned_day     date not null,
  counted          boolean not null,            -- false: duplicate slug on that day, or pre-season
  is_resolve       boolean not null default false, -- slug already counted on an earlier day
  xp               int not null default 0,
  created_at       timestamptz not null default now(),
  unique (player_id, lc_submission_id)
);
create index on submissions (player_id, assigned_day);
create unique index one_counted_slug_per_day
  on submissions (player_id, assigned_day, title_slug) where counted;

-- ───────── Restores ─────────
create table restore_requests (
  id               uuid primary key default gen_random_uuid(),
  pair_id          uuid not null references pairs on delete cascade,
  player_id        uuid not null references profiles,   -- who missed
  approver_id      uuid not null references profiles,   -- partner
  run_id           uuid not null references runs,
  missed_day       date not null,
  message          text check (char_length(message) <= 280),
  status           restore_status not null default 'pending',
  response_message text check (char_length(response_message) <= 280),
  expires_at       timestamptz not null,               -- dayEndsAt(missed_day + 1)
  created_at       timestamptz not null default now(),
  responded_at     timestamptz
);
create unique index one_live_request_per_missed_day
  on restore_requests (player_id, missed_day) where status <> 'cancelled';

-- ───────── Milestones & gifts ─────────
create table milestone_achievements (
  player_id   uuid not null references profiles on delete cascade,
  pair_id     uuid not null references pairs on delete cascade,
  milestone   int  not null,
  run_id      uuid not null references runs,
  achieved_on date not null,
  primary key (player_id, milestone)
);

create table gifts (
  id           uuid primary key default gen_random_uuid(),
  pair_id      uuid not null references pairs on delete cascade,
  giver_id     uuid not null references profiles,
  receiver_id  uuid not null references profiles,
  milestone    int  not null,
  title        text,                 -- null until the giver sets it
  hint         text,
  details      text,
  link_url     text,
  status       gift_status not null default 'locked',
  unlocked_at  timestamptz,
  revealed_at  timestamptz,
  delivered_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (receiver_id, milestone)
);

-- ───────── Gamification ─────────
create table xp_events (
  id         bigserial primary key,
  pair_id    uuid not null references pairs on delete cascade,
  player_id  uuid not null references profiles on delete cascade,
  amount     int  not null,
  reason     text not null,          -- 'solve','day_complete','makeup_complete','milestone'
  ref        text,                   -- e.g. submission id / day / milestone
  created_at timestamptz not null default now(),
  unique (player_id, reason, ref)    -- idempotent awards
);

create table badges_earned (
  player_id  uuid not null references profiles on delete cascade,
  pair_id    uuid not null references pairs on delete cascade,
  badge_key  text not null,
  earned_at  timestamptz not null default now(),
  primary key (player_id, badge_key)
);

-- ───────── Social / infra ─────────
create table nudges (
  id         bigserial primary key,
  pair_id    uuid not null references pairs on delete cascade,
  from_id    uuid not null references profiles,
  to_id      uuid not null references profiles,
  message    text not null check (char_length(message) <= 140),
  created_at timestamptz not null default now()
);

create table activity (
  id         bigserial primary key,
  pair_id    uuid not null references pairs on delete cascade,
  actor_id   uuid references profiles,
  kind       text not null,          -- 'solve','day_complete','restore_requested',…
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on activity (pair_id, created_at desc);

create table push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  player_id       uuid not null references profiles on delete cascade,
  endpoint        text unique not null,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   int not null default 0
);

create table notification_log (
  id         bigserial primary key,
  player_id  uuid not null references profiles on delete cascade,
  kind       text not null,
  dedupe_key text unique not null,   -- e.g. 'reminder_evening:<player>:<day>'
  sent_at    timestamptz not null default now()
);

create table sync_state (
  player_id            uuid primary key references profiles on delete cascade,
  last_attempt_at      timestamptz,
  last_success_at      timestamptz,
  consecutive_failures int not null default 0,
  last_error           text,
  last_finalized_day   date,
  lock_until           timestamptz,  -- lease lock (see 9.4)
  lock_owner           text
);
```

### 6.1 Row Level Security (`0002_rls.sql`, tuned in `0004_advisor_fixes.sql`)
The client is **read-only**. All writes use the secret key in route handlers.

```sql
create function public.my_pair_id() returns uuid
language sql stable security definer set search_path = public as $$
  select pair_id from profiles where id = auth.uid()
$$;
-- Only signed-in users need it (every policy calls it); signed-out callers don't.
revoke execute on function public.my_pair_id() from public, anon;

-- Enable RLS on every table
alter table pairs enable row level security;
alter table profiles enable row level security;
-- … repeat for all tables …

-- Wrap auth.uid() / my_pair_id() in (select …) so Postgres evaluates them
-- once per statement, not once per row.
create policy "read own pair"     on pairs    for select to authenticated using (id = (select my_pair_id()));
create policy "read pair members" on profiles for select to authenticated
  using (id = (select auth.uid()) or pair_id = (select my_pair_id()));

-- Generic pattern for pair-scoped tables:
create policy "read pair rows" on days              for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on runs              for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on submissions       for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on daily_targets     for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on restore_requests  for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on milestone_achievements for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on xp_events         for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on badges_earned     for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on nudges            for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read pair rows" on activity          for select to authenticated using (pair_id = (select my_pair_id()));
create policy "read problems"  on problems          for select to authenticated using (true);

-- Gifts: NO client policy. RLS is enabled on `gifts`, but no select policy exists,
-- so the client can never read a gift's title/details before it's revealed.
```

**Gifts are server-only.** The receiver must not be able to see a gift's title, details or link before the reveal. So `gifts` has no client policy at all, and gift data is served by `GET /api/gifts`, which masks unrevealed fields on the server. Realtime for gifts works as a signal only: the client listens for `activity` rows of kind `gift_*` and refetches.

`push_subscriptions`, `notification_log` and `sync_state` have no client policies (server only).

### 6.3 Device-only preferences
Theme, sounds, haptics and the reduced-motion override (design.md §11.14) are per-device preferences stored in `localStorage` under `bloom:prefs`. They are not in the database and are not synced between devices.

### 6.2 Realtime
Add to the `supabase_realtime` publication: `days`, `runs`, `restore_requests`, `activity`, `profiles`, `daily_targets`, `badges_earned`.
The client subscribes once per session with the filter `pair_id=eq.<pairId>` on each table and invalidates the matching TanStack Query keys.

### 6.4 Indexes and advisor notes (`0004_advisor_fixes.sql`)
`0004` adds a `pair_id` index to every pair-scoped table that RLS and realtime filter on (`daily_targets`, `days`, `runs`, `submissions`, `restore_requests`, `milestone_achievements`, `xp_events`, `badges_earned`, `nudges`, `gifts`), plus `player_id` on `push_subscriptions` and `notification_log`.

Advisor findings we accept on purpose:
- **RLS enabled, no policy** on `gifts`, `push_subscriptions`, `notification_log`, `sync_state`: these are server-only (§6.1).
- **Signed-in users can execute `my_pair_id()`** (SECURITY DEFINER): every policy calls it, so `authenticated` needs EXECUTE. Through `/rest/v1/rpc/my_pair_id` it only returns the caller's own `pair_id`, which they can already read from `profiles`.
- **Unindexed foreign keys** on reference-only columns (`activity.actor_id`, `daily_targets.set_by`, `days.run_id`, `gifts.giver_id`, `milestone_achievements.run_id`, `nudges.from_id`/`to_id`, `restore_requests.approver_id`/`run_id`, `submissions.title_slug`): nothing looks rows up by them, and their parent rows are effectively never deleted. Two players produce at most a few thousand rows.
- **Unused index**: expected while the database is empty.

---

## 7. Rules engine (`lib/engine`)

All functions are **pure**: state in, new state plus a list of effects out. Services load the state, call the engine, then persist the result and run the effects (notifications, activity rows, XP rows) in one place.

### 7.1 Types (abridged)
```ts
type DayStatus = 'pending'|'complete'|'missed'|'restored';
interface PairRules { milestones: number[]; tokensPerRun: number; graceMinutes: number; makeupEnabled: boolean; startDate: DayKey; }
interface Day { day: DayKey; target: number; makeupRequired: number; solvedSlugs: Set<string>; status: DayStatus; runId?: string; finalized: boolean; }
interface Run { id: string; startedOn: DayKey; length: number; lastCountedDay?: DayKey; tokensRemaining: number; restoresUsed: number; atRiskDay?: DayKey; endedOn?: DayKey; endReason?: string; }
type Effect =
  | { kind: 'notify'; to: 'self'|'partner'|'both'; notif: NotificationKind; data: object; dedupeKey: string }
  | { kind: 'activity'; type: string; payload: object }
  | { kind: 'xp'; amount: number; reason: string; ref: string }
  | { kind: 'milestone'; milestone: number; firstTime: boolean }
  | { kind: 'badge'; key: string };
const required = (d: Day) => d.target + d.makeupRequired;
```

### 7.2 Day assignment with grace (`assign.ts`), PRD 4.4
```
assignDay(sub, days, rules):
  { day: C, minuteOfDay: m } = istParts(sub.submittedAt)
  if m < rules.graceMinutes:
     P = addDays(C, -1)
     prev = days[P]
     if P >= rules.startDate and P > lastFinalizedDay:
        if prev doesn't exist → return P                     // nothing solved yet: still needs problems (PRD 4.4)
        if prev.status == 'pending', !prev.finalized
           and !prev.solvedSlugs.has(sub.slug)
           and prev.solvedSlugs.size < required(prev):
             return P
  return C
```
Submissions are processed **in ascending `submitted_at` order**. Each assigned submission:
- `counted = assignedDay >= startDate && !day.solvedSlugs.has(slug)`
- `isResolve = slug was counted on any earlier day` (the service loads each counted slug's first day into the engine's `history`)
- XP: base by difficulty (10/25/50; difficulty unknown → 10), halved and rounded down if `isResolve`, 0 if not counted.
- If counted, add the slug to `solvedSlugs`, then call `evaluateCompletion`.

### 7.3 Completion (`evaluate.ts`), PRD 4.5
Completion and counting are two steps. A day becomes `complete` **live**, as soon as it has enough distinct solves (unless the run is on ice). It is **counted** into the run (`runId`, `length`, day XP, `partner_done`, milestones) only when every earlier day of the run is settled, by `advance()`, which walks forward from the run's `lastCountedDay + 1`. So a later day that fills up first (a grace-hour duplicate, or a sync catching up after downtime) waits for the day before it and can never skip over a missed day. When a day goes on ice, any later day that is complete but not yet counted goes back to pending (held).

```
evaluateCompletion(day, run, rules):
  if day.status != 'pending' → no-op
  if run.atRiskDay != null → HOLD (no-op; the window day is re-evaluated on resolution)
  if day.solvedSlugs.size >= required(day):
     day.status = 'complete'; day.runId = run.id
     run.length += 1; run.lastCountedDay = day.day
     effects: xp(+20, 'day_complete', day) [+30 'makeup_complete' if makeupRequired>0]
              notify partner 'partner_done'
     onStreakLength(run)
```

### 7.4 Streak length hooks (`milestones.ts`), PRD 4.7–4.8
```
onStreakLength(run, player):
  best_streak = max(best_streak, run.length)
  if run.length in rules.milestones:
     run.tokensRemaining = rules.tokensPerRun                    // refill
     firstTime = !achievements.has(run.length)
     effects: milestone(run.length, firstTime), notify both 'milestone_reached'
     if firstTime: insert achievement; xp(+10*M, 'milestone', M); badge('ms_'+M) when M in {15,30,50,100}
                   gift(receiver=player, milestone=M): status → 'unlocked'; if title null → notify giver 'gift_owed'
```
Gift rows are created lazily: when the giver first saves a gift, or when a milestone unlocks with no gift yet (an "IOU" row with `title = null`).

### 7.5 Finalization (`evaluate.ts`), PRD 4.6
Runs for each overdue pending day in ascending order.
```
finalizeDay(D, days, run, rules, now):
  d = days[D]; if d.status != 'pending' → return

  // 1) Close a restore window that ends with day D
  if run.atRiskDay == addDays(D, -1):
      expire any pending request for run.atRiskDay           // status 'expired'
      endRun(run, endedOn=run.atRiskDay, reason=request? 'restore_expired' : 'missed')
      notify both 'streak_broken'
      run = startRun(D)                                      // new run includes D
      evaluateCompletion(d, run)                             // released from hold
      if d.status == 'complete' → mark finalized, return

  // 2) D is incomplete
  if days[addDays(D,-1)]?.status == 'restored':              // approved restore hasn't stuck yet (PRD 4.6.5–4.6.6),
                                                             // with or without make-up; never a second restore
      d.status = 'missed'
      days[addDays(D,-1)].status = 'missed'                  // un-restore
      run.length -= 1; run.lastCountedDay = addDays(D,-2)
      endRun(run, endedOn=D, reason='makeup_failed')         // token stays spent
      notify both 'streak_broken'                            // milestones reached on the restored day are kept
      startRun(addDays(D,1)); finalized; return

  d.status = 'missed'
  if run.tokensRemaining == 0 or run.length == 0:
      endRun(run, endedOn=D, reason = tokens==0 ? 'no_tokens' : 'missed')
      startRun(addDays(D,1))
      notify both 'streak_broken' (only if the ended run's length > 0)
  else:
      run.atRiskDay = D
      hold later complete-but-uncounted days (back to pending)
      notify self 'streak_on_ice' (window ends at dayEndsAt(D+1))
  d.finalized = true
```
`startRun(day)` creates a run with `length 0`, `tokensRemaining = rules.tokensPerRun`, and `startedOn = day`, then calls `advance()` so any day from `day` onward that has already filled up is counted into it.

**When is a day overdue enough to finalize?** When `now >= dayEndsAt(D)` **and** at least one of:
- `sync_state.last_success_at >= dayEndsAt(D)` (a sync after the boundary has captured every grace-hour solve), or
- `now >= dayEndsAt(D) + 6h` (LeetCode unreachable; finalize with what we have).

### 7.6 Restore actions (`restore.ts`)
The rules live in the pure `lib/engine/restore.ts`; `lib/services/restore.ts` checks who is acting, takes the lease lock, calls it and persists the result.
```
requestRestore(player, message, now):
  run.atRiskDay set; now < dayEndsAt(run.atRiskDay + 1); no live request for that day
  → insert request(status pending, expires_at = dayEndsAt(atRiskDay+1)); notify partner 'restore_requested'

cancelRestore(player, requestId): status pending → 'cancelled' (a new request is then allowed)

respondRestore(approver, requestId, approve, reply, now):
  request.status == 'pending'; approver == request.approver_id; now < request.expires_at
  run = request.run (must still have atRiskDay == request.missed_day)
  if approve:
     run.tokensRemaining -= 1; run.restoresUsed += 1
     days[missed].status = 'restored'; days[missed].runId = run.id
     run.length += 1; run.lastCountedDay = missed; run.atRiskDay = null
     if rules.makeupEnabled: days[missed+1].makeupRequired = days[missed].target
     onStreakLength(run)                                  // a restored day can hit a milestone
     evaluateCompletion(days[missed+1], run)              // may complete right away
     badge check 'big_heart' for approver
  else:
     endRun(run, endedOn=missed, reason='restore_rejected')  // no streak_broken: restore_answered says it
     newRun = startRun(missed+1); evaluateCompletion(days[missed+1], newRun)
  notify requester 'restore_answered'
```
The approve path never touches a day the player hasn't reached yet, because the window only exists during day `missed+1`.

### 7.7 Targets (`targets.ts`)
- `setTarget(setter, playerId, target)`: the setter must be the player's partner. Upsert `daily_targets(player_id, effective_from = todayIST(now) + 1)`. Notify the player.
- `targetFor(player, D)`: the latest row with `effective_from <= D`, or 1 if none exists.
- A day row's `target` is snapshotted **when the row is created**. Rows are created lazily the first time a day is touched (a submission, a dashboard read through `ensureToday`, or finalization). Because changes only apply from tomorrow, a lazily created row always gets the right target.

### 7.8 XP and levels (`xp.ts`)
```ts
export const levelForXp = (xp: number) => {
  // total XP to reach level L = 50*L*(L-1)  →  L = floor((1 + sqrt(1 + 0.08*xp)) / 2)
  return Math.floor((1 + Math.sqrt(1 + 0.08 * xp)) / 2);
};
```
XP rows are written to `xp_events` (unique on `(player, reason, ref)` for idempotency), and `profiles.xp_total` and `level` are updated in the same service call. A level increase emits `level_up`.

"First time solved" means **first time recorded by this app**. LeetCode doesn't publicly expose a player's full solve history.

### 7.9 Badges (`badges.ts`)
`evaluateBadges(playerSnapshot, event)` returns the badge keys newly earned, checked after each solve, completion, restore response and milestone. Conditions are listed in PRD 4.10. Inserts are idempotent through the primary key.

---

## 8. LeetCode integration (`lib/leetcode/client.ts`)

Endpoint: `POST https://leetcode.com/graphql`. It's public and unauthenticated, but **unofficial**: it can change or rate-limit without notice. All calls are server-side, because browsers can't call it directly (CORS).

```ts
const HEADERS = {
  'Content-Type': 'application/json',
  'Referer': 'https://leetcode.com',
  'User-Agent': 'Bloom/1.0 (personal two-user tracker)',
};

export const Q_RECENT_AC = /* GraphQL */ `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id title titleSlug timestamp
    }
  }`;   // timestamp = unix seconds (string); max useful limit ≈ 20

export const Q_QUESTION = /* GraphQL */ `
  query questionMeta($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionFrontendId title titleSlug difficulty
      topicTags { name slug }
    }
  }`;

export const Q_USER = /* GraphQL */ `
  query userProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { userAvatar realName ranking }
      submitStatsGlobal { acSubmissionNum { difficulty count } }
    }
  }`;
```

**Client behavior**
- 8-second timeout, with one retry on network or 5xx errors. No retry on 4xx.
- Validate responses with Zod. A shape mismatch counts as a sync failure with `last_error = 'schema'`.
- `matchedUser: null` means the username was not found.
- Cache problem metadata permanently in `problems` (fetched once per new slug).

**Sync procedure (`services/sync.ts`)**
1. Fetch `recentAcSubmissionList(limit: 20)`.
2. Drop rows whose `id` already exists in `submissions` for this player.
3. Make sure each new slug exists in `problems`, fetching metadata for unknown ones.
4. Sort the new rows by timestamp, then for each row: run `assignDay` → insert the submission → `evaluateCompletion` (section 7).
5. Update `sync_state`: on success, set `last_success_at = now` and `consecutive_failures = 0`. On failure, increment `consecutive_failures` and set `last_error`.
6. Emit `sync_failing` (deduplicated per day) when `now - last_success_at > 3h`.

**Rate:** the tick syncs every 10 minutes per player, and on-demand sync is capped at once per 60 seconds per player. That's roughly 300 requests a day in total.

**Risk and fallback:** if LeetCode starts blocking Vercel's servers (for example with a Cloudflare 403), try (a) moving the fetch to a Supabase Edge Function as a different outbound route, and (b) enabling manual check-in (section 10) automatically.

---

## 9. Scheduler and the tick

### 9.1 pg_cron job (`0003_cron.sql`)
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the secret in Vault once (run manually, not committed):
-- select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- select vault.create_secret('https://<name>.vercel.app', 'app_url');

select cron.schedule(
  'bloom-tick',
  '*/10 * * * *',                                       -- UTC; every 10 minutes
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'app_url') || '/api/cron/tick',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

### 9.2 Vercel backup cron (`vercel.json`)
```json
{
  "regions": ["hnd1"],
  "crons": [{ "path": "/api/cron/tick", "schedule": "30 20 * * *" }]
}
```
Vercel Cron sends a `GET` with `Authorization: Bearer $CRON_SECRET`, so the tick route accepts both GET and POST.

### 9.3 Tick pipeline (`/api/cron/tick`)
```
verify Authorization header == CRON_SECRET  → else 401
now = new Date()
for each paired player:
  if !acquireLock(player, owner='tick', ttl=60s) → skip
  try:
    1. syncLeetCode(player)                       (errors caught → sync_state)
    2. finalizeOverdueDays(player, now)           (ascending, from last_finalized_day+1 or start_date)
    3. ensureToday(player, now)                   (create today's day row)
    4. scheduledNotifications(player, now)        (see 9.5)
  finally: releaseLock(player)
return 200 { ok, durationMs }
```
Target duration is under 10 seconds. If the start date is in the future, the tick only syncs (for pre-season stats). Players run in parallel, each under its own lock; one player's failure doesn't stop the other's.

**Persistence (`services/tick.ts`, `services/persist.ts`).** Steps 1–4 run the engine in memory (`processSubmissions` → `finalizeOverdue` → `ensureToday` → `scheduledNotifications`), then everything is saved with **one call to `save_player_state(jsonb)`** (`0005_state_functions.sql`), in a single transaction: runs (ended first), days (an existing row's `target` is never overwritten), restore requests, new submissions, XP events, badges (a partner's `big_heart` goes to the partner), first-time milestones, gift unlocks (an IOU row plus `gift_owed` to the giver when no gift is set), activity, notifications and sync bookkeeping. `profiles.xp_total` is recomputed as the sum of `xp_events`, and `level` with `level_for_xp`. The function returns only the notifications it newly logged, which are then delivered (Web Push from build step 7; until then a log line). A LeetCode failure is recorded as a failed sync (`last_error` = the error code) and never fails the tick.

### 9.4 Concurrency: per-player lease lock (`services/lock.ts`)
The tick and on-demand `/api/sync` can overlap. A lease lock prevents double-processing. It's two server-only functions in `0005_state_functions.sql`, wrapped by `withPlayerLock()`:
```sql
-- try_lock(player, owner, ttl = 60): creates the sync_state row if needed, then
update sync_state
   set lock_until = now() + make_interval(secs => ttl), lock_owner = owner
 where player_id = player and (lock_until is null or lock_until < now());
-- returns found (false → someone else holds it; skip this player)

-- release_lock(player, owner): clears the lock only if this owner still holds it
```
Each acquisition uses a unique owner (`tick:<uuid>`), so a slow run can't release a lock someone else took after its lease expired. The unique constraints in section 6 are the second line of defense.

### 9.5 Scheduled notification rules
These are evaluated every tick with IST `minuteOfDay` and deduplicated through `notification_log.dedupe_key`. A 10-minute tick means each fires within 10 minutes of its nominal time.

| Kind | Condition | Dedupe key |
|---|---|---|
| reminder_evening | 21:00 ≤ IST time < 23:00, today incomplete | `reminder_evening:<player>:<day>` |
| reminder_late | 23:00 ≤ IST time < 24:00, today incomplete | `reminder_late:<player>:<day>` |
| reminder_grace | 00:15 ≤ IST time < 01:00, yesterday pending and incomplete | `reminder_grace:<player>:<yesterday>` |
| restore_closing | pending request and `expires_at - now ≤ 2h` | `restore_closing:<request>` |
| restore_ask | at risk, no request, 20:00 IST on window day | `restore_ask:<player>:<missed>` |
| sync_failing | `now - last_success_at > 3h` | `sync_failing:<player>:<day>` |

Event-driven notifications (partner_done, restore_requested, milestone_reached and so on) are sent from engine effects right away.

---

## 10. API routes

All routes are in `app/api/**/route.ts`. Each one checks the Supabase session (except the tick), validates input with Zod, takes the player's lease lock if it changes game state, and returns JSON.
Errors use the shape `{ error: { code, message } }` with an HTTP status of 400, 401, 403, 404, 409 or 500.

| Method & path | Body | Does |
|---|---|---|
| `GET /auth/callback` | — | OAuth return: exchanges the code for a session and redirects (section 13) |
| `POST /api/onboarding/profile` | `{ displayName, avatarKey, color }` | Creates or updates the profile; 409 `color_taken` on a clash with the partner |
| `GET /api/leetcode/validate?username=` | — | Runs Q_USER; returns `{ exists, avatar, solved }` |
| `POST /api/leetcode/link` | `{ username }` | Checks the account exists (404 `leetcode_not_found`), saves LeetCode's spelling, sets `leetcode_verified_at`; if already in a pair, runs one tick after the response (`after()`) so pre-season solves appear at once |
| `POST /api/pair/create` | `{ startDate }` | `startDate` from today (IST) to +90 days. Creates a pair with a 6-character code (no ambiguous characters, retried on a clash) and joins the creator; 409 `already_paired`. Runs one tick after the response |
| `POST /api/pair/join` | `{ code }` | Joins; 404 `pair_not_found`, 409 `pair_full` if the pair is full, 409 `color_taken` if the partner already has my colour (UI asks me to pick another). Runs one tick after the response |
| `PATCH /api/pair` | `{ startDate? , addMilestone?, makeupEnabled? }` | Any member. startDate only before the start (today to +90 days), and the players' not-yet-started runs move with it. Pre-season submissions on or after the new start are deleted and both players are synced after the response, so moving day 1 to today counts today's solves; milestones can only be added (409 `milestone_exists`) |
| `POST /api/sync` | — | On-demand tick for me: sync, finalize overdue days, today's row, reminders. At most once per 60 s per player (429 `too_soon` with `Retry-After`); 409 `busy` if a tick holds the lock |
| `GET /api/sync` | — | Last successful sync time for both pair members (`sync_state` is server-only) |
| `POST /api/restore/request` | `{ message? }` | Section 7.6 |
| `POST /api/restore/cancel` | `{ requestId }` | Section 7.6 |
| `POST /api/restore/respond` | `{ requestId, approve, reply? }` | Section 7.6 (approver only) |
| `POST /api/target` | `{ playerId, target }` | Partner only (403 otherwise); upserts `daily_targets` for tomorrow (IST) under the player's lock; feed row for both, `target_changed` push for the player |
| `GET /api/gifts` | — | Gifts for the pair, with unrevealed fields masked for the receiver |
| `PUT /api/gifts` | `{ milestone, title, hint?, details?, linkUrl? }` | Giver creates or edits a gift for the partner (only before reveal; 409 `already_revealed`). A new gift for a milestone the partner already reached starts `unlocked`. Links must be http(s) |
| `POST /api/gifts/:id/reveal` | — | Receiver only; status `unlocked` and `title` set → `revealed` |
| `POST /api/gifts/:id/received` | — | Receiver only; `revealed` → `delivered` |
| `POST /api/nudge` | `{ message }` (preset or own words, 1–140 chars) | Limit of 3 per sender per IST day (429 `nudge_limit`); stores the nudge, adds a `nudge` activity row and pushes `nudge` to the partner after the response |
| `POST /api/checkin/manual` | `{ problemUrl }` | Open only while sync is failing: at least one failure in a row and no success for over 3 h (or never). The slug comes from the strict regex (400 `invalid_url`); the URL is never fetched. Under the player's lock, the solve runs through the engine at the current time with `source = manual`. A slug LeetCode says doesn't exist is refused (404 `unknown_problem`); while LeetCode is unreachable the problem is taken on trust with a placeholder `problems` row (no `frontend_id`), which the next sync that sees the slug fills in. 409 `checkin_closed` / `busy`. `GET /api/sync` reports `checkInOpen` per player |
| `POST /api/push/subscribe` | `PushSubscriptionJSON` | Upsert by endpoint |
| `POST /api/push/unsubscribe` | `{ endpoint }` | Delete |
| `POST /api/push/test` | — | Sends a test notification to my devices |
| `PATCH /api/settings/notifications` | `{ [kind]: boolean }` | Updates `notif_prefs` |
| `GET\|POST /api/cron/tick` | — | Section 9.3 (CRON_SECRET) |

**Read paths:** the client reads `profiles`, `pairs`, `days`, `runs`, `submissions` (joined with `problems`), `restore_requests`, `milestone_achievements`, `badges_earned`, `activity` and `daily_targets` directly through supabase-js under RLS. Gifts come only from `GET /api/gifts`.

**Dashboard data hook:** `useDuelState()` composes, for each player: active run, today's and yesterday's day rows, sync_state summary (`last_success_at`, served by an RPC or API), next milestone, and XP and level. Realtime events invalidate it.

---

## 11. Push notifications

### 11.1 Server (`lib/push/webpush.ts`)
```ts
import webpush from 'web-push';
webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function sendToPlayer(playerId: string, n: { title: string; body: string; url: string; tag?: string }) {
  // load subscriptions; respect profiles.notif_prefs[kind] === false
  // for each: webpush.sendNotification(sub, JSON.stringify(n), { TTL: 60 * 60 * 6, urgency: 'high' })
  //   404/410 → delete subscription; other errors → failure_count++
}
```
`notify.ts` is the only caller. Notifications are logged in `notification_log` with their dedupe key first (by `save_player_state`, or `services/events.ts` for non-engine actions), and only newly logged ones are delivered. Delivery skips kinds muted in `notif_prefs`, fills in the other player's display name, and builds the text with `lib/push/copy.ts` (design §14.2). Each row carries `actor_id` (the player whose event it is), so shared events such as `milestone_reached` and `streak_broken` read right for each recipient. Push errors never fail the caller; the activity feed still has the event.

Settings groups the kinds into six toggles (`lib/push/categories.ts`: daily reminders, partner progress, streaks and restores, milestones and gifts, levels/badges/goals, sync problems), stored per kind in `notif_prefs`.

### 11.2 Client
- After onboarding and from Settings, call `Notification.requestPermission()` **from a user tap** (iOS requires this, and only inside the installed PWA).
- `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) })` → `POST /api/push/subscribe`.
- Re-subscribe on app start if the subscription is missing (iOS can drop it).

### 11.3 Service worker (`public/sw.js`)
```js
const SHELL = 'shell-v1';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['/offline', '/icons/icon-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/offline')));
  }
});
self.addEventListener('push', e => {
  const n = e.data ? e.data.json() : { title: 'Bloom', body: '' };
  e.waitUntil(self.registration.showNotification(n.title, {
    body: n.body, tag: n.tag, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png',
    data: { url: n.url || '/' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all.find(w => 'focus' in w);
    if (c) { await c.navigate(e.notification.data.url); return c.focus(); }
    return clients.openWindow(e.notification.data.url);
  })());
});
```
Registered on app start (`lib/push/client.ts`) with `{ scope: '/', updateViaCache: 'none' }`; `/sw.js` is served with `Cache-Control: no-cache` (`next.config.ts`).

**Offline (PRD 5.10).** The worker caches pages network-first (falling back to the last copy, then `/offline` for pages never visited) and `/_next/static/` + `/icons/` cache-first; `/api/*`, `/auth/*` and cross-origin calls (Supabase, LeetCode) are never cached. The app's data comes from TanStack Query, whose cache is saved to `localStorage` (`bloom:query-cache`, 24 h, versioned) and restored on open, so the dashboard shows the last loaded data offline with a "You're offline" pill; sign-out clears it. Caching is off when the worker is registered from the dev server (`/sw.js?mode=dev`), whose files change on every edit. `/offline` is public in the proxy.

---

## 12. PWA setup

`app/manifest.ts`:
```ts
import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bloom', short_name: 'Bloom',
    description: 'Two-player LeetCode streak challenge',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#F6F4FC', theme_color: '#F6F4FC',          // Cloud (design.md §2.3)
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```
Every brand image comes from one drawing, `lib/brand/logo.ts`, by `node scripts/generate-icons.mjs` (the wordmark is drawn from the real Baloo 2 glyphs via `@fontsource` + `opentype.js`): icons 192/512, maskable 192/512, a `monochrome` 512 for Android's themed icons, the 72 px notification badge, apple-touch 180, `app/icon.svg` and a 16/32/48 `app/favicon.ico`, 15 iPhone/iPad launch screens in `public/splash/` (listed in `lib/brand/splash.ts` and linked as `apple-touch-startup-image`), and the 1200×630 link-preview image `public/og.png` (Open Graph and Twitter cards, absolute via `metadataBase` = `APP_URL`). The manifest also lists long-press shortcuts (Activity, Journey, Gifts). Android draws its launch screen from the manifest (icon on Cloud); inside the installed app, `components/brand/BootSplash.tsx` continues it in the first HTML (same mark, wordmark and tagline on the same light Cloud, shown only in `display-mode: standalone`) and fades once the app has hydrated. **System bars.** The `<meta name="theme-color">` tag (which Android uses for the status bar) is written by the theme boot script and `useDocumentTheme`, not by Next's viewport metadata, which would reset it on page changes: Cloud by day, `#1D1836` by night. `color-scheme` follows the palette too. The bottom navigation bar of an installed app can't follow it: Android paints it once from the manifest (`background_color` on Android 15+, `theme_color` before), so it's fixed at install. **Push without keys:** if a build lacks `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the push state is `unconfigured` and the reminder prompt hides instead of offering a button that can't work. In `app/layout.tsx` metadata: `appleWebApp: { capable: true, title: 'Bloom', statusBarStyle: 'black-translucent' }`, an `apple-touch-icon` (180×180), and `viewport: { themeColor, viewportFit: 'cover' }`. Respect safe-area insets in CSS.

**Install UX** (`lib/pwa/install.ts`, `components/pwa/InstallCard.tsx`)
- Android/Chrome: capture `beforeinstallprompt` (as soon as the app loads, since it fires once) and show a custom "Install Bloom" button, dismissible on home and always in Settings. When Chrome hasn't offered the dialog, show its menu steps ("⋮ → Install app"). The manifest lists itself in `related_applications`, so `navigator.getInstalledRelatedApps()` tells a browser tab the app is already installed ("Open it from your home screen").
- iOS: detect Safari when not in standalone mode (`navigator.standalone !== true`) and show the "Share → Add to Home Screen" instructions.
- Detect standalone mode with `matchMedia('(display-mode: standalone)')` and hide the install prompts there.

### 12.1 Presentation layer (design pass)
- **Theme.** `lib/sky.ts` maps the IST time to a sky band (tested). `useDocumentTheme()` keeps `data-theme` (day/night palette), `data-band`, `data-motion` (reduced or full) and `data-hidden` (app in the background) on `<html>`; a small boot script in the root layout sets theme and motion before first paint so a night visit never flashes day. Ambient CSS loops stop under `data-motion="reduce"` and pause under `data-hidden`; Motion's `MotionConfig` keeps only fades when motion is reduced.
- **Signature moments.** `lib/moments.ts` compares the current state (today done, both done, on ice, level, milestones reached, answered restore requests) with what this device has already shown, kept in `localStorage` under `bloom:seen:<playerId>`. The first run only records a baseline, so a fresh install never replays history. `components/moments` plays them one at a time; gift unboxing runs from the Gifts shelf.
- **Sounds.** `scripts/generate-sounds.sh` synthesizes the eight sounds with ffmpeg into `public/sounds` (`.mp3` and `.ogg`, each under 20 KB). `lib/sound.ts` plays them through one Web Audio context after a user gesture, so nothing sounds on launch.
- **Profiles.** `lib/game/heatmap.ts` (tested) turns day rows and submissions into heatmap tiles (year of Monday-first weeks or a month grid) and stats: distinct problems, Easy/Medium/Hard, best streak (longest run), days done (completed or restored among finished days) and top topics.
- **Card → profile.** The home player cards and the profile share a `view-transition-name`; `lib/viewTransition.ts` wraps the route change in `document.startViewTransition` and the `(app)` template ends it once the new screen renders. Without support, or with reduced motion, it's the normal tab transition.
- **Presence.** The pair's Realtime channel also tracks presence keyed by player. When the partner joins, their creature waves on home, at most once an hour per device (`lib/presence.ts`).
- **Pull to refresh.** On home, pulling down from the top stretches your flower and runs the same sync as "Sync now" on release; the page sets `overscroll-behavior-y: contain` so the browser's own pull-to-refresh stays out of the way.
- **Hydration.** Screens read the restored offline cache only after hydration (`useHydrated`, `useNow`), so the first client render matches the server HTML. Art coordinates are rounded so server and browser render identical SVG attributes, and every SVG id comes from `useId()`.

---

## 13. Authentication

- Supabase Auth with **Google sign-in only**. No email OTP, magic links or passwords, so no email service is needed.
  - `/login` renders **Google Identity Services'** own button (`accounts.google.com/gsi/client`, popup / FedCM) with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Google signs the user in on Bloom's origin, so its screen reads "Sign in to bloom.iteshxt.me", not the Supabase project address. It returns an ID token; the page calls `supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })`. A fresh random nonce is made per visit: Google gets its SHA-256 (embedded in the token), Supabase gets the raw value and checks they match, so a token can't be replayed (`lib/auth/google.ts`, tested). Then `/` (the proxy sends new players to `/onboarding`).
  - **Fallback:** if Google's script can't load (blocked or offline) within 8 s, the page shows Bloom's own button, which uses the redirect through Supabase: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/auth/callback` } })` (PKCE). `app/auth/callback/route.ts` exchanges the code with `supabase.auth.exchangeCodeForSession(code)` and redirects to `/`. It never follows a caller-supplied redirect.
  - One-time setup: a Google Cloud project with an OAuth consent screen (External, **published** so any Google account can sign in; while it's in Testing only the listed test users can, and only email/profile scopes are used so no Google verification is needed) and a **Web** OAuth client whose **authorized JavaScript origins** are `<APP_URL>` and `http://localhost:3000` (needed for the Identity Services button) and whose authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback` (the fallback). Put the client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and in Supabase's Google provider "Client IDs" (so Supabase accepts its ID tokens); keep "Skip nonce checks" off. Paste its client ID and secret into Supabase → Auth → Providers → Google. In Supabase → Auth → URL configuration, set the Site URL to `APP_URL` and allow `http://localhost:3000/auth/callback` and `<APP_URL>/auth/callback` as redirect URLs.
- Sessions are kept by `@supabase/ssr` cookies, refreshed in `proxy.ts`. In practice users stay signed in for months.
- **Page routing (`proxy.ts`):** signed out → `/login`; signed in but not onboarded (no pair or no LeetCode username) → `/onboarding`; onboarded → the app (`/login` and `/onboarding` redirect to `/`). `/api/*` and `/auth/*` are never redirected: API routes answer 401/403 themselves.
- **Open sign-up:** anyone with a Google account can create a profile and create or join a pair. A pair is locked at 2 players, and RLS (§6.1) means a player can only ever read their own pair's rows. Every `/api` route except sign-up (`/api/onboarding/profile`, `/api/leetcode/validate`) requires an existing profile, and game routes require a pair.

---

## 14. Testing

### 14.1 Engine unit tests (Vitest), required
All tests use a fixed `now` and fixture states. Minimum scenarios:

| # | Scenario | Expected |
|---|---|---|
| 1 | Target 1, solve at 14:00 | Day complete, streak 1, +20 XP plus solve XP |
| 2 | Same slug twice in a day | Counted once; second has 0 XP |
| 3 | Target 2; 1 solve yesterday; solves at 00:20, 00:35, 00:50 | 00:20 → yesterday (complete); 00:35 and 00:50 → today |
| 4 | Solve at exactly 01:00:00 IST | Today, not yesterday |
| 5 | Grace solve of a slug already counted yesterday | Goes to today |
| 6 | Grace solve synced at 01:40 (late) | Still assigned to yesterday; finalization waits for a post-boundary sync |
| 7 | Miss with tokens 3, streak 5 | At risk; window ends at dayEndsAt(D+1) |
| 8 | Miss with tokens 0 | Run ends `no_tokens`; new run starts D+1 |
| 9 | Miss with streak 0 | Run ends; new run D+1; no on-ice notification |
| 10 | Request → approve, make-up on, D+1 solves target+makeup | D restored, D+1 complete, streak +2, tokens −1 |
| 11 | Approve, but D+1 reaches only its target | D+1 missed; D reverted; run ends `makeup_failed`; token stays spent; new run at D+2 |
| 12 | Request → reject | Run ends `restore_rejected` at D; new run starts D+1 including D+1 progress |
| 13 | No request; window ends | Run ends `missed`; new run D+1 |
| 14 | Request, no response; window ends | Request expired; run ends `restore_expired` |
| 15 | D+1 target met before approval | D+1 held as pending; approval adds make-up → incomplete until paid |
| 16 | Reaching 15 for the first time | Achievement, gift unlocked, tokens refilled to 3, +150 XP |
| 17 | Reaching 15 again in a later run | Celebration and refill only; no gift |
| 18 | Restored day lands on a milestone | Milestone triggers |
| 19 | Target change on day C | Applies from C+1; day C keeps its old target |
| 20 | Server down for 2 days, then tick | Days finalized in order using timestamps; result matches a run with no downtime |
| 21 | Solves before the start date | Stored, `counted=false`, no streak effect |
| 22 | Level formula | 0→1, 100→2, 299→2, 300→3, 4500→10 |
| 23 | Each badge condition | Earned exactly once |
| 24 | Make-up off: approve, then D+1 ends below its target | Same as #11 (D reverted, run ends `makeup_failed`, token stays spent, new run at D+2); D+1 never goes on ice |
| 25 | Manual check-in while sync is failing | Counts like a synced solve (day, XP, streak); stored with `source = manual`, no LeetCode id; its `solve` activity carries `manual: true` |
| 26 | The same problem later arrives from LeetCode the same day | Stored, `counted = false`, no extra XP: never double-counted |

### 14.2 Integration
- There is no local database. The engine is covered by pure unit tests (14.1); the LeetCode client is tested with recorded fixtures (msw), never the real API.
- Services and migrations are checked against the hosted Supabase project through the Supabase MCP server (schema, RLS, rows written, logs).
- Tick idempotency: running the tick twice in a row against the hosted project produces no duplicate rows or notifications.

### 14.3 Manual QA checklist (before launch)
Install on Android and iPhone; push works on both; a real LeetCode solve appears after Sync; the full restore round-trip works across the two phones; gift unboxing works; offline launch shows the shell.

---

## 15. Setup and deployment

1. **Supabase**
   1. Create a project (Free). Bloom's project is in Tokyo (ap-northeast-1), so Vercel uses `hnd1`; keep the two regions together.
   2. Connect the Supabase MCP server to the project and apply migrations `0001`, `0002` and `0004` with its `apply_migration` tool (no local database or Docker). Apply `0003` only once the app is deployed, because the cron job needs the app URL.
   3. Auth → Providers: Google enabled with the Google Cloud OAuth client (section 13); Email provider disabled. Auth → URL configuration: Site URL and redirect URLs (section 13).
   4. Vault: create `cron_secret` and `app_url` (section 9.1).
   5. Database → Publications: add the realtime tables (section 6.2).
2. **VAPID keys:** `npx web-push generate-vapid-keys`.
3. **Vercel**
   1. Import the GitHub repo, framework Next.js.
   2. Add all environment variables (section 4).
   3. Project name = subdomain (`<name>.vercel.app`; final name chosen in design.md).
   4. Deploy. Check that the cron appears under Settings → Cron Jobs.
4. **Smoke test:** run `curl -X POST https://<name>.vercel.app/api/cron/tick -H "Authorization: Bearer $CRON_SECRET"` → 200. Then check `select * from cron.job_run_details order by start_time desc limit 5;` in Supabase.
5. **Onboard** both players, link LeetCode, install the PWA, enable notifications, and send a test push.

---

## 16. Security checklist
- The secret key and VAPID private key exist only in server environment variables, never in `NEXT_PUBLIC_*`.
- RLS is enabled on every table; the client has select-only policies; gifts are masked on the server.
- Every mutation route checks: signed in, in a pair, and acting on self or partner as the rule allows (for example, only the partner can set a target or respond to a restore).
- `/api/cron/tick` requires the bearer secret and does constant-time comparison.
- Rate limits: sync 60 s per player, nudges 3 a day, manual check-in only when sync is failing.
- Manual check-in URLs are parsed strictly (`^https://leetcode\.com/problems/([a-z0-9-]+)/?`), never fetched as given.

## 17. Observability
- Structured `console.log` JSON in route handlers (viewable in Vercel logs): tick duration, sync result per player, days finalized, notifications sent.
- `cron.job_run_details` in Supabase for heartbeat health.
- A hidden `/settings` "Diagnostics" panel: last sync, consecutive failures, last tick time, push subscriptions count.

## 18. Build order
1. Repo scaffold, Tailwind, Supabase clients, migrations, RLS.
2. `lib/time.ts` + **engine with the full test suite (section 14.1)**. Nothing else depends on UI.
3. LeetCode client + sync service + tick + lease lock + pg_cron.
4. Auth (Google sign-in), onboarding, pairing, LeetCode linking.
5. Dashboard (unstyled) wired to realtime.
6. Restores, targets, gifts, milestones APIs and screens.
7. Push (VAPID, service worker, subscribe flow, notify service, scheduled reminders).
8. PWA manifest, icons, install UX, offline page.
9. Apply `design.md`: visual system, animations, celebrations.
10. P1 features: badges, nudges, manual check-in, feed, history.
11. QA on both phones and launch.
