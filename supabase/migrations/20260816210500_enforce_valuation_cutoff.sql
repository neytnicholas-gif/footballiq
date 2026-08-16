begin;

-- Defence in depth: even a future service bug or manual RPC call cannot import
-- a match before the published launch boundary. The importer also filters at
-- source, but this trigger is the database authority.
create or replace function public.market_enforce_valuation_cutoff()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  eligible_from timestamptz;
begin
  select settings.valuation_eligible_from into eligible_from
  from public.market_settings settings
  where settings.id = 1;

  if eligible_from is null or new.fixture_date < eligible_from then
    raise exception 'FIXTURE_BEFORE_VALUATION_BOUNDARY'
      using errcode = 'P0001', hint = 'No player value was changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists market_match_stats_require_eligible_fixture
  on public.market_player_match_stats;
create trigger market_match_stats_require_eligible_fixture
before insert or update of fixture_date on public.market_player_match_stats
for each row execute function public.market_enforce_valuation_cutoff();

revoke all on function public.market_enforce_valuation_cutoff()
from public, anon, authenticated;

comment on function public.market_enforce_valuation_cutoff() is
  'Rejects valuation evidence dated before market_settings.valuation_eligible_from.';

commit;
