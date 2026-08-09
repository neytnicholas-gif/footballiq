-- Keep authenticated ownership checks constant per statement rather than per row.
alter policy market_portfolios_owner_read on public.market_portfolios
  using ((select auth.uid()) = user_id);

alter policy market_holdings_owner_read on public.market_holdings
  using (
    exists (
      select 1
      from public.market_portfolios p
      where p.id = market_holdings.portfolio_id
        and p.user_id = (select auth.uid())
    )
  );

alter policy market_transactions_owner_read on public.market_transactions
  using (
    exists (
      select 1
      from public.market_portfolios p
      where p.id = market_transactions.portfolio_id
        and p.user_id = (select auth.uid())
    )
  );

alter policy market_daily_limits_owner_read on public.market_daily_limits
  using (
    exists (
      select 1
      from public.market_portfolios p
      where p.id = market_daily_limits.portfolio_id
        and p.user_id = (select auth.uid())
    )
  );

alter policy "Users can insert their own profile" on public.profiles
  with check ((select auth.uid()) = id);

alter policy "Users can read own predictions" on public.predictions
  using ((select auth.uid()) = user_id);

alter policy "Users can insert own predictions" on public.predictions
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own predictions" on public.predictions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The public quiz-results SELECT policy already grants the same reads. Removing the
-- redundant owner policy preserves access while avoiding duplicate policy work.
drop policy if exists "Users can read own quiz results" on public.quiz_results;

-- Index every currently unindexed foreign-key side reported by Database Advisor.
create index if not exists market_friend_leagues_owner_user_id_idx
  on public.market_friend_leagues (owner_user_id);
create index if not exists market_gameweek_reveals_gameweek_id_idx
  on public.market_gameweek_reveals (gameweek_id);
create index if not exists market_manual_value_requests_admin_user_id_idx
  on public.market_manual_value_requests (admin_user_id);
create index if not exists market_manual_value_requests_player_id_idx
  on public.market_manual_value_requests (player_id);
create index if not exists market_manual_value_requests_valuation_event_id_idx
  on public.market_manual_value_requests (valuation_event_id);
create index if not exists market_player_match_stats_opponent_club_id_idx
  on public.market_player_match_stats (opponent_club_id);
create index if not exists market_portfolios_season_id_idx
  on public.market_portfolios (season_id);
create index if not exists market_settings_active_catalogue_id_idx
  on public.market_settings (active_catalogue_id);
create index if not exists market_settings_active_season_id_idx
  on public.market_settings (active_season_id);
create index if not exists market_transactions_player_id_idx
  on public.market_transactions (player_id);
create index if not exists market_valuation_events_match_stat_id_idx
  on public.market_valuation_events (match_stat_id);
create index if not exists market_watchlist_player_id_idx
  on public.market_watchlist (player_id);
