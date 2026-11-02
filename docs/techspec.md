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
 ┌──────────────── Vercel (region bom1) ┴─────────────────┐
 │  Next.js route handlers (/api/*)                       │
 │   • game actions (restore, target, gifts, nudge…)      │
 │   • /api/cron/tick  ← the heartbeat                    │
 │  lib/engine  (pure rules engine, unit tested)          │
 │  lib/leetcode (GraphQL client)  lib/push (web-push)    │
 └───────┬───────────────────────────────┬────────────────┘
         │ supabase-js (secret key)      │ POST graphql
         ▼                               ▼
 ┌──── Supabase (ap-south-1) ────┐   ┌── leetcode.com ──┐
 │ Postgres + RLS                │   │ /graphql (public, │
 │ Auth (email OTP)              │   │  unofficial)      │
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
| DB / Auth / Realtime | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) | Region ap-south-1 (Mumbai). |
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
| Supabase Auth email | A few OTP emails a month | The built-in sender has a low hourly limit, which is fine for 2 users. Optionally plug in a free SMTP provider (such as Resend) if it gets in the way. |

---

## 3. Repository layout

```
/app
  /(auth)/login/page.tsx
  /onboarding/page.tsx
  /(app)/layout.tsx              # authenticated shell, realtime provider
  /(app)/page.tsx                # duel dashboard
  /(app)/player/[id]/page.tsx
  /(app)/restores/page.tsx
  /(app)/gifts/page.tsx
  /(app)/milestones/page.tsx
  /(app)/badges/page.tsx
  /(app)/feed/page.tsx
  /(app)/history/page.tsx
  /(app)/settings/page.tsx
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
/public
  sw.js
  /icons/*                       # 192, 512, maskable, apple-touch
/supabase
  /migrations/0001_init.sql
  /migrations/0002_rls.sql
  /migrations/0003_cron.sql
  seed.sql                       # badges catalogue etc.
/tests
  /engine/*.test.ts
middleware.ts                    # Supabase session refresh (named proxy.ts in Next.js 16+)
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
| `ALLOWED_EMAILS` | server only | Comma-separated list of the two emails allowed to use the app |
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
  avatar_key           text not null default 'default',
  leetcode_username    text,
  leetcode_verified_at timestamptz,
  xp_total             int  not null default 0,
  level                int  not null default 1,
  best_streak          int  not null default 0,
  notif_prefs          jsonb not null default '{}'::jsonb,  -- { "<kind>": false } to opt out
  created_at           timestamptz not null default now()
);

-- Enforce max 2 players per pair
create function enforce_pair_size() returns trigger language plpgsql as $$
begin
  if new.pair_id is not null and
     (select count(*) from profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'pair is full';
  end if;
  return new;
end $$;
create trigger trg_pair_size before insert or update of pair_id on profiles
  for each row execute function enforce_pair_size();

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

### 6.1 Row Level Security (`0002_rls.sql`)
The client is **read-only**. All writes use the secret key in route handlers.

```sql
create function public.my_pair_id() returns uuid
language sql stable security definer set search_path = public as $$
  select pair_id from profiles where id = auth.uid()
$$;

-- Enable RLS on every table
alter table pairs enable row level security;
alter table profiles enable row level security;
-- … repeat for all tables …

create policy "read own pair"    on pairs    for select using (id = my_pair_id());
create policy "read pair members" on profiles for select using (id = auth.uid() or pair_id = my_pair_id());

-- Generic pattern for pair-scoped tables:
create policy "read pair rows" on days              for select using (pair_id = my_pair_id());
create policy "read pair rows" on runs              for select using (pair_id = my_pair_id());
create policy "read pair rows" on submissions       for select using (pair_id = my_pair_id());
create policy "read pair rows" on daily_targets     for select using (pair_id = my_pair_id());
create policy "read pair rows" on restore_requests  for select using (pair_id = my_pair_id());
create policy "read pair rows" on milestone_achievements for select using (pair_id = my_pair_id());
create policy "read pair rows" on xp_events         for select using (pair_id = my_pair_id());
create policy "read pair rows" on badges_earned     for select using (pair_id = my_pair_id());
create policy "read pair rows" on nudges            for select using (pair_id = my_pair_id());
create policy "read pair rows" on activity          for select using (pair_id = my_pair_id());
create policy "read problems"  on problems          for select using (auth.role() = 'authenticated');

-- Gifts: NO client policy. RLS is enabled on `gifts`, but no select policy exists,
-- so the client can never read a gift's title/details before it's revealed.
```

**Gifts are server-only.** The receiver must not be able to see a gift's title, details or link before the reveal. So `gifts` has no client policy at all, and gift data is served by `GET /api/gifts`, which masks unrevealed fields on the server. Realtime for gifts works as a signal only: the client listens for `activity` rows of kind `gift_*` and refetches.

`push_subscriptions`, `notification_log` and `sync_state` have no client policies (server only).

### 6.2 Realtime
Add to the `supabase_realtime` publication: `days`, `runs`, `restore_requests`, `activity`, `profiles`, `daily_targets`, `badges_earned`.
The client subscribes once per session with the filter `pair_id=eq.<pairId>` on each table and invalidates the matching TanStack Query keys.

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
     if P >= rules.startDate
        and prev exists, prev.status == 'pending', !prev.finalized
        and !prev.solvedSlugs.has(sub.slug)
        and prev.solvedSlugs.size < required(prev):
          return P
  return C
```
Submissions are processed **in ascending `submitted_at` order**. Each assigned submission:
- `counted = assignedDay >= startDate && !day.solvedSlugs.has(slug)`
- `isResolve = slug was counted on any earlier day` (check with a DB query)
- XP: base by difficulty (10/25/50; difficulty unknown → 10), halved if `isResolve`, 0 if not counted.
- If counted, add the slug to `solvedSlugs`, then call `evaluateCompletion`.

### 7.3 Completion (`evaluate.ts`), PRD 4.5
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
      run = startRun(D)                                      // new run includes D
      evaluateCompletion(d, run)                             // released from hold
      if d.status == 'complete' → mark finalized, return

  // 2) D is incomplete
  if d.makeupRequired > 0:                                   // approved restore, make-up not paid
      d.status = 'missed'
      days[addDays(D,-1)].status = 'missed'                  // un-restore
      run.length -= 1; run.lastCountedDay = addDays(D,-2)
      endRun(run, endedOn=D, reason='makeup_failed')         // token stays spent
      startRun(addDays(D,1)); finalized; return

  d.status = 'missed'
  if run.tokensRemaining == 0 or run.length == 0:
      endRun(run, endedOn=D, reason = tokens==0 ? 'no_tokens' : 'missed')
      startRun(addDays(D,1))
      notify both 'streak_broken' (only if the ended run's length > 0)
  else:
      run.atRiskDay = D
      notify self 'streak_on_ice' (window ends at dayEndsAt(D+1))
  d.finalized = true
```
`startRun(day)` creates a run with `length 0`, `tokensRemaining = rules.tokensPerRun`, and `startedOn = day`. It must also attach any already-complete pending day (`day`) to the new run. That case is covered in step 1.

**When is a day overdue enough to finalize?** When `now >= dayEndsAt(D)` **and** at least one of:
- `sync_state.last_success_at >= dayEndsAt(D)` (a sync after the boundary has captured every grace-hour solve), or
- `now >= dayEndsAt(D) + 6h` (LeetCode unreachable; finalize with what we have).

### 7.6 Restore actions (`restore.ts`)
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
     endRun(run, endedOn=missed, reason='restore_rejected')
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
  "regions": ["bom1"],
  "crons": [{ "path": "/api/cron/tick", "schedule": "30 20 * * *" }]
}
```
Vercel Cron sends a `GET` with `Authorization: Bearer $CRON_SECRET`, so the tick route accepts both GET and POST.

### 9.3 Tick pipeline (`/api/cron/tick`)
```
verify Authorization header == CRON_SECRET  → else 401
now = new Date()
for each pair (there's one), for each player:
  if !acquireLock(player, owner='tick', ttl=60s) → skip
  try:
    1. syncLeetCode(player)                       (errors caught → sync_state)
    2. finalizeOverdueDays(player, now)           (ascending, from last_finalized_day+1 or start_date)
    3. ensureToday(player, now)                   (create today's day row)
    4. scheduledNotifications(player, now)        (see 9.5)
  finally: releaseLock(player)
return 200 { ok, durationMs }
```
Target duration is under 10 seconds. If the start date is in the future, the tick only syncs (for pre-season stats).

### 9.4 Concurrency: per-player lease lock (`services/lock.ts`)
The tick and on-demand `/api/sync` can overlap. A lease lock prevents double-processing:
```sql
update sync_state
   set lock_until = now() + interval '60 seconds', lock_owner = $owner
 where player_id = $player and (lock_until is null or lock_until < now())
returning player_id;          -- 0 rows → lock not acquired
```
Released with `lock_until = null`. The unique constraints in section 6 are the second line of defense.

### 9.5 Scheduled notification rules
These are evaluated every tick with IST `minuteOfDay` and deduplicated through `notification_log.dedupe_key`. A 10-minute tick means each fires within 10 minutes of its nominal time.

| Kind | Condition | Dedupe key |
|---|---|---|
| reminder_evening | 21:00 ≤ IST time < 23:00, today incomplete | `reminder_evening:<player>:<day>` |
| reminder_late | 23:00 ≤ IST time < 24:00, today incomplete | `reminder_late:<player>:<day>` |
| reminder_grace | 00:15 ≤ IST time < 01:00, yesterday pending and incomplete | `reminder_grace:<player>:<yesterday>` |
| restore_closing | pending request and `expires_at - now ≤ 2h` | `restore_closing:<request>` |
| restore nudge to requester | at risk, no request, 20:00 IST on window day | `restore_ask:<player>:<missed>` |
| sync_failing | `now - last_success_at > 3h` | `sync_failing:<player>:<day>` |

Event-driven notifications (partner_done, restore_requested, milestone_reached and so on) are sent from engine effects right away.

---

## 10. API routes

All routes are in `app/api/**/route.ts`. Each one checks the Supabase session (except the tick), validates input with Zod, takes the player's lease lock if it changes game state, and returns JSON.
Errors use the shape `{ error: { code, message } }` with an HTTP status of 400, 401, 403, 404, 409 or 500.

| Method & path | Body | Does |
|---|---|---|
| `POST /api/onboarding/profile` | `{ displayName, avatarKey }` | Creates or updates the profile. Rejects emails not in `ALLOWED_EMAILS`. |
| `GET /api/leetcode/validate?username=` | — | Runs Q_USER; returns `{ exists, avatar, solved }` |
| `POST /api/leetcode/link` | `{ username }` | Validates, saves, sets `leetcode_verified_at`, and runs an initial sync (pre-season) |
| `POST /api/pair/create` | `{ startDate }` | Creates a pair with a 6-character code (no ambiguous characters); joins the creator |
| `POST /api/pair/join` | `{ code }` | Joins; 409 if the pair is full |
| `PATCH /api/pair` | `{ startDate? , addMilestone?, makeupEnabled? }` | startDate only before the start; milestones can only be added |
| `POST /api/sync` | — | On-demand sync of my account (60 s rate limit) plus finalizing overdue days |
| `POST /api/restore/request` | `{ message? }` | Section 7.6 |
| `POST /api/restore/cancel` | `{ requestId }` | Section 7.6 |
| `POST /api/restore/respond` | `{ requestId, approve, reply? }` | Section 7.6 (approver only) |
| `POST /api/target` | `{ playerId, target }` | Partner only; effective tomorrow |
| `GET /api/gifts` | — | Gifts for the pair, with unrevealed fields masked for the receiver |
| `PUT /api/gifts` | `{ milestone, title, hint?, details?, linkUrl? }` | Giver creates or edits a gift for the partner (only before reveal) |
| `POST /api/gifts/:id/reveal` | — | Receiver only; status `unlocked` and `title` set → `revealed` |
| `POST /api/gifts/:id/received` | — | Receiver only; `revealed` → `delivered` |
| `POST /api/nudge` | `{ message }` | Limit of 3 per sender per IST day |
| `POST /api/checkin/manual` | `{ problemUrl }` | Only if sync is failing for 3 h or more; parses the slug; source `manual` |
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
`notify.ts` is the only caller. It first inserts into `notification_log` with the dedupe key (on conflict, skip), then sends. Every notification also writes an `activity` row, so the in-app feed shows it even when push is off.

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
Registered by a client component: `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })`. Set `Cache-Control: no-cache` for `/sw.js` in `next.config` headers.

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
In `app/layout.tsx` metadata: `appleWebApp: { capable: true, title: 'Bloom', statusBarStyle: 'black-translucent' }`, an `apple-touch-icon` (180×180), and `viewport: { themeColor, viewportFit: 'cover' }`. Respect safe-area insets in CSS.

**Install UX**
- Android/Chrome: capture `beforeinstallprompt` and show a custom "Install" button.
- iOS: detect Safari when not in standalone mode (`navigator.standalone !== true`) and show the "Share → Add to Home Screen" instructions.
- Detect standalone mode with `matchMedia('(display-mode: standalone)')` and hide the install prompts there.

---

## 13. Authentication

- Supabase Auth with **email OTP** (6-digit code), not magic links, because links open in the browser instead of the installed PWA on iOS.
  - `supabase.auth.signInWithOtp({ email })`, then `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
  - In the Supabase dashboard, edit the **Magic Link** email template to show `{{ .Token }}` instead of a link.
