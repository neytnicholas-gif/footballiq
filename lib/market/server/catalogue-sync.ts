import 'server-only'

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { buildSportmonksCombinedCatalogue } from '@/lib/market/server/sportmonks-client'
import type { SportmonksMarketCatalogue } from '@/lib/market/server/sportmonks-client'
import type { MarketPosition } from '@/lib/market/types'
import { OPENING_PRICE_METHOD_VERSION } from '@/lib/market/real-valuation'

const BATCH_SIZE = 100
const VALUE_FLOOR = 4_000_000
const VALUE_CEILING = 15_000_000

function legacyOpeningValue(position: MarketPosition, age: number | null) {
  const positionBase: Record<MarketPosition, number> = { GK: 5_500_000, DEF: 6_200_000, MID: 6_800_000, FWD: 7_200_000 }
  const ageAdjustment = age === null ? 0
    : age <= 21 ? 700_000 : age <= 24 ? 1_000_000 : age <= 28 ? 800_000
      : age <= 31 ? 300_000 : age <= 34 ? -300_000 : -700_000
  return Math.max(VALUE_FLOOR, Math.min(VALUE_CEILING, positionBase[position] + ageAdjustment))
}

function percentile(sorted: number[], fraction: number) {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)))
  return sorted[index]!
}

