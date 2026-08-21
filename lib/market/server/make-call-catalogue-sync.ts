import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildMakeCallCatalogue,
  MAKE_CALL_GENERATED_ROUNDS,
  type MakeCallCatalogueSourcePlayer,
} from '@/lib/make-call-catalogue'

const COMPETITIONS = [
  ['premier-league', 'Premier League'],
  ['la-liga', 'La Liga'],
  ['ligue-1', 'Ligue 1'],
] as const
const WRITE_BATCH = 100

type CatalogueRow = {
  provider_player_id: string
  slug: string
  display_name: string
  club_name: string
  competition_key: string
  competition_name: string
  position_group: 'GK' | 'DEF' | 'MID' | 'FWD'
  current_price_minor: number
}

export async function syncMakeCallCatalogueToSupabase(admin: SupabaseClient) {
  const sourcePlayers: MakeCallCatalogueSourcePlayer[] = []
  for (const [competitionKey, competitionName] of COMPETITIONS) {
    const { data, error } = await admin.rpc('market_public_catalogue_v1', { p_competition_key: competitionKey })
    if (error) throw new Error(`Make the Call source catalogue failed for ${competitionName}: ${error.message}`)
    sourcePlayers.push(...((data ?? []) as CatalogueRow[]).map((player) => ({
      sourceId: `${player.competition_key}:${player.provider_player_id}`,
      stablePlayerId: player.slug,
      displayName: player.display_name,
      clubName: player.club_name,
      competitionKey: player.competition_key,
      competitionName: player.competition_name || competitionName,
      position: player.position_group,
      currentValue: Number(player.current_price_minor),
    })))
  }

  const rounds = buildMakeCallCatalogue(sourcePlayers, MAKE_CALL_GENERATED_ROUNDS)
  const { error: deactivateError } = await admin.from('make_call_matchups')
    .update({ status: 'inactive', updated_at: new Date().toISOString() })
    .like('slug', 'call-%')
  if (deactivateError) throw new Error(`Old Make the Call rounds could not be retired: ${deactivateError.message}`)

  for (let offset = 0; offset < rounds.length; offset += WRITE_BATCH) {
    const batch = rounds.slice(offset, offset + WRITE_BATCH)
    const { error } = await admin.from('make_call_matchups').upsert(batch.map((round) => ({
      id: round.id,
      slug: round.slug,
      prompt: round.prompt,
      status: 'active',
      sort_order: round.sortOrder,
      updated_at: new Date().toISOString(),
    })), { onConflict: 'id' })
    if (error) throw new Error(`Make the Call round synchronization failed: ${error.message}`)
  }

  const players = rounds.flatMap((round) => round.players.map((player) => ({
    id: player.id,
    matchup_id: round.id,
    stable_player_id: player.stablePlayerId,
    display_name: player.displayName,
    short_name: player.shortName,
    club_name: player.clubName,
    position_label: player.positionLabel,
    initials: player.initials,
    accent_from: player.accentFrom,
    accent_to: player.accentTo,
    display_order: player.displayOrder,
  })))
  for (let offset = 0; offset < players.length; offset += WRITE_BATCH) {
    const { error } = await admin.from('make_call_players')
      .upsert(players.slice(offset, offset + WRITE_BATCH), { onConflict: 'id' })
    if (error) throw new Error(`Make the Call player synchronization failed: ${error.message}`)
  }

  const { count: generatedCount, error: generatedCountError } = await admin.from('make_call_matchups')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .like('slug', 'call-%')
  if (generatedCountError) throw new Error(`Make the Call catalogue verification failed: ${generatedCountError.message}`)
  const { count: openingCount, error: openingCountError } = await admin.from('make_call_matchups')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('slug', 'mbappe-haaland-yamal')
  if (openingCountError) throw new Error(`Make the Call opening round verification failed: ${openingCountError.message}`)
  const activeRounds = (generatedCount ?? 0) + (openingCount ?? 0)
  if (activeRounds !== MAKE_CALL_GENERATED_ROUNDS + 1) {
    throw new Error(`Make the Call catalogue verification expected 500 active rounds and found ${activeRounds}.`)
  }

  return { activeRounds, generatedRounds: rounds.length, sourcePlayers: sourcePlayers.length }
}
