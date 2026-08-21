-- Make the Call: private vote storage, transactional XP and gated community results.
-- Browser roles receive no direct table or function access. The server verifies the
-- Supabase access token (when present) and calls these functions with service_role.

create table public.make_call_matchups (
  id uuid primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  prompt text not null default 'START ONE. BENCH ONE. SELL ONE.',
  status text not null default 'inactive' check (status in ('active', 'inactive', 'scheduled')),
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.make_call_players (
  id uuid primary key,
  matchup_id uuid not null references public.make_call_matchups(id) on delete cascade,
  stable_player_id text not null check (stable_player_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  short_name text not null check (char_length(short_name) between 2 and 40),
  club_name text not null check (char_length(club_name) between 2 and 80),
  position_label text not null check (char_length(position_label) between 2 and 24),
  initials text not null check (char_length(initials) between 1 and 3),
  accent_from text not null check (accent_from ~ '^#[0-9A-Fa-f]{6}$'),
  accent_to text not null check (accent_to ~ '^#[0-9A-Fa-f]{6}$'),
  display_order smallint not null check (display_order between 1 and 3),
  created_at timestamptz not null default now(),
  unique (matchup_id, stable_player_id),
  unique (matchup_id, display_order),
  unique (matchup_id, id)
);

create table public.make_call_votes (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references public.make_call_matchups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  guest_session_hash text,
  start_player_id uuid not null,
  bench_player_id uuid not null,
  sell_player_id uuid not null,
  xp_awarded smallint not null default 0 check (xp_awarded in (0, 5)),
  xp_awarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is not null) <> (guest_session_hash is not null)),
  check (guest_session_hash is null or guest_session_hash ~ '^[0-9a-f]{64}$'),
  check (start_player_id <> bench_player_id and start_player_id <> sell_player_id and bench_player_id <> sell_player_id),
  check ((xp_awarded = 0 and xp_awarded_at is null) or (xp_awarded = 5 and xp_awarded_at is not null)),
  foreign key (matchup_id, start_player_id) references public.make_call_players(matchup_id, id),
  foreign key (matchup_id, bench_player_id) references public.make_call_players(matchup_id, id),
  foreign key (matchup_id, sell_player_id) references public.make_call_players(matchup_id, id)
);

create unique index make_call_votes_user_matchup_idx
  on public.make_call_votes(matchup_id, user_id) where user_id is not null;
create index make_call_votes_user_idx
  on public.make_call_votes(user_id) where user_id is not null;
create unique index make_call_votes_guest_matchup_idx
  on public.make_call_votes(matchup_id, guest_session_hash) where guest_session_hash is not null;
create index make_call_matchups_active_idx
  on public.make_call_matchups(status, starts_at, ends_at, sort_order);
create index make_call_players_matchup_idx
  on public.make_call_players(matchup_id, display_order);
create index make_call_votes_matchup_start_idx
  on public.make_call_votes(matchup_id, start_player_id);
create index make_call_votes_matchup_bench_idx
  on public.make_call_votes(matchup_id, bench_player_id);
create index make_call_votes_matchup_sell_idx
  on public.make_call_votes(matchup_id, sell_player_id);
create index make_call_votes_user_xp_day_idx
  on public.make_call_votes(user_id, xp_awarded_at) where user_id is not null and xp_awarded = 5;

alter table public.make_call_matchups enable row level security;
alter table public.make_call_players enable row level security;
alter table public.make_call_votes enable row level security;

revoke all on table public.make_call_matchups, public.make_call_players, public.make_call_votes
  from public, anon, authenticated, service_role;
grant all on table public.make_call_matchups, public.make_call_players, public.make_call_votes
  to service_role;

