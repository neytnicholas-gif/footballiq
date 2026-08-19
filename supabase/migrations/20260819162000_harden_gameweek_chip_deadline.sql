begin;

-- Keep weekly chips fair even if the fixture importer has not populated the
-- public prediction list yet. A tracked kickoff always wins; Friday 17:00 in
-- Brussels is the conservative fallback for a weekend gameweek.
create or replace function public.market_gameweek_chip_deadline(p_transfer_gameweek_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with transfer_week as (
    select * from public.market_gameweeks
    where id = p_transfer_gameweek_id and gameweek_type = 'transfer'
  ), tracked_fixtures as (
    select fixture.kickoff_at
    from transfer_week week
    join public.prediction_fixtures fixture
      on fixture.kickoff_at >= week.opens_at and fixture.kickoff_at < week.closes_at
    where fixture.status not in ('postponed', 'cancelled')
      and exists (
        select 1
        from public.market_clubs club
        join public.market_players player on player.club_id = club.id and player.is_available
        where club.provider_club_id in (fixture.home_provider_team_id, fixture.away_provider_team_id)
      )
  ), safe_fallback as (
    select least(
      closes_at,
      (date_trunc('week', opens_at at time zone 'Europe/Brussels') + interval '4 days 17 hours')
        at time zone 'Europe/Brussels'
    ) as deadline_at
    from transfer_week
  )
  select least(
    (select closes_at from transfer_week),
    coalesce((select min(kickoff_at) from tracked_fixtures), (select deadline_at from safe_fallback))
  );
$$;

revoke all on function public.market_gameweek_chip_deadline(uuid)
  from public, anon, authenticated;
grant execute on function public.market_gameweek_chip_deadline(uuid) to service_role;

comment on function public.market_gameweek_chip_deadline(uuid) is
  'Returns the first tracked kickoff or a conservative Friday 17:00 Europe/Brussels fallback.';

commit;
