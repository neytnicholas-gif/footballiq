-- Prediction coverage is discovered from the licensed Sportmonks token at
-- runtime. Remove the original three-league prototype guards and keep the
-- database boundary tied to the authoritative competition catalogue.

alter table public.prediction_fixtures
  drop constraint if exists prediction_fixtures_league_key_check;

alter table public.prediction_fixtures
  drop constraint if exists prediction_fixtures_league_key_fkey;

alter table public.prediction_fixtures
  add constraint prediction_fixtures_league_key_fkey
  foreign key (league_key)
  references public.prediction_competitions(league_key)
  on update cascade
  on delete restrict;

alter table public.prediction_leagues
  drop constraint if exists prediction_leagues_league_keys_check;

alter table public.prediction_leagues
  drop constraint if exists prediction_leagues_league_keys_check1;

alter table public.prediction_leagues
  add constraint prediction_leagues_league_keys_check
  check (cardinality(league_keys) between 1 and 30);
