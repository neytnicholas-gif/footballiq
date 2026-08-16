import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { MarketPlayer } from '@/lib/market/types'
import { MARKET_CATALOGUE_CACHE_TAG } from '@/lib/market/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PublicCatalogueRow = {
  provider_player_id: string
  app_player_id: number
  slug: string
  display_name: string
  club_name: string
  competition_key: string
  competition_name: string
  position_group: MarketPlayer['position']
  age: number | null
  nationality: string | null
  opening_price_minor: number
  current_price_minor: number
  ownership_percentage: number | string | null
  previous_price_minor: number
  latest_rating_milli: number | null
  availability_status: MarketPlayer['availability_status']
  data_updated_at: string
  is_trade_locked: boolean
  trade_lock_reason: string | null
  trade_lock_started_at: string | null
  trade_lock_ends_at: string | null
}

type PublicCataloguePlayer = Pick<MarketPlayer,
  | 'id' | 'slug' | 'display_name' | 'club_name' | 'competition_key'
  | 'competition_name' | 'position' | 'age' | 'nationality'
  | 'opening_season_value' | 'current_value' | 'previous_value'
  | 'ownership_percentage' | 'value_updated_at' | 'availability_status' | 'recent_form_indicator'
  | 'is_trade_locked' | 'trade_lock_reason' | 'trade_lock_started_at' | 'trade_lock_ends_at'
>

const SUPPORTED_COMPETITIONS = ['premier-league', 'la-liga', 'ligue-1'] as const

async function loadAuthoritativeCatalogue(competition: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) throw new Error('The authoritative market catalogue is not configured.')
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  if (competition && !SUPPORTED_COMPETITIONS.includes(competition as typeof SUPPORTED_COMPETITIONS[number])) {
    throw new Error('The requested competition is not supported.')
  }
  const keys = competition ? [competition] : [...SUPPORTED_COMPETITIONS]
  const results = await Promise.all(keys.map((key) => client.rpc('market_public_catalogue_v1', {
    p_competition_key: key,
  })))
  const failed = results.find((result) => result.error)
  if (failed?.error) throw new Error(`The authoritative player catalogue is unavailable: ${failed.error.message}`)
  const rows = results.flatMap((result) => (result.data ?? []) as PublicCatalogueRow[])
  const players = rows.map((row): PublicCataloguePlayer => {
    const currentValue = Number(row.current_price_minor)
    const previousValue = Number(row.previous_price_minor)
    const latestRating = row.latest_rating_milli === null ? null : Number(row.latest_rating_milli) / 1000
    return {
      id: Number(row.app_player_id),
      slug: row.slug,
      display_name: row.display_name,
      club_name: row.club_name,
      competition_key: row.competition_key,
      competition_name: row.competition_name,
      position: row.position_group,
      age: row.age,
      nationality: row.nationality,
      opening_season_value: Number(row.opening_price_minor),
      current_value: currentValue,
      ownership_percentage: Math.max(0, Math.min(100, Number(row.ownership_percentage ?? 0))),
      previous_value: previousValue,
      value_updated_at: row.data_updated_at,
      availability_status: row.availability_status ?? 'available',
      is_trade_locked: Boolean(row.is_trade_locked),
      trade_lock_reason: row.trade_lock_reason,
      trade_lock_started_at: row.trade_lock_started_at,
      trade_lock_ends_at: row.trade_lock_ends_at,
      recent_form_indicator: latestRating === null ? 'steady' : latestRating >= 7.5 ? 'hot' : latestRating < 6.5 ? 'cool' : 'steady',
    }
  })
  if (players.length === 0) throw new Error('The authoritative player catalogue is empty.')
  return players.sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name))
}

const loadCachedAuthoritativeCatalogue = unstable_cache(
  loadAuthoritativeCatalogue,
  ['market-public-catalogue-v2-canonical-slugs'],
  { revalidate: 60, tags: [MARKET_CATALOGUE_CACHE_TAG] },
)

export async function GET(request: Request) {
  const startedAt = Date.now()
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID()
  try {
    const competition = new URL(request.url).searchParams.get('competition')
    const players = await loadCachedAuthoritativeCatalogue(competition)
    const grouped = new Map<string, { key: string; name: string; playerCount: number }>()
    for (const player of players) {
      const key = player.competition_key ?? 'unknown'
      const current = grouped.get(key)
      grouped.set(key, {
        key,
        name: player.competition_name ?? key,
        playerCount: (current?.playerCount ?? 0) + 1,
      })
    }
    return NextResponse.json({
      source: 'early-shout-game-price-book',
      generatedAt: new Date().toISOString(),
      players,
      playerCount: players.length,
      competitions: Array.from(grouped.values()),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        'CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60',
        'X-Early-Shout-Request-Id': requestId,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The verified player catalogue could not be loaded.'
    console.error(JSON.stringify({
      event: 'market.catalogue.failed',
      requestId,
      durationMs: Date.now() - startedAt,
      error: message,
    }))
    return NextResponse.json({
      error: 'The verified player catalogue is temporarily unavailable. Trading data was not substituted.',
      requestId,
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'private, no-store',
        'Retry-After': '30',
        'X-Early-Shout-Request-Id': requestId,
      },
    })
  }
}