create function public.make_call_results_private(p_matchup_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with players as (
    select id from public.make_call_players where matchup_id = p_matchup_id
  ), totals as (
    select count(*)::integer as sample_size
    from public.make_call_votes where matchup_id = p_matchup_id
  )
  select jsonb_build_object(
    'sample_size', totals.sample_size,
    'start_counts', coalesce((
      select jsonb_object_agg(players.id::text, coalesce(votes.amount, 0))
      from players
      left join (
        select start_player_id as player_id, count(*)::integer as amount
        from public.make_call_votes where matchup_id = p_matchup_id group by start_player_id
      ) votes on votes.player_id = players.id
    ), '{}'::jsonb),
    'bench_counts', coalesce((
      select jsonb_object_agg(players.id::text, coalesce(votes.amount, 0))
      from players
      left join (
        select bench_player_id as player_id, count(*)::integer as amount
        from public.make_call_votes where matchup_id = p_matchup_id group by bench_player_id
      ) votes on votes.player_id = players.id
    ), '{}'::jsonb),
    'sell_counts', coalesce((
      select jsonb_object_agg(players.id::text, coalesce(votes.amount, 0))
      from players
      left join (
        select sell_player_id as player_id, count(*)::integer as amount
        from public.make_call_votes where matchup_id = p_matchup_id group by sell_player_id
      ) votes on votes.player_id = players.id
    ), '{}'::jsonb)
  )
  from totals
$$;

create function public.get_make_call_game_private(
  p_matchup_slug text default null,
  p_user_id uuid default null,
  p_guest_session_hash text default null,
  p_exclude_matchup_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  selected_matchup public.make_call_matchups%rowtype;
  existing_vote public.make_call_votes%rowtype;
  players_payload jsonb;
  results_payload jsonb;
  exact_count integer;
  daily_xp integer := 0;
begin
  select * into selected_matchup
  from public.make_call_matchups
  where status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and (p_matchup_slug is null or slug = p_matchup_slug)
    and (p_exclude_matchup_id is null or id <> p_exclude_matchup_id)
    and (
      p_matchup_slug is not null
      or not exists (
        select 1 from public.make_call_votes completed
        where completed.matchup_id = make_call_matchups.id
          and ((p_user_id is not null and completed.user_id = p_user_id)
            or (p_user_id is null and p_guest_session_hash is not null and completed.guest_session_hash = p_guest_session_hash))
      )
    )
  order by sort_order, created_at, id
  limit 1;

  if selected_matchup.id is null then
    return jsonb_build_object('matchup', null);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'stable_player_id', stable_player_id,
    'display_name', display_name,
    'short_name', short_name,
    'club_name', club_name,
    'position_label', position_label,
    'initials', initials,
    'accent_from', accent_from,
    'accent_to', accent_to
  ) order by display_order), '[]'::jsonb)
  into players_payload
  from public.make_call_players where matchup_id = selected_matchup.id;

  select * into existing_vote
  from public.make_call_votes
  where matchup_id = selected_matchup.id
    and ((p_user_id is not null and user_id = p_user_id)
      or (p_guest_session_hash is not null and guest_session_hash = p_guest_session_hash))
  order by case when user_id is not null then 0 else 1 end
  limit 1;

  if p_user_id is not null then
    select coalesce(sum(xp_awarded), 0)::integer into daily_xp
    from public.make_call_votes
    where user_id = p_user_id
      and xp_awarded_at is not null
      and (xp_awarded_at at time zone 'Europe/Brussels')::date = (now() at time zone 'Europe/Brussels')::date;
  end if;

  if existing_vote.id is not null then
    results_payload := public.make_call_results_private(selected_matchup.id);
    select count(*)::integer into exact_count
    from public.make_call_votes
    where matchup_id = selected_matchup.id
      and start_player_id = existing_vote.start_player_id
      and bench_player_id = existing_vote.bench_player_id
      and sell_player_id = existing_vote.sell_player_id;
    results_payload := results_payload || jsonb_build_object('exact_count', exact_count);
  end if;

  return jsonb_build_object(
    'matchup', jsonb_build_object(
      'id', selected_matchup.id,
      'slug', selected_matchup.slug,
      'prompt', selected_matchup.prompt,
      'players', players_payload
    ),
    'vote', case when existing_vote.id is null then null else jsonb_build_object(
      'start_player_id', existing_vote.start_player_id,
      'bench_player_id', existing_vote.bench_player_id,
      'sell_player_id', existing_vote.sell_player_id
    ) end,
    'results', results_payload,
    'xp', jsonb_build_object('daily_total', daily_xp, 'daily_cap', 15)
  );
end;
$$;