function validateOpeningPriceBook(catalogues: SportmonksMarketCatalogue[]) {
  const players = catalogues.flatMap((catalogue) => catalogue.players.map((player) => ({
    ...player,
    evidence: catalogue.openingPriceEvidenceByPlayerId[String(player.id)],
  })))
  if (players.length < 900) throw new Error(`Opening price book rejected: only ${players.length} players were available.`)
  const missingEvidence = players.filter((player) => !player.evidence)
  if (missingEvidence.length) throw new Error(`Opening price book rejected: ${missingEvidence.length} players have no pricing evidence.`)
  const invalid = players.filter((player) => (
    player.opening_season_value < VALUE_FLOOR
    || player.opening_season_value > VALUE_CEILING
    || player.opening_season_value % 100_000 !== 0
  ))
  if (invalid.length) throw new Error(`Opening price book rejected: ${invalid.length} values break floor, ceiling or increment rules.`)
  const unsafeFallbacks = players.filter((player) => player.evidence?.confidence === 'fallback' && player.opening_season_value > 5_200_000)
  if (unsafeFallbacks.length) throw new Error(`Opening price book rejected: ${unsafeFallbacks.length} fallback players exceed the conservative cap.`)
  const values = players.map((player) => player.opening_season_value).sort((a, b) => a - b)
  const spread = percentile(values, 0.9) - percentile(values, 0.1)
  const distinctValues = new Set(values).size
  if (spread < 2_000_000 || distinctValues < 25) {
    throw new Error(`Opening price book rejected as too compressed (${distinctValues} prices; p90-p10 ${spread}).`)
  }
  const eliteBand = [...players].sort((a, b) => b.opening_season_value - a.opening_season_value).slice(0, 25)
  if (eliteBand.some((player) => player.evidence?.confidence === 'fallback')) {
    throw new Error('Opening price book rejected: a fallback-priced player entered the elite band.')
  }
  return {
    players: players.length,
    distinctValues,
    minimum: values[0]!,
    p10: percentile(values, 0.1),
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    maximum: values.at(-1)!,
    fallbackPlayers: players.filter((player) => player.evidence?.confidence === 'fallback').length,
  }
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !serviceRoleKey?.trim()) {
    throw new Error('Supabase server credentials are not configured for catalogue synchronization.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function stableSlug(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function seasonDates(seasonName: string) {
  const startYear = Number.parseInt(seasonName.slice(0, 4), 10)
  const safeYear = Number.isFinite(startYear) ? startYear : new Date().getUTCFullYear()
  return {
    starts_at: `${safeYear}-07-01T00:00:00.000Z`,
    ends_at: `${safeYear + 1}-06-30T23:59:59.999Z`,
  }
}

async function syncLeagueCatalogue(admin: ReturnType<typeof createAdminClient>, catalogue: SportmonksMarketCatalogue) {
  const seasonId = `sportmonks-${catalogue.seasonId}`
  const seasonName = catalogue.seasonName ?? String(catalogue.seasonId)
  const now = new Date().toISOString()
  const fingerprint = createHash('sha256').update(JSON.stringify(catalogue.players.map((player) => [
    player.id, player.slug, player.club_name, player.position, player.current_value,
  ]))).digest('hex')

  const { error: seasonError } = await admin.from('market_seasons').upsert({
    id: seasonId,
    name: `${catalogue.competition} ${seasonName}`,
    competition_key: catalogue.competitionKey,
    season_key: seasonName,
    ...seasonDates(seasonName),
    is_active: true,
    data_updated_at: now,
  })
  if (seasonError) throw new Error(`Season synchronization failed: ${seasonError.message}`)

  const catalogueValues = {
    season_id: seasonId,
    fingerprint,
    status: 'active',
    source_type: 'licensed_provider',
    source_reference: `sportmonks-season-${catalogue.seasonId}`,
    record_count: catalogue.players.length,
    rejected_count: 0,
    validated_at: now,
    approved_at: now,
    approved_by: 'footballiq-automated-validation',
    activated_at: now,
    updated_at: now,
  }
  const { data: activeCatalogue, error: activeCatalogueError } = await admin.from('market_catalogues')
    .select('id').eq('season_id', seasonId).eq('status', 'active').maybeSingle()
  if (activeCatalogueError) throw new Error(`Active catalogue lookup failed: ${activeCatalogueError.message}`)
  const catalogueWrite = activeCatalogue
    ? admin.from('market_catalogues').update(catalogueValues).eq('id', activeCatalogue.id).select('id').single()
    : admin.from('market_catalogues').insert(catalogueValues).select('id').single()
  const { data: catalogueRow, error: catalogueError } = await catalogueWrite
  if (catalogueError || !catalogueRow) throw new Error(`Catalogue synchronization failed: ${catalogueError?.message ?? 'missing catalogue id'}`)

  const clubNames = [...new Set(catalogue.players.map((player) => player.club_name))]
  const clubRows = clubNames.map((name) => {
    const slug = stableSlug(name)
    return {
      season_id: seasonId,
      provider_club_id: slug,
      name,
      short_name: name,
      slug,
      primary_colour: '#10261f',
      secondary_colour: '#effcf6',
      is_active: true,
      data_updated_at: now,
      updated_at: now,
    }
  })
  const { error: clubsError } = await admin.from('market_clubs').upsert(clubRows, { onConflict: 'season_id,provider_club_id' })
  if (clubsError) throw new Error(`Club synchronization failed: ${clubsError.message}`)

  const { data: persistedClubs, error: clubReadError } = await admin.from('market_clubs')
    .select('id,name').eq('season_id', seasonId).in('name', clubNames)
  if (clubReadError) throw new Error(`Club lookup failed: ${clubReadError.message}`)
  const clubIds = new Map((persistedClubs ?? []).map((club) => [club.name, club.id]))

  const providerPlayerIds = catalogue.players.map((player) => String(player.id))
  const existingPlayers: Array<{
    id: string
    provider_player_id: string
    season_id: string
    initial_price_minor: number
    current_price_minor: number
    opening_price_method_version: string | null
  }> = []
  for (let offset = 0; offset < providerPlayerIds.length; offset += BATCH_SIZE) {
    const { data, error } = await admin.from('market_players')
      .select('id,provider_player_id,season_id,initial_price_minor,current_price_minor,opening_price_method_version')
      .in('provider_player_id', providerPlayerIds.slice(offset, offset + BATCH_SIZE))
    if (error) throw new Error(`Existing player price lookup failed: ${error.message}`)
    existingPlayers.push(...(data ?? []))
  }
  const movedPlayerIds = existingPlayers.filter((player) => player.season_id !== seasonId).map((player) => player.id)
  for (let offset = 0; offset < movedPlayerIds.length; offset += BATCH_SIZE) {
    const { error } = await admin.from('market_players').update({
      season_id: seasonId,
      catalogue_id: catalogueRow.id,
      is_available: false,
      availability_status: 'inactive',
      updated_at: now,
    }).in('id', movedPlayerIds.slice(offset, offset + BATCH_SIZE))
    if (error) throw new Error(`Transferred player reconciliation failed: ${error.message}`)
  }
  const existingPrices = new Map(existingPlayers.map((player) => [String(player.provider_player_id), {
    initial: Number(player.initial_price_minor), current: Number(player.current_price_minor),
    methodVersion: String(player.opening_price_method_version ?? 'legacy-age-position-v1'),
  }]))

  let synced = 0
  let repriced = 0
  for (let offset = 0; offset < catalogue.players.length; offset += BATCH_SIZE) {
    const rows = catalogue.players.slice(offset, offset + BATCH_SIZE).map((player) => {
      const existing = existingPrices.get(String(player.id))
      const stillOnLegacyBaseline = existing?.initial === legacyOpeningValue(player.position, player.age ?? null)
      const needsCurrentModel = !existing || stillOnLegacyBaseline || existing.methodVersion !== OPENING_PRICE_METHOD_VERSION
      const openingPrice = needsCurrentModel ? player.opening_season_value : existing.initial
      if (existing && needsCurrentModel && openingPrice !== existing.initial) repriced += 1
      const preservedMovement = existing ? existing.current - existing.initial : player.current_value - player.opening_season_value
      const currentPrice = Math.max(VALUE_FLOOR, Math.min(VALUE_CEILING, openingPrice + preservedMovement))
      const evidence = catalogue.openingPriceEvidenceByPlayerId[String(player.id)]
      if (!evidence) throw new Error(`Pricing evidence is missing for provider player ${player.id}.`)
      return ({
      season_id: seasonId,
      club_id: clubIds.get(player.club_name),
      provider_player_id: String(player.id),
      full_name: player.display_name,
      display_name: player.display_name,
      slug: player.slug,
      position_group: player.position,
      nationality: player.nationality,
      initial_price_minor: openingPrice,
      current_price_minor: currentPrice,
      is_available: player.active,
      availability_status: player.availability_status ?? 'available',
      data_updated_at: player.data_updated_at,
      catalogue_id: catalogueRow.id,
      source_type: 'licensed_provider',
      source_reference: player.source_reference,
      source_verified_at: now,
      internal_player_id: `fiq_player_${player.id}`,
      app_player_id: player.id,
      age: player.age,
      opening_price_method_version: OPENING_PRICE_METHOD_VERSION,
      opening_price_confidence: evidence.confidence,
      opening_price_evidence: evidence,
      updated_at: now,
    })})
    if (rows.some((row) => !row.club_id)) throw new Error('Catalogue contains a player whose club was not synchronized.')

    const { error } = await admin.from('market_players').upsert(rows, { onConflict: 'season_id,provider_player_id' })
    if (error) throw new Error(`Player synchronization failed: ${error.message}`)
    synced += rows.length
  }

  const { data: persistedPlayers, error: persistedPlayersError } = await admin.from('market_players')
    .select('id,provider_player_id').eq('season_id', seasonId)
  if (persistedPlayersError) throw new Error(`Player reconciliation failed: ${persistedPlayersError.message}`)
  const persistedPlayerIds = new Map((persistedPlayers ?? []).map((player) => [String(player.provider_player_id), player.id]))
  const seasonStatsRows = catalogue.players.flatMap((player) => {
    const playerId = persistedPlayerIds.get(String(player.id))
    const evidence = catalogue.openingPriceEvidenceByPlayerId[String(player.id)]
    if (!playerId || !evidence) return []
    const input = evidence.source_inputs
    const ratedMatches = input.average_rating === null ? 0 : input.appearances
    return [{
      player_id: playerId,
      season_id: seasonId,
      rated_matches: ratedMatches,
      appearances: input.appearances,
      starts: input.starts,
      minutes_played: input.minutes,
      rating_sum_milli: input.average_rating === null ? 0 : Math.round(input.average_rating * 1_000 * ratedMatches),
      average_rating_milli: input.average_rating === null ? null : Math.round(input.average_rating * 1_000),
      goals: input.goals,
      assists: input.assists,
      clean_sheets: input.clean_sheets,
      yellow_cards: 0,
      red_cards: 0,
      source_through_at: now,
      updated_at: now,
    }]
  })
  for (let offset = 0; offset < seasonStatsRows.length; offset += BATCH_SIZE) {
    const { error } = await admin.from('player_season_stats')
      .upsert(seasonStatsRows.slice(offset, offset + BATCH_SIZE), { onConflict: 'player_id' })
    if (error) throw new Error(`Player evidence synchronization failed: ${error.message}`)
  }
  const currentProviderIds = new Set(catalogue.players.map((player) => String(player.id)))
  const stalePlayerIds = (persistedPlayers ?? [])
    .filter((player) => !currentProviderIds.has(String(player.provider_player_id)))
    .map((player) => player.id)
  for (let offset = 0; offset < stalePlayerIds.length; offset += BATCH_SIZE) {
    const { error } = await admin.from('market_players').update({
      is_available: false,
      availability_status: 'inactive',
      updated_at: now,
    }).in('id', stalePlayerIds.slice(offset, offset + BATCH_SIZE))
    if (error) throw new Error(`Stale player deactivation failed: ${error.message}`)
  }

  const { error: activationError } = await admin.from('market_active_catalogues').upsert({
    catalogue_id: catalogueRow.id,
    season_id: seasonId,
    competition_key: catalogue.competitionKey,
    activated_at: now,
  }, { onConflict: 'catalogue_id' })
  if (activationError) throw new Error(`Catalogue activation failed: ${activationError.message}`)

  return { synced, repriced, deactivated: stalePlayerIds.length, competition: catalogue.competition, seasonId, seasonName, source: catalogue.provider, generatedAt: catalogue.generatedAt }
}

export async function syncSportmonksCatalogueToSupabase() {
  const admin = createAdminClient()
  const startedAt = new Date().toISOString()
  const runKey = `catalogue-sync-${Date.now()}-${crypto.randomUUID()}`
  const { data: run, error: runError } = await admin.from('market_processing_runs').insert({
    run_key: runKey,
    run_type: 'catalogue_sync',
    status: 'running',
    dry_run: false,
    started_at: startedAt,
    report: {},
  }).select('id').single()
  if (runError) throw new Error(`Catalogue audit run could not start: ${runError.message}`)

  try {
    const combined = await buildSportmonksCombinedCatalogue()
    const pricingAudit = validateOpeningPriceBook(combined.competitions)
    const results = []
    for (const catalogue of combined.competitions) results.push(await syncLeagueCatalogue(admin, catalogue))
    const { data: portfolioRefresh, error: refreshError } = await admin.rpc('market_refresh_all_portfolios_after_catalogue_sync')
    if (refreshError) throw new Error(`Portfolio refresh after catalogue sync failed: ${refreshError.message}`)
    const result = {
      synced: results.reduce((total, item) => total + item.synced, 0),
      repriced: results.reduce((total, item) => total + item.repriced, 0),
      competition: combined.competition,
      generatedAt: combined.generatedAt,
      pricingAudit,
      portfolioRefresh,
      competitions: results,
    }
    await admin.from('market_processing_runs').update({
      status: 'completed',
      finished_at: new Date().toISOString(),
      report: result,
      error_message: null,
    }).eq('id', run.id)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Catalogue synchronization failed.'
    await admin.from('market_processing_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: message,
    }).eq('id', run.id)
    throw error
  }
}
