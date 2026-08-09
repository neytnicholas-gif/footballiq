import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSportmonksBundesligaCatalogue, buildSportmonksCombinedCatalogue, buildSportmonksLaLigaCatalogue, buildSportmonksLigue1Catalogue, buildSportmonksPremierLeagueCatalogue, buildSportmonksSerieACatalogue } from '@/lib/market/server/sportmonks-client'
import type { MarketPlayer } from '@/lib/market/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PriceBookRow = {
  provider_player_id: string
  opening_price_minor: number
  current_price_minor: number
  previous_price_minor: number
  latest_rating_milli: number | null
  value_updated_at: string
}

async function applyAuthoritativePriceBook(players: MarketPlayer[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url?.trim() || !key?.trim()) throw new Error('The authoritative market price book is not configured.')
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { data, error } = await client.rpc('market_public_price_book_v1')
  if (error) throw new Error(`The authoritative market price book is unavailable: ${error.message}`)
  const priceBook = new Map(((data ?? []) as PriceBookRow[]).map((row) => [String(row.provider_player_id), row]))
  const backed = players.flatMap((player) => {
    const row = priceBook.get(String(player.id))
    if (!row) return []
    const currentValue = Number(row.current_price_minor)
    const previousValue = Number(row.previous_price_minor)
    const latestRating = row.latest_rating_milli === null ? null : Number(row.latest_rating_milli) / 1000
    return [{
      ...player,
      opening_season_value: Number(row.opening_price_minor),
      current_value: currentValue,
      previous_value: previousValue,
      value_updated_at: row.value_updated_at,
      data_source_label: 'Sportmonks identity · FootballIQ authoritative price book',
      value_trend: currentValue > previousValue ? 'rising' as const : currentValue < previousValue ? 'falling' as const : 'flat' as const,
      decision_support_note: latestRating === null
        ? 'Opening game price. This value remains frozen until verified ratings and minutes are processed.'
        : `Latest processed Sportmonks rating: ${latestRating.toFixed(2)}. The database price book is authoritative.`,
    }]
  })
  if (backed.length === 0) throw new Error('The authoritative market price book did not match the provider catalogue.')
  return backed.sort((a, b) => b.current_value - a.current_value || a.display_name.localeCompare(b.display_name))
}

export async function GET(request: Request) {
  try {
    const competition = new URL(request.url).searchParams.get('competition')
    const catalogue = competition === 'ligue-1'
      ? await buildSportmonksLigue1Catalogue()
      : competition === 'serie-a'
      ? await buildSportmonksSerieACatalogue()
      : competition === 'bundesliga'
      ? await buildSportmonksBundesligaCatalogue()
      : competition === 'la-liga'
        ? await buildSportmonksLaLigaCatalogue()
      : competition === 'premier-league'
        ? await buildSportmonksPremierLeagueCatalogue()
        : await buildSportmonksCombinedCatalogue()
    const players = await applyAuthoritativePriceBook(catalogue.players)
    const responseCatalogue = 'competitions' in catalogue
      ? {
          ...catalogue,
          players,
          playerCount: players.length,
          competitions: catalogue.competitions.map((competitionSummary) => ({ ...competitionSummary, players: undefined })),
        }
      : { ...catalogue, players, playerCount: players.length }

    return NextResponse.json(responseCatalogue, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The verified player catalogue could not be loaded.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