create function public.submit_make_call_vote_private(
  p_matchup_id uuid,
  p_start_player_id uuid,
  p_bench_player_id uuid,
  p_sell_player_id uuid,
  p_user_id uuid default null,
  p_guest_session_hash text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  selected_matchup public.make_call_matchups%rowtype;
  current_vote public.make_call_votes%rowtype;
  guest_vote public.make_call_votes%rowtype;
  valid_players integer;
  daily_xp integer := 0;
  awarded_now integer := 0;
  response_payload jsonb;
begin
  if p_user_id is null and (p_guest_session_hash is null or p_guest_session_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'A valid player session is required';
  end if;
  if p_start_player_id = p_bench_player_id
    or p_start_player_id = p_sell_player_id
    or p_bench_player_id = p_sell_player_id then
    raise exception 'Start, bench and sell must use three different players';
  end if;

  select * into selected_matchup
  from public.make_call_matchups
  where id = p_matchup_id
  for update;
  if selected_matchup.id is null then raise exception 'Matchup was not found'; end if;
  if selected_matchup.status <> 'active'
    or (selected_matchup.starts_at is not null and selected_matchup.starts_at > now())
    or (selected_matchup.ends_at is not null and selected_matchup.ends_at <= now()) then
    raise exception 'This matchup is no longer open';
  end if;

  select count(*)::integer into valid_players
  from public.make_call_players
  where matchup_id = p_matchup_id
    and id in (p_start_player_id, p_bench_player_id, p_sell_player_id);
  if valid_players <> 3 then raise exception 'Every selected player must belong to this matchup'; end if;

  if p_user_id is not null then
    if not exists (select 1 from auth.users where id = p_user_id) then
      raise exception 'Authenticated player was not found';
    end if;

    insert into public.profiles(id) values (p_user_id) on conflict (id) do nothing;
    perform 1 from public.profiles where id = p_user_id for update;

    select * into current_vote from public.make_call_votes
    where matchup_id = p_matchup_id and user_id = p_user_id for update;

    if p_guest_session_hash is not null then
      select * into guest_vote from public.make_call_votes
      where matchup_id = p_matchup_id and guest_session_hash = p_guest_session_hash for update;
    end if;

    if current_vote.id is not null then
      update public.make_call_votes set
        start_player_id = p_start_player_id,
        bench_player_id = p_bench_player_id,
        sell_player_id = p_sell_player_id,
        updated_at = now()
      where id = current_vote.id;
      if guest_vote.id is not null then delete from public.make_call_votes where id = guest_vote.id; end if;
    elsif guest_vote.id is not null then
      update public.make_call_votes set
        user_id = p_user_id,
        guest_session_hash = null,
        start_player_id = p_start_player_id,
        bench_player_id = p_bench_player_id,
        sell_player_id = p_sell_player_id,
        updated_at = now()
      where id = guest_vote.id;
    else
      select coalesce(sum(xp_awarded), 0)::integer into daily_xp
      from public.make_call_votes
      where user_id = p_user_id
        and xp_awarded_at is not null
        and (xp_awarded_at at time zone 'Europe/Brussels')::date = (now() at time zone 'Europe/Brussels')::date;
      awarded_now := case when daily_xp <= 10 then 5 else 0 end;

      insert into public.make_call_votes(
        matchup_id, user_id, start_player_id, bench_player_id, sell_player_id, xp_awarded, xp_awarded_at
      ) values (
        p_matchup_id, p_user_id, p_start_player_id, p_bench_player_id, p_sell_player_id,
        awarded_now, case when awarded_now = 5 then now() else null end
      );

      if awarded_now = 5 then
        update public.profiles set xp = xp + awarded_now, updated_at = now() where id = p_user_id;
        insert into public.mode_stats(user_id, mode, xp, quizzes_completed)
        values (p_user_id, 'start-bench-sell', awarded_now, 1)
        on conflict (user_id, mode) do update set
          xp = public.mode_stats.xp + excluded.xp,
          quizzes_completed = public.mode_stats.quizzes_completed + 1,
          updated_at = now();
      end if;
    end if;
  else
    insert into public.make_call_votes(
      matchup_id, guest_session_hash, start_player_id, bench_player_id, sell_player_id
    ) values (
      p_matchup_id, p_guest_session_hash, p_start_player_id, p_bench_player_id, p_sell_player_id
    )
    on conflict (matchup_id, guest_session_hash) where guest_session_hash is not null do update set
      start_player_id = excluded.start_player_id,
      bench_player_id = excluded.bench_player_id,
      sell_player_id = excluded.sell_player_id,
      updated_at = now();
  end if;

  response_payload := public.get_make_call_game_private(
    selected_matchup.slug, p_user_id, p_guest_session_hash, null
  );
  return response_payload || jsonb_build_object('xp_awarded_now', awarded_now);
end;
$$;

revoke all on function public.make_call_results_private(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_make_call_game_private(text, uuid, text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.submit_make_call_vote_private(uuid, uuid, uuid, uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.make_call_results_private(uuid) to service_role;
grant execute on function public.get_make_call_game_private(text, uuid, text, uuid) to service_role;
grant execute on function public.submit_make_call_vote_private(uuid, uuid, uuid, uuid, uuid, text) to service_role;

insert into public.make_call_matchups(id, slug, prompt, status, sort_order)
values ('10000000-0000-4000-8000-000000000001', 'mbappe-haaland-yamal', 'START ONE. BENCH ONE. SELL ONE.', 'active', 10)
on conflict (id) do update set slug = excluded.slug, prompt = excluded.prompt, updated_at = now();

insert into public.make_call_players(
  id, matchup_id, stable_player_id, display_name, short_name, club_name, position_label,
  initials, accent_from, accent_to, display_order
) values
  ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'kylian-mbappe', 'Kylian Mbappé', 'Mbappé', 'Real Madrid', 'Forward', 'KM', '#173B73', '#E8C65B', 1),
  ('10000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'erling-haaland', 'Erling Haaland', 'Haaland', 'Manchester City', 'Forward', 'EH', '#79BFE8', '#5A2A8A', 2),
  ('10000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'lamine-yamal', 'Lamine Yamal', 'Yamal', 'FC Barcelona', 'Forward', 'LY', '#7B1639', '#184A9A', 3)
on conflict (id) do update set
  display_name = excluded.display_name,
  short_name = excluded.short_name,
  club_name = excluded.club_name,
  position_label = excluded.position_label,
  initials = excluded.initials,
  accent_from = excluded.accent_from,
  accent_to = excluded.accent_to,
  display_order = excluded.display_order;

comment on table public.make_call_votes is
  'One current Start/Bench/Sell call per matchup and authenticated user or privacy-preserving guest-session hash.';
comment on function public.get_make_call_game_private(text, uuid, text, uuid) is
  'Server-only game snapshot. Community counts are omitted until this identity has voted.';
comment on function public.submit_make_call_vote_private(uuid, uuid, uuid, uuid, uuid, text) is
  'Server-only transactional vote upsert, guest migration and replay-safe capped XP award.';
