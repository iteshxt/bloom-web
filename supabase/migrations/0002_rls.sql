-- Row Level Security and realtime. Source of truth: docs/techspec.md §6.1–6.2.
-- The client is read-only: every policy is select-only, and all writes go
-- through /api/* with the secret key.

create function public.my_pair_id() returns uuid
language sql stable security definer set search_path = public as $$
  select pair_id from profiles where id = auth.uid()
$$;

-- Enable RLS on every table
alter table pairs                  enable row level security;
alter table profiles               enable row level security;
alter table daily_targets          enable row level security;
alter table problems               enable row level security;
alter table runs                   enable row level security;
alter table days                   enable row level security;
alter table submissions            enable row level security;
alter table restore_requests       enable row level security;
alter table milestone_achievements enable row level security;
alter table gifts                  enable row level security;
alter table xp_events              enable row level security;
alter table badges_earned          enable row level security;
alter table nudges                 enable row level security;
alter table activity               enable row level security;
alter table push_subscriptions     enable row level security;
alter table notification_log       enable row level security;
alter table sync_state             enable row level security;

create policy "read own pair"     on pairs    for select to authenticated using (id = my_pair_id());
create policy "read pair members" on profiles for select to authenticated using (id = auth.uid() or pair_id = my_pair_id());

create policy "read pair rows" on days                   for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on runs                   for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on submissions            for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on daily_targets          for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on restore_requests       for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on milestone_achievements for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on xp_events              for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on badges_earned          for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on nudges                 for select to authenticated using (pair_id = my_pair_id());
create policy "read pair rows" on activity               for select to authenticated using (pair_id = my_pair_id());
create policy "read problems"  on problems               for select to authenticated using (true);

-- No client policies (server only):
--   gifts               masked by GET /api/gifts until revealed
--   push_subscriptions, notification_log, sync_state

-- Realtime (techspec §6.2): the client subscribes with pair_id=eq.<pairId>
alter publication supabase_realtime add table
  days, runs, restore_requests, activity, profiles, daily_targets, badges_earned;
