-- Cover the remaining market foreign keys reported by the Supabase performance advisor.
create index if not exists market_arena_matches_gameweek_id_idx
  on public.market_arena_matches(gameweek_id);

create index if not exists market_arena_matches_winner_user_id_idx
  on public.market_arena_matches(winner_user_id)
  where winner_user_id is not null;

create index if not exists market_profile_preferences_active_title_idx
  on public.market_profile_preferences(active_title)
  where active_title is not null;

create index if not exists market_scout_notes_player_id_idx
  on public.market_scout_notes(player_id);
