begin;

-- Keep the transfer calendar unambiguous. Expired windows are historical and
-- must not continue to present as open in operational checks or admin tooling.
create or replace function public.market_ensure_current_gameweek()
returns public.market_gameweeks
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  g public.market_gameweeks;
  monday date;
  next_monday date;
  week_no integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('market-current-gameweek', 0));

  update public.market_gameweeks
  set state = 'closed', updated_at = now()
  where gameweek_type = 'transfer'
    and state = 'open'
    and closes_at <= now();

  select * into g from public.market_current_gameweek();
  if g.id is not null then return g; end if;

  monday := (
    (now() at time zone 'Europe/Brussels')::date
    - ((extract(isodow from now() at time zone 'Europe/Brussels')::integer) - 1)
  );
  next_monday := monday + 7;

  select coalesce(max(week_number), 0) + 1
  into week_no
  from public.market_gameweeks
  where gameweek_type = 'transfer';

  insert into public.market_gameweeks(
    gameweek_key, week_number, label, state, opens_at, closes_at, gameweek_type
  ) values (
    'fiq-' || to_char(monday, 'IYYY-IW'),
    week_no,
    'Gameweek ' || week_no,
    'open',
    monday::timestamp at time zone 'Europe/Brussels',
    next_monday::timestamp at time zone 'Europe/Brussels',
    'transfer'
  )
  on conflict (gameweek_key) do update
    set state = case
          when public.market_gameweeks.closes_at > now() then 'open'
          else public.market_gameweeks.state
        end,
        updated_at = now()
  returning * into g;

  return g;
end;
$$;

revoke all on function public.market_ensure_current_gameweek() from public, anon, authenticated;
grant execute on function public.market_ensure_current_gameweek() to service_role;

-- Reconcile historical state immediately when this migration is installed.
update public.market_gameweeks
set state = 'closed', updated_at = now()
where gameweek_type = 'transfer'
  and state = 'open'
  and closes_at <= now();

comment on function public.market_ensure_current_gameweek() is
  'Returns or creates the current Brussels transfer week and closes expired transfer windows atomically.';

commit;
