-- The former global unique index allowed only one active provider catalogue.
-- The combined market needs one active catalogue per competition season.
drop index if exists public.market_catalogues_one_active_idx;
create unique index if not exists market_catalogues_one_active_per_season_idx
  on public.market_catalogues(season_id)
  where status = 'active';