- Sessions are kept by `@supabase/ssr` cookies, refreshed in middleware. In practice users stay signed in for months.
- **Allowlist:** `ALLOWED_EMAILS` is checked in `/api/onboarding/profile`. Every other `/api` route requires an existing profile in a pair. Optionally, turn off new signups in Supabase after both accounts exist.

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

### 14.2 Integration
- Services against a local Supabase (`supabase start`), with the LeetCode client mocked using recorded fixtures (msw).
- Tick idempotency: running the tick twice in a row produces no duplicate rows or notifications.

### 14.3 Manual QA checklist (before launch)
Install on Android and iPhone; push works on both; a real LeetCode solve appears after Sync; the full restore round-trip works across the two phones; gift unboxing works; offline launch shows the shell.

---

## 15. Setup and deployment

1. **Supabase**
   1. Create a project (Free, region Mumbai / ap-south-1).
   2. Run migrations `0001`–`0003` (with the Supabase CLI `supabase db push`, or paste into the SQL editor).
   3. Auth → Providers: Email enabled. Auth → Email templates: Magic Link template shows `{{ .Token }}`.
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
4. Auth (OTP), onboarding, pairing, LeetCode linking.
5. Dashboard (unstyled) wired to realtime.
6. Restores, targets, gifts, milestones APIs and screens.
7. Push (VAPID, service worker, subscribe flow, notify service, scheduled reminders).
8. PWA manifest, icons, install UX, offline page.
9. Apply `design.md`: visual system, animations, celebrations.
10. P1 features: badges, nudges, manual check-in, feed, history.
11. QA on both phones and launch.
