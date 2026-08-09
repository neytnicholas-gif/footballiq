export type MarketPosition = 'GK' | 'DEF' | 'MID' | 'FWD'

export type ProvenanceStatus =
  | 'verified'
  | 'owner_seed_demo'
  | 'pending_licence_review'
  | 'unverified'

export type MarketPlayer = {
  id: number
  slug: string
  display_name: string
  short_name: string | null
  club_name: string
  competition_key?: 'premier-league' | 'la-liga' | string
  competition_name?: string
  position: MarketPosition
  age?: number | null
  nationality: string | null
  active: boolean
  current_value: number
  previous_value: number
  opening_season_value: number
  value_updated_at: string
  data_updated_at: string
  data_source_label: string
  source_reference: string | null
  provenance_status: string
  owner_verified: boolean
  is_trade_locked: boolean
  trade_lock_reason: string | null
  trade_lock_started_at: string | null
  trade_lock_ends_at: string | null
  value_trend?: 'rising' | 'falling' | 'flat'
  recent_form_indicator?: 'hot' | 'steady' | 'cool'
  role_security_indicator?: 'secure' | 'rotation' | 'risk'
  availability_status?: 'available' | 'limited' | 'unavailable'
  decision_support_note?: string
  matchweek_performance_history?: Array<{
    week: number
    rating: number
    minutes: number
  }>
  created_at: string
  updated_at: string
}

export type MarketSeasonStats = {
  id: number
  player_id: number
  season: string
  competition_label: string
  appearances: number | null
  starts: number | null
  minutes: number | null
  goals: number | null
  assists: number | null
  clean_sheets: number | null
  yellow_cards: number | null
  red_cards: number | null
  shots: number | null
  shots_on_target: number | null
  chances_created: number | null
  key_passes: number | null
  passes_completed: number | null
  pass_accuracy: number | null
  tackles: number | null
  interceptions: number | null
  clearances: number | null
  blocks: number | null
  saves: number | null
  goals_conceded: number | null
  expected_goals: number | null
  expected_assists: number | null
  average_rating: number | null
  data_source: string
  source_reference: string | null
  provenance_status: string
  owner_verified: boolean
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type MarketHolding = {
  id: number
  user_id: string
  player_id: number
  acquisition_value: number
  acquired_at: string
  current_value_snapshot: number
  unrealized_profit_loss: number
}

export type MarketPortfolio = {
  user_id: string
  available_balance: number
  starting_balance: number
  portfolio_value: number
  total_account_value: number
  realized_profit_loss: number
  created_at: string
  updated_at: string
}

export type MarketTransaction = {
  id: number
  transaction_id: string
  user_id: string
  player_id: number
  transaction_type: 'buy' | 'sell'
  execution_value: number
  balance_before: number
  balance_after: number
  created_at: string
  trade_date_utc: string
  idempotency_key: string
}

export type MarketGameweekStatus = {
  gameweek_id: string
  gameweek_key: string
  week_number: number
  label: string
  state: 'open' | 'processing' | 'revealed' | 'closed' | 'failed'
  opens_at: string
  closes_at: string
  signings_used: number
  signings_remaining: number
  sales_count: number
  maximum_signings: 11
}

export type MarketValueHistoryPoint = {
  id: number
  player_id: number
  value: number
  recorded_at: string
  reason_category: string
  methodology_version: string
  created_at: string
}

export type MarketLeaderboardRow = {
  user_id: string
  username: string
  total_account_value: number
  all_time_gain: number
  daily_gain: number
  weekly_gain: number
  monthly_gain: number
  season_gain: number
  daily_return_pct: number
  weekly_return_pct: number
  monthly_return_pct: number
  season_return_pct: number
  all_time_return_pct: number
}

export type MarketFriendLeague = {
  id: number
  league_code: string
  name: string
  owner_user_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MarketFriendLeagueMember = {
  league_id: number
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export type MarketFriendLeagueLeaderboardRow = {
  league_id: number
  league_name: string
  league_code: string
  owner_user_id: string
  user_id: string
  username: string | null
  total_account_value: number
  realized_profit_loss: number
  portfolio_value: number
  rank: number
}

export type MarketMatchweekRun = {
  id: number
  initiated_by: string
  week_number: number
  week_label: string
  processed_players: number
  biggest_winner_player_id: number | null
  biggest_winner_delta: number
  biggest_loser_player_id: number | null
  biggest_loser_delta: number
  weekly_portfolio_gain: number
  current_roi_pct: number
  total_profit_since_start: number
  created_at: string
}

export type MarketMatchweekApplyResult = {
  ok: boolean
  week_number: number
  week_label: string
  processed_players: number
  biggest_winner: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  biggest_loser: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  weekly_portfolio_gain: number
  current_roi_pct: number
  total_profit_since_start: number
  portfolio_before: number
  portfolio_after: number
}

export type MarketRevealHoldingMovement = {
  player_id: number
  player_name: string
  position: MarketPosition
  purchase_price: number
  previous_value: number
  current_value: number
  delta: number
  return_pct: number
  explanation: string
}

export type MarketRevealSummary = {
  scope_key: string
  week_number: number
  week_label: string
  completed_at: string
  previous_portfolio_value: number
  new_portfolio_value: number
  weekly_change: number
  weekly_return_pct: number
  biggest_winner: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  biggest_loser: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  best_held_player: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  weakest_held_player: {
    player_id: number | null
    player_name: string | null
    delta: number
  }
  cash_after: number
  invested_after: number
  total_after: number
  holdings: MarketRevealHoldingMovement[]
}

export type MarketAnonymousState = {
  version: 1
  cash: number
  watchlist: number[]
  holdings: Array<{
    id: number
    player_id: number
    acquisition_value: number
    acquired_at: string
    current_value_snapshot: number
    unrealized_profit_loss: number
    acquired_week: number
  }>
  transactions: Array<{
    id: number
    transaction_id: string
    player_id: number
    transaction_type: 'buy' | 'sell'
    execution_value: number
    balance_before: number
    balance_after: number
    created_at: string
    trade_date_utc: string
    idempotency_key: string
    matchweek: number
    realized_profit_loss: number | null
  }>
  runs: MarketMatchweekRun[]
  reveals: MarketRevealSummary[]
  player_overrides: Record<string, { previous_value: number; current_value: number; updated_at: string }>
  last_updated_at: string
}

export type MarketStatsInput = {
  position: MarketPosition
  appearances?: number | null
  starts?: number | null
  minutes?: number | null
  goals?: number | null
  assists?: number | null
  clean_sheets?: number | null
  saves?: number | null
  goals_conceded?: number | null
  tackles?: number | null
  interceptions?: number | null
  clearances?: number | null
  shots?: number | null
  shots_on_target?: number | null
  chances_created?: number | null
  key_passes?: number | null
  pass_accuracy?: number | null
  recent_form_score?: number | null
  consistency_score?: number | null
  role_security_score?: number | null
  age_potential_score?: number | null
  market_demand_score?: number | null
  provenance_status?: ProvenanceStatus
  owner_verified?: boolean
}
