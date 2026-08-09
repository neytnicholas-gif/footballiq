begin;

create or replace function public.market_ensure_current_gameweek()
returns public.market_gameweeks language plpgsql security definer set search_path=pg_catalog,public
as $$
declare g public.market_gameweeks; monday date; next_monday date; week_no integer;
begin
  select * into g from public.market_current_gameweek();
  if g.id is not null then return g; end if;
  perform pg_advisory_xact_lock(hashtextextended('market-current-gameweek',0));
  select * into g from public.market_current_gameweek();
  if g.id is not null then return g; end if;
  monday := ((now() at time zone 'Europe/Brussels')::date - ((extract(isodow from now() at time zone 'Europe/Brussels')::integer)-1));
  next_monday := monday + 7;
  select coalesce(max(week_number),0)+1 into week_no from public.market_gameweeks;
  insert into public.market_gameweeks(gameweek_key,week_number,label,state,opens_at,closes_at)
  values ('fiq-'||to_char(monday,'IYYY-IW'),week_no,'Gameweek '||week_no,'open',monday::timestamp at time zone 'Europe/Brussels',next_monday::timestamp at time zone 'Europe/Brussels')
  on conflict (gameweek_key) do update set updated_at=now()
  returning * into g;
  return g;
end $$;

commit;
