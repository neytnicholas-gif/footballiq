export type MarketChallenge = {
  challenge_key: string
  title: string
  description: string
  badge_name: string
  icon_key: string
  target: number
  reward_credits: number
  progress: number
  completed_at: string | null
  showcased: boolean
  showcased_order: number | null
}

export type MarketRewardItem = {
  item_key: string
  item_type: 'background' | 'avatar' | 'frame' | 'formation'
  name: string
  description: string
  price_credits: number
  required_trades: number
  required_reveals: number
  owned: boolean
  purchased_at: string | null
}

export type MarketProfilePreferences = {
  show_badges: boolean
  show_market_stats: boolean
  show_activity: boolean
  active_background: string | null
  active_avatar: string | null
  active_frame: string | null
  active_formation: '4-3-3' | '3-4-3'
}

export type MarketProgression = {
  wallet: { balance: number; lifetime_earned: number; lifetime_spent: number }
  preferences: MarketProfilePreferences
  trade_count: number
  reveal_count: number
  challenges: MarketChallenge[]
  store: MarketRewardItem[]
}

export const EMPTY_MARKET_PROGRESSION: MarketProgression = {
  wallet: { balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
  preferences: {
    show_badges: true,
    show_market_stats: true,
    show_activity: false,
    active_background: null,
    active_avatar: null,
    active_frame: null,
    active_formation: '4-3-3',
  },
  trade_count: 0,
  reveal_count: 0,
  challenges: [],
  store: [],
}

export function rewardItemUnlocked(item: MarketRewardItem, progression: MarketProgression) {
  return progression.trade_count >= item.required_trades && progression.reveal_count >= item.required_reveals
}

export function challengePercent(challenge: MarketChallenge) {
  return Math.min(100, Math.round((challenge.progress / challenge.target) * 100))
}

