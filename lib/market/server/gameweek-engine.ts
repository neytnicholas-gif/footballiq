import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { fetchSportmonksCompletedGameweeks, fetchSportmonksPredictionFixtures, type SportmonksCompletedGameweek, type SportmonksRequestTelemetry } from '@/lib/market/server/sportmonks-client'

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

  const { data: correctionData, error: correctionError } = await admin.rpc('market_apply_verified_rating_corrections', {
    p_gameweek_key: gameweek.gameweekKey,
    p_updates: gameweek.updates,
  })
  if (correctionError) {
    await admin.from('market_processing_runs').update({ status: 'failed', finished_at: new Date().toISOString(), error_message: correctionError.message }).eq('run_key', runKey)
    throw new Error(`Verified rating correction failed: ${correctionError.message}`)
  }
  const correctionReport = (correctionData ?? {}) as Record<string, unknown>
  const failedCorrections = Array.isArray(correctionReport.failed_items) ? correctionReport.failed_items : []
  if (failedCorrections.length > 0) {
    const message = `${failedCorrections.length} corrected player rating(s) failed and will be retried.`
    await admin.from('market_processing_runs').update({
      status: 'failed', finished_at: new Date().toISOString(), report: { correctionReport }, error_message: message,
    }).eq('run_key', runKey)
    throw new Error(message)
  }

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
  const report: Record<string, unknown> = { ...((data ?? {}) as Record<string, unknown>), correctionReport }
  if (Number(correctionReport.corrected_players ?? 0) > 0) report.unchanged = false
  const failedItems = Array.isArray(report.failed_items) ? report.failed_items : []
  if (failedItems.length > 0) {
    const message = `${failedItems.length} player update(s) failed and will be retried.`
    await admin.from('market_processing_runs').update({
      status: 'failed', finished_at: new Date().toISOString(), report, error_message: message,
    }).eq('run_key', runKey)
    throw new Error(message)
  }
  if (gameweek.checkedFixtures.length > 0) {
    const processedAt = new Date().toISOString()
    const gameweekId = typeof report.gameweek_id === 'string' ? report.gameweek_id : null
    const { error: settlementError } = await admin.from('market_fixture_settlements').upsert(
      gameweek.checkedFixtures.map((fixture) => ({
        provider_fixture_id: fixture.providerFixtureId,
        kickoff_at: fixture.kickoffAt,
        gameweek_id: gameweekId,
        status: 'processed',
        processed_at: processedAt,
        updated_at: processedAt,
      })),
      { onConflict: 'provider_fixture_id' },
    )
    if (settlementError) {
      await admin.from('market_processing_runs').update({
        status: 'failed', finished_at: processedAt, report,
        error_message: `Fixture settlement failed: ${settlementError.message}`,
      }).eq('run_key', runKey)
      throw new Error(`Fixture settlement failed: ${settlementError.message}`)
    }
  }
  await admin.from('market_processing_runs').update({ status: 'completed', finished_at: new Date().toISOString(), report }).eq('run_key', runKey)
  return { unchanged: false, ...report }
}

export async function processLatestVerifiedGameweek(options: { skipIfCompletedToday?: boolean } = {}) {
  const startedAt = Date.now()
  let providerTelemetry: SportmonksRequestTelemetry = { requestsMade: 0, rateLimits: [] }
  let predictionTelemetry: SportmonksRequestTelemetry = { requestsMade: 0, rateLimits: [] }
  const admin = adminClient()
  const heartbeatRunKey = `verified-gameweek-heartbeat:${new Date().toISOString().slice(0, 10)}`
  if (options.skipIfCompletedToday) {
    const { data: completedRun, error: completedRunError } = await admin
      .from('market_processing_runs')
      .select('status,report,finished_at')
      .eq('run_key', heartbeatRunKey)
      .maybeSingle()
    if (completedRunError) throw new Error(`Gameweek retry state is unavailable: ${completedRunError.message}`)
    if (completedRun?.status === 'completed') {
      return {
        alreadyCompleted: true,
        finishedAt: completedRun.finished_at,
        previousReport: completedRun.report ?? null,
      }
    }
  }
  const { error: heartbeatError } = await admin.from('market_processing_runs').upsert({
    run_key: heartbeatRunKey, run_type: 'verified_gameweek', status: 'processing', dry_run: false,
    started_at: new Date().toISOString(), finished_at: null, report: null, error_message: null,
  }, { onConflict: 'run_key' })
  if (heartbeatError) throw new Error(`Gameweek heartbeat could not start: ${heartbeatError.message}`)

  try {
    const { data: marketSettings, error: settingsError } = await admin
      .from('market_settings')
      .select('valuation_eligible_from')
      .eq('id', 1)
      .single()
    if (settingsError || !marketSettings?.valuation_eligible_from) {
      throw new Error(`Valuation launch boundary is unavailable: ${settingsError?.message ?? 'missing value'}`)
    }
    const valuationEligibleFrom = String(marketSettings.valuation_eligible_from)

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

    const cutoff = new Date(Math.max(Date.now() - 28 * 86_400_000, Date.parse(valuationEligibleFrom))).toISOString()
    // Sportmonks can correct a completed rating shortly after full time. Recent
    // rows are deliberately re-fetched; only settled rows older than 72 hours
    // are skipped by provider fixture/player identity.
    const correctionWindowCutoff = new Date(Date.now() - 72 * 60 * 60_000).toISOString()
    const processedPerformanceKeys = new Set<string>()
    for (let from = 0; ; from += 1_000) {
      const { data: processedRows, error: processedError } = await admin
        .from('market_player_match_stats')
        .select('id,provider_fixture_id,player:market_players!inner(provider_player_id)')
        .gte('fixture_date', cutoff)
        .lte('fixture_date', correctionWindowCutoff)
        .order('fixture_date', { ascending: true })
        .order('id', { ascending: true })
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
    const gameweeks: SportmonksCompletedGameweek[] = await fetchSportmonksCompletedGameweeks(
      process.env.SPORTMONKS_API_TOKEN,
      processedPerformanceKeys,
      (telemetry) => { providerTelemetry = telemetry },
      valuationEligibleFrom,
    )
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
    console.error(JSON.stringify({
      event: 'market.gameweek.failed',
      heartbeatRunKey,
      durationMs: Date.now() - startedAt,
      providerTelemetry,
      predictionTelemetry,
      error: message,
    }))
    throw error
  }
}
