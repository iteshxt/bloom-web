-- Bloom schema. Source of truth: docs/techspec.md §6.
-- Never edit after it has been applied; add a new migration instead.

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
