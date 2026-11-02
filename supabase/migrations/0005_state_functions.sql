-- Server-side helpers for the game-state services (techspec §7, §9.3–9.4).
-- Called only with the secret key (service_role). Never callable by clients.

-- ───────── Levels ─────────

-- Total XP to reach level L is 50·L·(L−1) (PRD 4.9). Integer maths, no drift.
create function public.level_for_xp(p_xp integer) returns integer
language sql immutable set search_path = '' as $$
  select coalesce(max(l), 1)::integer
    from generate_series(1, 2000) as l
   where 50 * l * (l - 1) <= p_xp
$$;

-- ───────── Per-player lease lock (techspec §9.4) ─────────

-- Takes the lock if it's free or expired. Returns false if someone holds it.
create function public.try_lock(p_player uuid, p_owner text, p_ttl_seconds integer default 60)
returns boolean
language plpgsql set search_path = '' as $$
begin
  insert into public.sync_state (player_id) values (p_player)
  on conflict (player_id) do nothing;

  update public.sync_state
     set lock_until = now() + make_interval(secs => p_ttl_seconds),
         lock_owner = p_owner
   where player_id = p_player
     and (lock_until is null or lock_until < now());
  return found;
end $$;

-- Releases the lock only if this owner still holds it.
create function public.release_lock(p_player uuid, p_owner text) returns void
language sql set search_path = '' as $$
  update public.sync_state
     set lock_until = null, lock_owner = null
   where player_id = p_player and lock_owner = p_owner
$$;

-- ───────── Atomic save of one player's engine result ─────────

