export type MarketArenaProfile = {
  skill_rating: number
  matches_played: number
  wins: number
  draws: number
  losses: number
  current_streak: number
  best_streak: number
}

export type MarketArenaQueue = {
  gameweek_id: string
  gameweek_label: string
  joined_at: string
  skill_rating: number
}

export type MarketArenaMatch = {
  id: string
  status: 'pending' | 'completed' | 'cancelled'
  gameweek_label: string
  created_at: string
  completed_at: string | null
  my_return_pct: number | null
  opponent_return_pct: number | null
  won: boolean | null
  draw: boolean
  opponent_name: string
  rating_before: number
}

export type MarketArenaState = {
  profile: MarketArenaProfile
  has_pass: boolean
  has_full_xi: boolean
  queue: MarketArenaQueue | null
  matches: MarketArenaMatch[]
}

export const EMPTY_MARKET_ARENA: MarketArenaState = {
  profile: { skill_rating: 1000, matches_played: 0, wins: 0, draws: 0, losses: 0, current_streak: 0, best_streak: 0 },
  has_pass: false,
  has_full_xi: false,
  queue: null,
  matches: [],
}
