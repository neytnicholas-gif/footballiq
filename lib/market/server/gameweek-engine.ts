import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { fetchSportmonksCompletedGameweeks, fetchSportmonksPredictionFixtures, type SportmonksCompletedGameweek, type SportmonksRequestTelemetry } from '@/lib/market/server/sportmonks-client'

const NO_ELIGIBLE_COMPLETED_RATINGS = 'Completed fixtures did not contain eligible Sportmonks ratings and minutes.'

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
  let providerTelemetry: SportmonksRequestTelemetry = { requestsMade: 0, rateLimits: [] }
  let predictionTelemetry: SportmonksRequestTelemetry = { requestsMade: 0, rateLimits: [] }
  const admin = adminClient()
  const heartbeatRunKey = `verified-gameweek-heartbeat:${new Date().toISOString().slice(0, 10)}`
  const { error: heartbeatError } = await admin.from('market_processing_runs').upsert({
    run_key: heartbeatRunKey, run_type: 'verified_gameweek', status: 'processing', dry_run: false,
    started_at: new Date().toISOString(), finished_at: null, report: null, error_message: null,
  }, { onConflict: 'run_key' })
  if (heartbeatError) throw new Error(`Gameweek heartbeat could not start: ${heartbeatError.message}`)

  try {
    const predictionSync = await fetchSportmonksPredictionFixtures(
      process.env.SPORTMONKS_API_TOKEN,
      (telemetry) => { predictionTelemetry = telemetry },
    )
    const { fixtures: predictionFixtures, competitions: predictionCompetitions } = predictionSync
    if (predictionCompetitions.length) {
      const activeKeys = predictionCompetitions.map((competition) => competition.league_key)
      const { error: deactivateError } = await admin.from('prediction_competitions').update({ is_active: false }).not('league_key', 'in', `(${activeKeys.join(',')})`)
      if (deactivateError) throw new Error(`Prediction competition retirement failed: ${deactivateError.message}`)
      const { error: competitionError } = await admin.from('prediction_competitions').upsert(predictionCompetitions, { onConflict: 'league_key' })
      if (competitionError) throw new Error(`Prediction competition sync failed: ${competitionError.message}`)
    }
    if (predictionFixtures.length) {
      const { error: fixtureError } = await admin.from('prediction_fixtures').upsert(predictionFixtures, { onConflict: 'fixture_id' })
      if (fixtureError) throw new Error(`Prediction fixture sync failed: ${fixtureError.message}`)
    }
    const { data: leagueFixturesAssigned, error: leagueFixtureError } = await admin.rpc('prediction_refresh_league_fixtures')
    if (leagueFixtureError) throw new Error(`Prediction league fixture assignment failed: ${leagueFixtureError.message}`)
    const { data: predictionScoring, error: predictionScoringError } = await admin.rpc('prediction_score_completed_fixtures')
    if (predictionScoringError) throw new Error(`Prediction scoring failed: ${predictionScoringError.message}`)

    const cutoff = new Date(Date.now() - 28 * 86_400_000).toISOString()
    const processedPerformanceKeys = new Set<string>()
    for (let from = 0; ; from += 1_000) {
      const { data: processedRows, error: processedError } = await admin
        .from('market_player_match_stats')
        .select('provider_fixture_id,player:market_players!inner(provider_player_id)')
        .gte('fixture_date', cutoff)
        .range(from, from + 999)
      if (processedError) throw new Error(`Processed-performance lookup failed: ${processedError.message}`)
      for (const row of processedRows ?? []) {
        const relation = row.player as unknown
        const player = Array.isArray(relation) ? relation[0] : relation
        const providerPlayerId = player && typeof player === 'object' && 'provider_player_id' in player
          ? String(player.provider_player_id)
          : ''
        if (providerPlayerId) processedPerformanceKeys.add(`${row.provider_fixture_id}:${providerPlayerId}`)
      }
      if ((processedRows ?? []).length < 1_000) break
    }
    let gameweeks: SportmonksCompletedGameweek[] = []
    try {
      gameweeks = await fetchSportmonksCompletedGameweeks(
        process.env.SPORTMONKS_API_TOKEN,
        processedPerformanceKeys,
        (telemetry) => { providerTelemetry = telemetry },
      )
    } catch (error) {
      // A quiet week (or an off-season day) is a successful no-op. Provider,
      // parsing, or partial-fixture failures still escape and mark the run failed.
      if (!(error instanceof Error) || error.message !== NO_ELIGIBLE_COMPLETED_RATINGS) throw error
    }
    const batches = []
    for (const gameweek of gameweeks) batches.push(await processBatch(admin, gameweek))
    const report = { batchCount: batches.length, durationMs: Date.now() - startedAt, providerTelemetry, predictionTelemetry, predictionCompetitionCount: predictionCompetitions.length, predictionFixtureCount: predictionFixtures.length, leagueFixturesAssigned, predictionScoring, batches }
    await admin.from('market_processing_runs').update({
      status: 'completed', finished_at: new Date().toISOString(), report, error_message: null,
    }).eq('run_key', heartbeatRunKey)
    console.info(JSON.stringify({ event: 'market.gameweek.completed', ...report }))
    return report
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown gameweek processing failure.'
    await admin.from('market_processing_runs').update({
      status: 'failed', finished_at: new Date().toISOString(),
      report: { durationMs: Date.now() - startedAt, providerTelemetry, predictionTelemetry }, error_message: message,
    }).eq('run_key', heartbeatRunKey)
    throw error
  }
}