-- Persists everything one engine call produced in a single transaction, so a
-- crash can never leave a solve counted on a day but missing from
-- submissions (or any other half-written state). Every write is an upsert or
-- insert-or-ignore, so re-running a save is harmless (CLAUDE.md invariant 6).
-- Returns the notifications that were newly logged and should now be pushed.
create function public.save_player_state(p jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_player  uuid := (p->>'player_id')::uuid;
  v_pair    uuid := (p->>'pair_id')::uuid;
  v_partner uuid := nullif(p->>'partner_id', '')::uuid;
  v_sent    jsonb := '[]'::jsonb;
  v_title   text;
  v_unlock  record;
begin
  -- Runs. Ended runs first, so the one-active-run index never sees two.
  insert into public.runs as t (
    id, pair_id, player_id, started_on, length, last_counted_day,
    tokens_remaining, restores_used, at_risk_day, ended_on, end_reason)
  select x.id, v_pair, v_player, x.started_on, x.length, x.last_counted_day,
         x.tokens_remaining, x.restores_used, x.at_risk_day, x.ended_on, x.end_reason
    from jsonb_to_recordset(coalesce(p->'runs', '[]')) as x(
      id uuid, started_on date, length integer, last_counted_day date,
      tokens_remaining integer, restores_used integer, at_risk_day date,
      ended_on date, end_reason public.run_end_reason)
   where x.ended_on is not null
  on conflict (id) do update set
    length = excluded.length, last_counted_day = excluded.last_counted_day,
    tokens_remaining = excluded.tokens_remaining, restores_used = excluded.restores_used,
    at_risk_day = excluded.at_risk_day, ended_on = excluded.ended_on,
    end_reason = excluded.end_reason;

  insert into public.runs as t (
    id, pair_id, player_id, started_on, length, last_counted_day,
    tokens_remaining, restores_used, at_risk_day, ended_on, end_reason)
  select x.id, v_pair, v_player, x.started_on, x.length, x.last_counted_day,
         x.tokens_remaining, x.restores_used, x.at_risk_day, null, null
    from jsonb_to_recordset(coalesce(p->'runs', '[]')) as x(
      id uuid, started_on date, length integer, last_counted_day date,
      tokens_remaining integer, restores_used integer, at_risk_day date,
      ended_on date)
   where x.ended_on is null
  on conflict (id) do update set
    length = excluded.length, last_counted_day = excluded.last_counted_day,
    tokens_remaining = excluded.tokens_remaining, restores_used = excluded.restores_used,
    at_risk_day = excluded.at_risk_day;

  -- Days. The target is a snapshot taken when the row is created, so an
  -- existing row's target is never overwritten (CLAUDE.md invariant 10).
  insert into public.days as t (
    pair_id, player_id, day, target, makeup_required, solved_count, status,
    run_id, completed_at, finalized_at)
  select v_pair, v_player, x.day, x.target, x.makeup_required, x.solved_count,
         x.status, x.run_id, x.completed_at, x.finalized_at
    from jsonb_to_recordset(coalesce(p->'days', '[]')) as x(
      day date, target integer, makeup_required integer, solved_count integer,
      status public.day_status, run_id uuid, completed_at timestamptz,
      finalized_at timestamptz)
  on conflict (player_id, day) do update set
    makeup_required = excluded.makeup_required,
    solved_count    = excluded.solved_count,
    status          = excluded.status,
    run_id          = excluded.run_id,
    completed_at    = excluded.completed_at,
    finalized_at    = coalesce(t.finalized_at, excluded.finalized_at);

  -- Restore requests.
  insert into public.restore_requests as t (
    id, pair_id, player_id, approver_id, run_id, missed_day, message, status,
    response_message, expires_at, created_at, responded_at)
  select x.id, v_pair, v_player, x.approver_id, x.run_id, x.missed_day, x.message,
         x.status, x.response_message, x.expires_at, x.created_at, x.responded_at
    from jsonb_to_recordset(coalesce(p->'restore_requests', '[]')) as x(
      id uuid, approver_id uuid, run_id uuid, missed_day date, message text,
      status public.restore_status, response_message text, expires_at timestamptz,
      created_at timestamptz, responded_at timestamptz)
  on conflict (id) do update set
    status           = excluded.status,
    response_message = excluded.response_message,
    responded_at     = excluded.responded_at;

  -- New submissions (already deduplicated by LeetCode id).
  insert into public.submissions (
    pair_id, player_id, source, lc_submission_id, title_slug, submitted_at,
    assigned_day, counted, is_resolve, xp)
  select v_pair, v_player, x.source, x.lc_submission_id, x.title_slug, x.submitted_at,
         x.assigned_day, x.counted, x.is_resolve, x.xp
    from jsonb_to_recordset(coalesce(p->'submissions', '[]')) as x(
      source public.submission_source, lc_submission_id text, title_slug text,
      submitted_at timestamptz, assigned_day date, counted boolean,
      is_resolve boolean, xp integer)
  on conflict (player_id, lc_submission_id) do nothing;

  -- XP, badges (a badge may belong to the partner: big_heart), milestones.
  insert into public.xp_events (pair_id, player_id, amount, reason, ref)
  select v_pair, v_player, x.amount, x.reason, x.ref
    from jsonb_to_recordset(coalesce(p->'xp_events', '[]')) as x(
      amount integer, reason text, ref text)
  on conflict (player_id, reason, ref) do nothing;

  insert into public.badges_earned (player_id, pair_id, badge_key)
  select x.player_id, v_pair, x.badge_key
    from jsonb_to_recordset(coalesce(p->'badges', '[]')) as x(
      player_id uuid, badge_key text)
  on conflict (player_id, badge_key) do nothing;

  insert into public.milestone_achievements (player_id, pair_id, milestone, run_id, achieved_on)
  select v_player, v_pair, x.milestone, x.run_id, x.achieved_on
    from jsonb_to_recordset(coalesce(p->'achievements', '[]')) as x(
      milestone integer, run_id uuid, achieved_on date)
  on conflict (player_id, milestone) do nothing;

  -- Gift unlocks: this player is the receiver, the partner the giver. With no
  -- gift chosen yet, an IOU row is created and the giver is told they owe one.
  if v_partner is not null then
    for v_unlock in
      select x.milestone
        from jsonb_to_recordset(coalesce(p->'gift_unlocks', '[]')) as x(milestone integer)
    loop
      insert into public.gifts as g (pair_id, giver_id, receiver_id, milestone, status, unlocked_at)
      values (v_pair, v_partner, v_player, v_unlock.milestone, 'unlocked', now())
      on conflict (receiver_id, milestone) do update
        set status = 'unlocked', unlocked_at = now(), updated_at = now()
        where g.status = 'locked'
      returning g.title into v_title;

      if found and v_title is null then
        with ins as (
          insert into public.notification_log (player_id, kind, dedupe_key)
          values (v_partner, 'gift_owed',
                  'gift_owed:' || v_player || ':' || v_unlock.milestone)
          on conflict (dedupe_key) do nothing
          returning player_id, kind, dedupe_key)
        select v_sent || coalesce(jsonb_agg(jsonb_build_object(
                 'player_id', ins.player_id, 'kind', ins.kind,
                 'dedupe_key', ins.dedupe_key,
                 'data', jsonb_build_object('milestone', v_unlock.milestone))), '[]')
          into v_sent
          from ins;
      end if;
    end loop;
  end if;

  -- Activity feed.
  insert into public.activity (pair_id, actor_id, kind, payload)
  select v_pair, v_player, x.kind, coalesce(x.payload, '{}')
    from jsonb_to_recordset(coalesce(p->'activity', '[]')) as x(kind text, payload jsonb);

  -- Notifications: log first with the dedupe key; only new ones are returned
  -- for sending (CLAUDE.md "Push and PWA").
  with ins as (
    insert into public.notification_log (player_id, kind, dedupe_key)
    select x.player_id, x.kind, x.dedupe_key
      from jsonb_to_recordset(coalesce(p->'notifications', '[]')) as x(
        player_id uuid, kind text, dedupe_key text)
    on conflict (dedupe_key) do nothing
    returning dedupe_key)
  select v_sent || coalesce(jsonb_agg(n), '[]')
    into v_sent
    from jsonb_array_elements(coalesce(p->'notifications', '[]')) as n
   where n->>'dedupe_key' in (select dedupe_key from ins);

  -- Profile totals: XP is the sum of its events, so it can't drift.
  update public.profiles as pr
     set xp_total    = s.total,
         level       = public.level_for_xp(s.total),
         best_streak = greatest(pr.best_streak, coalesce((p->>'best_streak')::integer, 0))
    from (select coalesce(sum(amount), 0)::integer as total
            from public.xp_events where player_id = v_player) as s
   where pr.id = v_player;

  -- Sync bookkeeping.
  insert into public.sync_state (player_id) values (v_player)
  on conflict (player_id) do nothing;

  update public.sync_state as ss set
    last_finalized_day   = coalesce((p->>'last_finalized_day')::date, ss.last_finalized_day),
    last_attempt_at      = coalesce((p->'sync'->>'attempted_at')::timestamptz, ss.last_attempt_at),
    last_success_at      = case when (p->'sync'->>'ok')::boolean
                                then (p->'sync'->>'attempted_at')::timestamptz
                                else ss.last_success_at end,
    consecutive_failures = case when p->'sync' is null then ss.consecutive_failures
                                when (p->'sync'->>'ok')::boolean then 0
                                else ss.consecutive_failures + 1 end,
    last_error           = case when p->'sync' is null then ss.last_error
                                else p->'sync'->>'error' end
   where ss.player_id = v_player;

  return jsonb_build_object('notifications', v_sent);
end $$;

-- ───────── Privileges ─────────
-- Server only: clients must never call these.
revoke all on function public.level_for_xp(integer)            from public, anon, authenticated;
revoke all on function public.try_lock(uuid, text, integer)     from public, anon, authenticated;
revoke all on function public.release_lock(uuid, text)          from public, anon, authenticated;
revoke all on function public.save_player_state(jsonb)          from public, anon, authenticated;
grant execute on function public.level_for_xp(integer)          to service_role;
grant execute on function public.try_lock(uuid, text, integer)  to service_role;
grant execute on function public.release_lock(uuid, text)       to service_role;
grant execute on function public.save_player_state(jsonb)       to service_role;
