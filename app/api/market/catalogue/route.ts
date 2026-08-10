import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import type { MarketPlayer } from '@/lib/market/types'

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
  previous_price_minor: number
  latest_rating_milli: number | null
  availability_status: MarketPlayer['availability_status']
  data_updated_at: string
  source_reference: string | null
}

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
  const players = rows.map((row): MarketPlayer => {
    const currentValue = Number(row.current_price_minor)
    const previousValue = Number(row.previous_price_minor)
    const latestRating = row.latest_rating_milli === null ? null : Number(row.latest_rating_milli) / 1000
    return {
      id: Number(row.app_player_id),
      slug: row.slug,
      display_name: row.display_name,
      short_name: null,
      club_name: row.club_name,
      competition_key: row.competition_key,
      competition_name: row.competition_name,
      position: row.position_group,
      age: row.age,
      nationality: row.nationality,
      active: true,
      opening_season_value: Number(row.opening_price_minor),
      current_value: currentValue,
      previous_value: previousValue,
      value_updated_at: row.data_updated_at,
      data_updated_at: row.data_updated_at,
      data_source_label: 'Sportmonks identity · FootballIQ authoritative price book',
      source_reference: row.source_reference,
      provenance_status: 'verified',
      owner_verified: true,
      is_trade_locked: false,
      trade_lock_reason: null,
      trade_lock_started_at: null,
      trade_lock_ends_at: null,
      availability_status: row.availability_status ?? 'available',
      value_trend: currentValue > previousValue ? 'rising' : currentValue < previousValue ? 'falling' : 'flat',
      recent_form_indicator: latestRating === null ? 'steady' : latestRating >= 7.5 ? 'hot' : latestRating < 6.5 ? 'cool' : 'steady',
      role_security_indicator: 'rotation',
      decision_support_note: latestRating === null
        ? 'Opening game price. This value remains frozen until verified ratings and minutes are processed.'
        : `Latest processed Sportmonks rating: ${latestRating.toFixed(2)}. The database price book is authoritative.`,
      matchweek_performance_history: [],
      created_at: row.data_updated_at,
      updated_at: row.data_updated_at,
    }
  })
  if (players.length === 0) throw new Error('The authoritative player catalogue is empty.')
  return players.sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name))
}

const loadCachedAuthoritativeCatalogue = unstable_cache(
  loadAuthoritativeCatalogue,
  ['market-public-catalogue-v1'],
  { revalidate: 300, tags: ['market-public-catalogue'] },
)

export async function GET(request: Request) {
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
      source: 'database-verified-sportmonks',
      generatedAt: new Date().toISOString(),
      players,
      playerCount: players.length,
      competitions: Array.from(grouped.values()),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The verified player catalogue could not be loaded.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
