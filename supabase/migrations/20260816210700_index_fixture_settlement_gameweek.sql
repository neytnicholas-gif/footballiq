-- Keep gameweek settlement lookups and cascading deletes indexed as the
-- fixture audit trail grows during beta.
create index if not exists market_fixture_settlements_gameweek_idx
  on public.market_fixture_settlements (gameweek_id);
