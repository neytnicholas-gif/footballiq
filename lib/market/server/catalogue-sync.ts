import 'server-only'

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { buildSportmonksPremierLeagueCatalogue } from '@/lib/market/server/sportmonks-client'

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

export async function syncSportmonksCatalogueToSupabase() {
  const catalogue = await buildSportmonksPremierLeagueCatalogue()
  const admin = createAdminClient()
  const seasonId = `sportmonks-${catalogue.seasonId}`
  const seasonName = catalogue.seasonName ?? String(catalogue.seasonId)
  const now = new Date().toISOString()
  const fingerprint = createHash('sha256').update(JSON.stringify(catalogue.players.map((player) => [
    player.id, player.slug, player.club_name, player.position, player.current_value,
  ]))).digest('hex')

  const { error: seasonError } = await admin.from('market_seasons').upsert({
    id: seasonId,
    name: `${catalogue.competition} ${seasonName}`,
    competition_key: 'premier-league',
    season_key: seasonName,
    ...seasonDates(seasonName),
    is_active: true,
    data_updated_at: now,
  })
  if (seasonError) throw new Error(`Season synchronization failed: ${seasonError.message}`)

  const { data: catalogueRow, error: catalogueError } = await admin.from('market_catalogues').upsert({
    season_id: seasonId,
    fingerprint,
    status: 'active',
    source_type: 'licensed_provider',
    source_reference: `sportmonks-season-${catalogue.seasonId}`,
    record_count: catalogue.players.length,
    rejected_count: 0,
    validated_at: now,
    approved_at: now,
    approved_by: 'footballiq-provider-sync',
    activated_at: now,
    updated_at: now,
  }, { onConflict: 'fingerprint' }).select('id').single()
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

  let synced = 0
  for (let offset = 0; offset < catalogue.players.length; offset += BATCH_SIZE) {
    const rows = catalogue.players.slice(offset, offset + BATCH_SIZE).map((player) => ({
      season_id: seasonId,
      club_id: clubIds.get(player.club_name),
      provider_player_id: String(player.id),
      full_name: player.display_name,
      display_name: player.display_name,
      slug: player.slug,
      position_group: player.position,
      nationality: player.nationality,
      initial_price_minor: player.opening_season_value,
      current_price_minor: player.current_value,
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
      updated_at: now,
    }))
    if (rows.some((row) => !row.club_id)) throw new Error('Catalogue contains a player whose club was not synchronized.')

    const { error } = await admin.from('market_players').upsert(rows, { onConflict: 'season_id,provider_player_id' })
    if (error) throw new Error(`Player synchronization failed: ${error.message}`)
    synced += rows.length
  }

  const { error: settingsError } = await admin.from('market_settings').update({
    active_season_id: seasonId,
    active_catalogue_id: catalogueRow.id,
  }).eq('id', 1)
  if (settingsError) throw new Error(`Market activation failed: ${settingsError.message}`)

  return { synced, competition: catalogue.competition, seasonId, seasonName, source: catalogue.provider, generatedAt: catalogue.generatedAt }
}
