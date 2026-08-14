begin;

-- Make roster visibility an explicit choice instead of overloading the
-- aggregate Market-statistics switch. Existing accounts remain public by
-- default so the product's fair-play behavior does not change silently.
alter table public.market_profile_preferences
  add column if not exists show_roster boolean not null default true;

create or replace function public.market_update_profile_preferences(
  p_show_badges boolean,
  p_show_market_stats boolean,
  p_show_roster boolean,
  p_show_activity boolean
) returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '3s'
set lock_timeout = '1s'
as $$
declare
  uid uuid := auth.uid();
  result public.market_profile_preferences;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;

  insert into public.market_profile_preferences(
    user_id, show_badges, show_market_stats, show_roster, show_activity
  ) values (
    uid, coalesce(p_show_badges, true), coalesce(p_show_market_stats, true),
    coalesce(p_show_roster, true), coalesce(p_show_activity, false)
  )
  on conflict (user_id) do update set
    show_badges = excluded.show_badges,
    show_market_stats = excluded.show_market_stats,
    show_roster = excluded.show_roster,
    show_activity = excluded.show_activity,
    updated_at = now()
  returning * into result;

  return to_jsonb(result);
end;
$$;

revoke all on function public.market_update_profile_preferences(boolean, boolean, boolean, boolean)
from public, anon, authenticated;
grant execute on function public.market_update_profile_preferences(boolean, boolean, boolean, boolean)
to authenticated;

create or replace function public.market_public_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
set statement_timeout = '3s'
as $$
  with target as (
    select id, username, rating, xp, quizzes_completed, perfect_quizzes,
      current_streak, longest_streak, created_at
    from public.profiles
    where lower(username) = lower(p_username) and username is not null
    limit 1
  ),
  prefs as (
    select
      coalesce(pp.show_badges, true) show_badges,
      coalesce(pp.show_market_stats, true) show_market_stats,
      coalesce(pp.show_roster, true) show_roster,
      coalesce(pp.show_activity, false) show_activity,
      pp.active_background, pp.active_avatar, pp.active_frame, pp.active_title,
      coalesce(pp.active_formation, '4-3-3') active_formation
    from target t
    left join public.market_profile_preferences pp on pp.user_id = t.id
  ),
  portfolio as (
    select p.*
    from target t
    left join public.market_portfolios p on p.user_id = t.id
    order by p.created_at desc
    limit 1
  )
  select coalesce((
    select to_jsonb(t) || jsonb_build_object(
      'preferences', (select to_jsonb(prefs) from prefs),
      'market_stats', case when (select show_market_stats from prefs) then (
        select jsonb_build_object(
          'total_account_value', p.total_portfolio_value_minor,
          'realised_profit', p.realised_profit_minor,
          'trades', (select count(*) from public.market_transactions x where x.portfolio_id = p.id)
        )
        from portfolio p
      ) else null end,
      'badges', case when (select show_badges from prefs) then coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', d.challenge_key, 'name', d.badge_name, 'title', d.title, 'icon_key', d.icon_key
        ) order by c.showcased_order)
        from public.market_user_challenges c
        join public.market_challenge_definitions d on d.challenge_key = c.challenge_key
        where c.user_id = t.id and c.showcased
      ), '[]'::jsonb) else null end,
      'roster', case when (select show_roster from prefs) then coalesce((
        select jsonb_agg(jsonb_build_object(
          'player_id', mp.app_player_id, 'slug', mp.slug, 'name', mp.display_name,
          'club', club.name, 'position', mp.position_group, 'value', mp.current_price_minor
        ) order by
          case mp.position_group when 'GK' then 1 when 'DEF' then 2 when 'MID' then 3 else 4 end,
          mp.display_name
        )
        from portfolio p
        join public.market_holdings h on h.portfolio_id = p.id
        join public.market_players mp on mp.id = h.player_id
        join public.market_clubs club on club.id = mp.club_id
      ), '[]'::jsonb) else null end
    )
    from target t
  ), null::jsonb)
$$;

revoke all on function public.market_public_profile(text) from public, anon, authenticated;
grant execute on function public.market_public_profile(text) to anon, authenticated;

-- Repair stale URLs written before Unicode marks were transliterated. The
-- temporary two-phase rewrite avoids transient unique-key collisions.
create temporary table market_slug_repairs on commit drop as
with normalized as (
  select
    player.id,
    player.season_id,
    player.provider_player_id,
    player.slug old_slug,
    trim(both '-' from regexp_replace(
      lower(regexp_replace(normalize(
        replace(replace(replace(replace(replace(replace(replace(replace(
          player.display_name,
          U&'\00C6', 'AE'), U&'\00E6', 'ae'), U&'\0152', 'OE'), U&'\0153', 'oe'),
          U&'\00D8', 'O'), U&'\00F8', 'o'), U&'\00DF', 'ss'), U&'\0131', 'i'),
        NFD
      ), U&'[\0300-\036F]', '', 'g')),
      '[^a-z0-9]+', '-', 'g'
    )) || case
      when active.competition_key = 'premier-league' then ''
      else '-' || active.competition_key
    end candidate
  from public.market_players player
  join public.market_active_catalogues active
    on active.catalogue_id = player.catalogue_id
   and active.season_id = player.season_id
),
ranked as (
  select normalized.*,
    count(*) over (partition by season_id, candidate) duplicate_count,
    row_number() over (
      partition by season_id, candidate
      order by provider_player_id, id
    ) duplicate_rank
  from normalized
)
select
  id,
  old_slug,
  case
    when duplicate_count = 1 or duplicate_rank = 1 then candidate
    else candidate || '-' || regexp_replace(lower(provider_player_id), '[^a-z0-9]+', '-', 'g')
  end new_slug
from ranked;

do $$
begin
  if exists (
    select 1
    from market_slug_repairs repair
    join public.market_players player on player.id = repair.id
    group by player.season_id, repair.new_slug
    having count(*) > 1
  ) then
    raise exception 'PLAYER_SLUG_REPAIR_COLLISION';
  end if;
end
$$;

update public.market_players player
set slug = 'slug-repair-' || replace(player.id::text, '-', '')
from market_slug_repairs repair
where player.id = repair.id
  and repair.old_slug is distinct from repair.new_slug;

update public.market_players player
set slug = repair.new_slug,
    updated_at = now()
from market_slug_repairs repair
where player.id = repair.id
  and repair.old_slug is distinct from repair.new_slug;

commit;
