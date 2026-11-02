-- Fixes from the Supabase security and performance advisors after 0001–0002.
-- Source of truth: docs/techspec.md §6.1 and §6.4.

-- ───────── Security ─────────

-- function_search_path_mutable: pin the trigger function's search_path.
create or replace function public.enforce_pair_size() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.pair_id is not null and
     (select count(*) from public.profiles where pair_id = new.pair_id and id <> new.id) >= 2 then
    raise exception 'pair is full';
  end if;
  return new;
end $$;

-- anon_security_definer_function_executable: signed-out callers have no pair.
-- `authenticated` keeps EXECUTE because every RLS policy calls my_pair_id().
revoke execute on function public.my_pair_id() from public, anon;

-- ───────── Performance ─────────

-- auth_rls_initplan: wrap auth.uid() and my_pair_id() in a sub-select so they
-- run once per statement instead of once per row.
alter policy "read own pair"     on pairs    using (id = (select my_pair_id()));
alter policy "read pair members" on profiles
  using (id = (select auth.uid()) or pair_id = (select my_pair_id()));

alter policy "read pair rows" on days                   using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on runs                   using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on submissions            using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on daily_targets          using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on restore_requests       using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on milestone_achievements using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on xp_events              using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on badges_earned          using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on nudges                 using (pair_id = (select my_pair_id()));
alter policy "read pair rows" on activity               using (pair_id = (select my_pair_id()));

-- unindexed_foreign_keys: index pair_id where RLS and realtime filter on it,
-- and player_id where the server looks rows up (or cascades) by player.
create index on daily_targets          (pair_id);
create index on days                   (pair_id);
create index on runs                   (pair_id);
create index on submissions            (pair_id);
create index on restore_requests       (pair_id);
create index on milestone_achievements (pair_id);
create index on xp_events              (pair_id);
create index on badges_earned          (pair_id);
create index on nudges                 (pair_id);
create index on gifts                  (pair_id);
create index on push_subscriptions     (player_id);
create index on notification_log       (player_id);
