import 'server-only'

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { buildSportmonksCombinedCatalogue } from '@/lib/market/server/sportmonks-client'
import type { SportmonksMarketCatalogue } from '@/lib/market/server/sportmonks-client'
import { retryCatalogueOperation, shouldRecoverCatalogueSync } from '@/lib/market/catalogue-recovery'
import { resolveOpeningPricePersistence } from '@/lib/market/opening-price-persistence'
import { validateOpeningPriceBook } from '@/lib/market/opening-price-validation'
import type { OpeningPriceConfidence } from '@/lib/market/real-valuation'

const BATCH_SIZE = 100

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
    approved_by: 'early-shout-automated-validation',
    activated_at: now,
    updated_at: now,
  }
  const { data: activeCatalogue, error: activeCatalogueError } = await admin.from('market_catalogues')
    .select('id,status,fingerprint').eq('season_id', seasonId).eq('status', 'active').maybeSingle()
  if (activeCatalogueError) throw new Error(`Active catalogue lookup failed: ${activeCatalogueError.message}`)
  let catalogueRow = activeCatalogue
  if (!catalogueRow) {
    const { data: stagedCatalogue, error: stagedLookupError } = await admin.from('market_catalogues')
      .select('id,status,fingerprint').eq('season_id', seasonId).eq('fingerprint', fingerprint).maybeSingle()
    if (stagedLookupError) throw new Error(`Staged catalogue lookup failed: ${stagedLookupError.message}`)
    catalogueRow = stagedCatalogue
  }
  if (!catalogueRow) {
    const { data: stagedCatalogue, error: stagedInsertError } = await admin.from('market_catalogues').insert({
      ...catalogueValues,
      status: 'validated',
      approved_at: null,
      approved_by: null,
      activated_at: null,
    }).select('id,status,fingerprint').single()
    if (stagedInsertError || !stagedCatalogue) {
      throw new Error(`Catalogue staging failed: ${stagedInsertError?.message ?? 'missing catalogue id'}`)
    }
    catalogueRow = stagedCatalogue
  }

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
    opening_price_confidence: OpeningPriceConfidence
    opening_price_evidence: unknown
  }> = []
  for (let offset = 0; offset < providerPlayerIds.length; offset += BATCH_SIZE) {
    const { data, error } = await admin.from('market_players')
      .select('id,provider_player_id,season_id,initial_price_minor,current_price_minor,opening_price_method_version,opening_price_confidence,opening_price_evidence')
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
    confidence: player.opening_price_confidence,
    evidence: player.opening_price_evidence,
  }]))

  let synced = 0
  let repriced = 0
  for (let offset = 0; offset < catalogue.players.length; offset += BATCH_SIZE) {
    const rows = catalogue.players.slice(offset, offset + BATCH_SIZE).map((player) => {
      const existing = existingPrices.get(String(player.id))
      const evidence = catalogue.openingPriceEvidenceByPlayerId[String(player.id)]
      if (!evidence) throw new Error(`Pricing evidence is missing for provider player ${player.id}.`)
      const resolved = resolveOpeningPricePersistence({
        existing,
        candidate: { value: player.opening_season_value, confidence: evidence.confidence, evidence },
        candidateCurrentPrice: player.current_value,
        position: player.position,
        age: player.age ?? null,
      })
      if (resolved.repriced) repriced += 1
      return ({
      season_id: seasonId,
      club_id: clubIds.get(player.club_name),
      provider_player_id: String(player.id),
      full_name: player.display_name,
      display_name: player.display_name,
      slug: player.slug,
      position_group: player.position,
      nationality: player.nationality,
      initial_price_minor: resolved.openingPrice,
      current_price_minor: resolved.currentPrice,
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
      opening_price_method_version: resolved.methodVersion,
      opening_price_confidence: resolved.confidence,
      opening_price_evidence: resolved.evidence,
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

  const { error: catalogueCommitError } = await admin.from('market_catalogues')
    .update(catalogueValues).eq('id', catalogueRow.id)
  if (catalogueCommitError) throw new Error(`Catalogue commit failed: ${catalogueCommitError.message}`)

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
  const staleCutoff = new Date(Date.now() - 15 * 60 * 1_000).toISOString()
  const { error: staleRunError } = await admin.from('market_processing_runs').update({
    status: 'failed',
    finished_at: startedAt,
    error_message: 'Catalogue synchronization exceeded 15 minutes and was closed before automatic recovery.',
    report: { recoverable: true, failure_stage: 'stale_run_recovery' },
  }).eq('run_type', 'catalogue_sync').eq('status', 'running').lt('started_at', staleCutoff)
  if (staleRunError) throw new Error(`Stale catalogue run recovery failed: ${staleRunError.message}`)

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
    const pricingPlayers = combined.competitions.flatMap((catalogue) => catalogue.players.map((player) => {
      const evidence = catalogue.openingPriceEvidenceByPlayerId[String(player.id)]
      if (!evidence) throw new Error(`Opening price book rejected: provider player ${player.id} has no pricing evidence.`)
      return { position: player.position, openingValue: player.opening_season_value, confidence: evidence.confidence }
    }))
    const pricingAudit = validateOpeningPriceBook(pricingPlayers)
    const results = []
    for (const catalogue of combined.competitions) {
      const attempted = await retryCatalogueOperation(() => syncLeagueCatalogue(admin, catalogue), 1, 750)
      if (attempted.attempts > 1) {
        console.warn(JSON.stringify({
          event: 'market.catalogue_sync.recovered_after_retry',
          competition: catalogue.competition,
          attempts: attempted.attempts,
          run_key: runKey,
        }))
      }
      results.push({ ...attempted.value, attempts: attempted.attempts })
    }
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
    const { error: failureWriteError } = await admin.from('market_processing_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: message,
      report: {
        recoverable: true,
        failure_stage: 'catalogue_sync',
        message,
        recovery: 'The daily gameweek job retries the latest failed catalogue sync; a manual rerun is also safe because every write is idempotent.',
      },
    }).eq('id', run.id)
    console.error(JSON.stringify({
      event: 'market.catalogue_sync.failed',
      run_key: runKey,
      run_id: run.id,
      error: message,
      recoverable: true,
      audit_write_error: failureWriteError?.message ?? null,
    }))
    throw error
  }
}

export async function recoverLatestFailedCatalogueSync() {
  const admin = createAdminClient()
  const { data: latest, error } = await admin.from('market_processing_runs')
    .select('status,started_at')
    .eq('run_type', 'catalogue_sync')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Catalogue recovery check failed: ${error.message}`)
  if (!shouldRecoverCatalogueSync(latest)) return { attempted: false, reason: 'latest_catalogue_sync_is_healthy' }

  const result = await syncSportmonksCatalogueToSupabase()
  return { attempted: true, result }
}
