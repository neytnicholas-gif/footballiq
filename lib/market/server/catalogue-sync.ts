import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { buildSportmonksPremierLeagueCatalogue } from '@/lib/market/server/sportmonks-client'
import type { Database } from '@/lib/supabase/types'

const BATCH_SIZE = 100

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !serviceRoleKey?.trim()) {
    throw new Error('Supabase server credentials are not configured for catalogue synchronization.')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function syncSportmonksCatalogueToSupabase() {
  const catalogue = await buildSportmonksPremierLeagueCatalogue()
  const admin = createAdminClient()
  let synced = 0

  for (let offset = 0; offset < catalogue.players.length; offset += BATCH_SIZE) {
    const rows = catalogue.players.slice(offset, offset + BATCH_SIZE).map((player) => ({
      slug: player.slug,
      display_name: player.display_name,
      short_name: player.short_name,
      club_name: player.club_name,
      position: player.position,
      nationality: player.nationality,
      age: player.age,
      active: player.active,
      current_value: player.current_value,
      previous_value: player.previous_value,
      opening_season_value: player.opening_season_value,
      value_updated_at: player.value_updated_at,
      data_updated_at: player.data_updated_at,
      data_source_label: player.data_source_label,
      source_reference: player.source_reference,
      provenance_status: player.provenance_status,
      owner_verified: player.owner_verified,
      is_trade_locked: player.is_trade_locked,
      trade_lock_reason: player.trade_lock_reason,
      trade_lock_ends_at: player.trade_lock_ends_at,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await admin.from('market_players').upsert(rows, { onConflict: 'slug' })
    if (error) throw new Error(`Catalogue synchronization failed: ${error.message}`)
    synced += rows.length
  }

  return {
    synced,
    competition: catalogue.competition,
    seasonId: catalogue.seasonId,
    seasonName: catalogue.seasonName,
    source: catalogue.provider,
    generatedAt: catalogue.generatedAt,
  }
}
