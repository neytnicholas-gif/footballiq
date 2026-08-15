-- Covers fixture-side joins and cascades for private prediction league rounds.
-- The complementary (league_id, round_key) index serves league-first reads.
create index if not exists prediction_league_fixtures_fixture_idx
  on public.prediction_league_fixtures(fixture_id);
