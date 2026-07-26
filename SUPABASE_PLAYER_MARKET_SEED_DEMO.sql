-- FootballIQ Player Market MVP seed dataset (manual/demo)
-- This is demonstration seed data and requires owner verification before production sign-off.
-- Safe to rerun (upsert by slug).

begin;

insert into public.market_players (
  slug, display_name, short_name, club_name, position, nationality, active,
  current_value, previous_value, opening_season_value,
  data_source_label, source_reference, provenance_status, owner_verified,
  data_updated_at, value_updated_at
)
values
  ('lucas-vale', 'Lucas Vale', 'L. Vale', 'Northbridge FC', 'GK', 'Portugal', true, 6200000, 6100000, 5900000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('mateo-ryder', 'Mateo Ryder', 'M. Ryder', 'Kingsport Athletic', 'GK', 'Argentina', true, 7100000, 7000000, 6800000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('daniel-hart', 'Daniel Hart', 'D. Hart', 'Riverside Albion', 'GK', 'England', true, 5400000, 5400000, 5200000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('tariq-ibrahim', 'Tariq Ibrahim', 'T. Ibrahim', 'Southgate City', 'GK', 'Morocco', true, 4800000, 4700000, 4500000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('leon-costa', 'Leon Costa', 'L. Costa', 'Harbor United', 'DEF', 'Spain', true, 8600000, 8400000, 7900000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('owen-byrne', 'Owen Byrne', 'O. Byrne', 'Northbridge FC', 'DEF', 'Ireland', true, 6700000, 6800000, 6400000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('kai-mensah', 'Kai Mensah', 'K. Mensah', 'Kingsport Athletic', 'DEF', 'Ghana', true, 7300000, 7200000, 7000000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('julian-rossi', 'Julian Rossi', 'J. Rossi', 'Riverside Albion', 'DEF', 'Italy', true, 9100000, 9000000, 8500000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('milan-kovac', 'Milan Kovac', 'M. Kovac', 'Southgate City', 'DEF', 'Croatia', true, 6400000, 6500000, 6200000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('samir-latif', 'Samir Latif', 'S. Latif', 'Harbor United', 'DEF', 'Tunisia', true, 5900000, 5900000, 5600000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('noah-clarke', 'Noah Clarke', 'N. Clarke', 'Easton Rovers', 'DEF', 'England', true, 5200000, 5100000, 5000000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('yuta-saito', 'Yuta Saito', 'Y. Saito', 'Metro Stars', 'DEF', 'Japan', true, 7800000, 7600000, 7200000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('adrian-fonseca', 'Adrian Fonseca', 'A. Fonseca', 'Northbridge FC', 'MID', 'Uruguay', true, 10200000, 10000000, 9600000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('liam-murphy', 'Liam Murphy', 'L. Murphy', 'Kingsport Athletic', 'MID', 'Scotland', true, 9300000, 9200000, 8800000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('enzo-marin', 'Enzo Marin', 'E. Marin', 'Riverside Albion', 'MID', 'France', true, 11400000, 11200000, 10500000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('rafael-nunes', 'Rafael Nunes', 'R. Nunes', 'Southgate City', 'MID', 'Brazil', true, 12300000, 12000000, 11500000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('dario-petrov', 'Dario Petrov', 'D. Petrov', 'Harbor United', 'MID', 'Serbia', true, 8100000, 8200000, 7900000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('felix-adams', 'Felix Adams', 'F. Adams', 'Easton Rovers', 'MID', 'United States', true, 7600000, 7500000, 7200000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('omar-khaled', 'Omar Khaled', 'O. Khaled', 'Metro Stars', 'MID', 'Egypt', true, 9800000, 9600000, 9100000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('tomas-belik', 'Tomas Belik', 'T. Belik', 'Westhaven FC', 'MID', 'Czech Republic', true, 6800000, 6700000, 6400000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('andre-silva-jr', 'Andre Silva Jr', 'A. Silva', 'Northbridge FC', 'FWD', 'Brazil', true, 13700000, 13500000, 12800000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('matias-orozco', 'Matias Orozco', 'M. Orozco', 'Kingsport Athletic', 'FWD', 'Chile', true, 11900000, 11600000, 10800000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('ivan-keller', 'Ivan Keller', 'I. Keller', 'Riverside Albion', 'FWD', 'Germany', true, 9500000, 9400000, 9000000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('youssef-ammar', 'Youssef Ammar', 'Y. Ammar', 'Southgate City', 'FWD', 'Algeria', true, 8800000, 8700000, 8300000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('jonas-holm', 'Jonas Holm', 'J. Holm', 'Harbor United', 'FWD', 'Denmark', true, 11200000, 11000000, 10300000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('mika-reyes', 'Mika Reyes', 'M. Reyes', 'Easton Rovers', 'FWD', 'Mexico', true, 7400000, 7300000, 7000000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('hamza-benali', 'Hamza Benali', 'H. Benali', 'Metro Stars', 'FWD', 'Morocco', true, 6600000, 6500000, 6200000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('ruben-larsen', 'Ruben Larsen', 'R. Larsen', 'Westhaven FC', 'FWD', 'Norway', true, 10400000, 10200000, 9700000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('alexei-volkov', 'Alexei Volkov', 'A. Volkov', 'Coastal Wanderers', 'MID', 'Ukraine', true, 7900000, 7800000, 7400000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('joao-pires', 'Joao Pires', 'J. Pires', 'Coastal Wanderers', 'DEF', 'Portugal', true, 6100000, 6200000, 6000000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now()),
  ('sean-doyle', 'Sean Doyle', 'S. Doyle', 'Westhaven FC', 'GK', 'Ireland', true, 5000000, 4900000, 4700000, 'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now(), now())
on conflict (slug) do update set
  display_name = excluded.display_name,
  short_name = excluded.short_name,
  club_name = excluded.club_name,
  position = excluded.position,
  nationality = excluded.nationality,
  active = excluded.active,
  current_value = excluded.current_value,
  previous_value = excluded.previous_value,
  opening_season_value = excluded.opening_season_value,
  data_source_label = excluded.data_source_label,
  source_reference = excluded.source_reference,
  provenance_status = excluded.provenance_status,
  owner_verified = excluded.owner_verified,
  data_updated_at = excluded.data_updated_at,
  value_updated_at = excluded.value_updated_at,
  updated_at = now();

insert into public.market_value_history (player_id, value, reason_category, methodology_version)
select id, current_value, 'seed-opening', 'v1.0.0'
from public.market_players
where slug in (
  'lucas-vale','mateo-ryder','daniel-hart','tariq-ibrahim','leon-costa','owen-byrne','kai-mensah','julian-rossi','milan-kovac','samir-latif','noah-clarke','yuta-saito','adrian-fonseca','liam-murphy','enzo-marin','rafael-nunes','dario-petrov','felix-adams','omar-khaled','tomas-belik','andre-silva-jr','matias-orozco','ivan-keller','youssef-ammar','jonas-holm','mika-reyes','hamza-benali','ruben-larsen','alexei-volkov','joao-pires','sean-doyle'
)
and not exists (
  select 1 from public.market_value_history vh
  where vh.player_id = public.market_players.id and vh.reason_category = 'seed-opening'
);

-- Minimal demonstration stats rows. Null fields intentionally indicate unavailable or unverified metrics.
insert into public.player_season_stats (
  player_id, season, competition_label,
  appearances, starts, minutes, goals, assists, clean_sheets,
  shots, shots_on_target, chances_created, key_passes,
  tackles, interceptions, clearances, saves, goals_conceded,
  data_source, source_reference, provenance_status, owner_verified, last_verified_at
)
select id, '2026', 'Domestic League',
  case when position = 'GK' then 28 else 31 end,
  case when position = 'GK' then 28 else 27 end,
  case when position = 'GK' then 2520 else 2360 end,
  case when position = 'FWD' then 12 when position = 'MID' then 6 else null end,
  case when position = 'MID' then 7 when position = 'FWD' then 4 else null end,
  case when position in ('GK','DEF') then 10 else null end,
  case when position in ('MID','FWD') then 42 else null end,
  case when position in ('MID','FWD') then 18 else null end,
  case when position = 'MID' then 34 else null end,
  case when position = 'MID' then 46 else null end,
  case when position in ('DEF','MID') then 44 else null end,
  case when position in ('DEF','MID') then 39 else null end,
  case when position = 'DEF' then 92 else null end,
  case when position = 'GK' then 87 else null end,
  case when position = 'GK' then 35 when position = 'DEF' then 41 else null end,
  'Owner seed dataset', 'internal-seed-v1', 'owner_seed_demo', false, now()
from public.market_players
where not exists (
  select 1 from public.player_season_stats s
  where s.player_id = public.market_players.id and s.season = '2026' and s.competition_label = 'Domestic League'
);

commit;
