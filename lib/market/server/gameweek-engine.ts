import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { fetchSportmonksCompletedGameweeks, type SportmonksCompletedGameweek } from '@/lib/market/server/sportmonks-client'

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url?.trim() || !key?.trim()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for verified gameweek processing.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
}

async function processBatch(admin: ReturnType<typeof adminClient>, gameweek: SportmonksCompletedGameweek) {
  const runKey = `verified-gameweek:${gameweek.gameweekKey}`
  // A completed weekly batch may receive later fixtures. The database RPC is the
  // exact-once authority, so it is safe to re-enter and apply only new rows.

  await admin.from('market_processing_runs').upsert({
    run_key: runKey, run_type: 'verified_gameweek', status: 'processing', dry_run: false,
    started_at: new Date().toISOString(), finished_at: null, report: null, error_message: null,
  }, { onConflict: 'run_key' })

  const { data, error } = await admin.rpc('market_apply_verified_gameweek', {
    p_gameweek_key: gameweek.gameweekKey,
    p_week_label: gameweek.label,
    p_week_number: gameweek.weekNumber,
    p_opens_at: gameweek.opensAt,
    p_closes_at: gameweek.closesAt,
    p_updates: gameweek.updates,
  })
  if (error) {
    await admin.from('market_processing_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: error.message }).eq('run_key', runKey)
    throw new Error(`Verified gameweek processing failed: ${error.message}`)
  }
  const report = data as Record<string, unknown>
  await admin.from('market_processing_runs').update({ status: 'completed', finished_at: new Date().toISOString(), report }).eq('run_key', runKey)
  return { unchanged: false, ...report }
}

export async function processLatestVerifiedGameweek() {
  const startedAt = Date.now()
  const gameweeks = await fetchSportmonksCompletedGameweeks()
  const admin = adminClient()
  const batches = []
  for (const gameweek of gameweeks) batches.push(await processBatch(admin, gameweek))
  const report = { batchCount: batches.length, durationMs: Date.now() - startedAt, batches }
  console.info(JSON.stringify({ event: 'market.gameweek.completed', ...report }))
  return report
}
