-- Keep the expanded prediction catalogue fast and remove a superseded public
-- quiz-results policy. Public leaderboard pages now use narrow RPCs, while a
-- signed-in player may read only their own raw quiz history.

create index if not exists prediction_fixtures_league_key_idx
  on public.prediction_fixtures(league_key);

drop policy if exists "Quiz results are publicly readable" on public.quiz_results;

