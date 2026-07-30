import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'path'
import { mkdir, rm, writeFile } from 'fs/promises'
import { getMarketViews, resetDemoMarketStoreForTests } from '../lib/market/demo-store'
import { buildDevelopmentDatasetFromImportArtifacts } from '../lib/market/development-dataset'
import { buildWeeklyValuationPreview, runWeeklyImportDry } from '../lib/market/weekly-pipeline'
import type { DataProviderAdapter, ProviderPage } from '../lib/market/provider/types'

const TMP_DIR = path.join(process.cwd(), 'tmp')

function pageOf<T>(items: T[], page = 1, hasNextPage = false): ProviderPage<T> {
  return { items, page, hasNextPage }
}

async function withEnv(values: Record<string, string | undefined>, run: () => Promise<void>) {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key]
    const nextValue = values[key]
    if (typeof nextValue === 'undefined') {
      delete process.env[key]
    } else {
      process.env[key] = nextValue
    }
  }

  try {
    await run()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (typeof value === 'undefined') {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('weekly dry-run import stages provider data and yields valuation preview rows', async () => {
  resetDemoMarketStoreForTests()
  const knownProviderPlayerId = getMarketViews({
    search: '',
    club: 'ALL',
    position: 'ALL',
    sort: 'alphabetical',
    availability: 'ALL',
    ownership: 'ALL',
    ownedPlayerIds: new Set<string>(),
  })[0]?.player.providerPlayerId

  assert.ok(knownProviderPlayerId)
  if (!knownProviderPlayerId) return

  const adapter: DataProviderAdapter = {
    name: 'mock-weekly-provider',
    async fetchCompetitions() {
      return pageOf([])
    },
    async fetchSeasons() {
      return pageOf([])
    },
    async fetchClubs() {
      return pageOf([])
    },
    async fetchSquad() {
      return pageOf([])
    },
    async fetchFixtures(_seasonKey, pagination) {
      if (pagination.page > 1) return pageOf([], pagination.page, false)
      return pageOf(
        [
          {
            providerFixtureId: 'f-completed-1',
            fixtureDate: '2026-08-15T12:00:00.000Z',
            homeClubProviderId: 'h1',
            awayClubProviderId: 'a1',
            status: 'completed',
          },
          {
            providerFixtureId: 'f-scheduled-1',
            fixtureDate: '2026-08-22T12:00:00.000Z',
            homeClubProviderId: 'h2',
            awayClubProviderId: 'a2',
            status: 'scheduled',
          },
        ],
        1,
        false,
      )
    },
    async fetchPlayerMatchStats(_seasonKey, pagination) {
      if (pagination.page > 1) return pageOf([], pagination.page, false)
      return pageOf(
        [
          {
            providerFixtureId: 'f-completed-1',
            providerPlayerId: knownProviderPlayerId,
            fixtureDate: '2026-08-15T12:00:00.000Z',
            started: true,
            minutesPlayed: 90,
            providerRating: 7.8,
            goals: 1,
            assists: 0,
            shots: 2,
            shotsOnTarget: 1,
            keyPasses: 0,
            passes: 30,
            passAccuracy: 88,
            tackles: 2,
            interceptions: 1,
            clearances: 0,
            blocks: 0,
            saves: 0,
            goalsConceded: 0,
            cleanSheet: true,
            yellowCards: 0,
            redCards: 0,
            penaltiesScored: 0,
            penaltiesMissed: 0,
            ownGoals: 0,
            providerUpdatedAt: '2026-08-15T13:00:00.000Z',
          },
        ],
        1,
        false,
      )
    },
  }

  await withEnv(
    {
      MARKET_WEEKLY_SOURCE_MODE: 'provider',
    },
    async () => {
      const result = await runWeeklyImportDry({
        seasonKey: 'season-2026',
        dryRun: true,
        resume: false,
        adapterOverride: adapter,
      })

      assert.equal(result.report.fixturesProcessed, 1)
      assert.equal(result.report.playerStatRowsProcessed, 1)
      assert.equal(result.report.blockedLowConfidenceRows, 0)
      assert.equal(result.valuationPreview.valuationPreviewsGenerated, 1)
      assert.equal(result.valuationPreview.rows[0]?.confidence, 'high')
    },
  )
})

test('weekly preview pending unresolved count subtracts approved decisions and floors at zero', async () => {
  await mkdir(TMP_DIR, { recursive: true })

  await writeFile(
    path.join(TMP_DIR, 'market-excluded-review.json'),
    JSON.stringify({ excludedCount: 10 }, null, 2),
    'utf8',
  )
  await writeFile(
    path.join(TMP_DIR, 'market-import-review-decisions.json'),
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        decisions: {
          p1: { providerPlayerId: 'p1', activeClubProviderId: 'c1', reviewerId: 'r1', decidedAt: new Date().toISOString() },
          p2: { providerPlayerId: 'p2', activeClubProviderId: 'c2', reviewerId: 'r1', decidedAt: new Date().toISOString() },
          p3: { providerPlayerId: 'p3', activeClubProviderId: 'c3', reviewerId: 'r1', decidedAt: new Date().toISOString() },
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  const preview = await buildWeeklyValuationPreview(
    {
      source: 'test',
      dryRun: true,
      resumed: false,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      seasonKey: 'season-2026',
      fixturesProcessed: 0,
      playerStatRowsProcessed: 0,
      duplicateFixtures: 0,
      duplicateStatRows: 0,
      skippedNonCompletedFixtures: 0,
      blockedLowConfidenceRows: 0,
      requestsUsed: 0,
      rateLimitRetries: 0,
      notes: [],
    },
    {
      generatedAt: new Date().toISOString(),
      source: 'test',
      seasonKey: 'season-2026',
      fixturesProcessed: 0,
      playerStatRowsProcessed: 0,
      rows: [],
    },
  )

  assert.equal(preview.unresolvedMemberships.excludedReviewCount, 10)
  assert.equal(preview.approvalStatus.approvedReviewDecisions, 3)
  assert.equal(preview.approvalStatus.pendingUnresolvedMemberships, 7)
})

test('development dataset includes reviewed unresolved membership when approved club row exists', async () => {
  await mkdir(TMP_DIR, { recursive: true })

  await writeFile(
    path.join(TMP_DIR, 'market-import-preview.json'),
    JSON.stringify(
      {
        seasonKey: 'season-2026',
        normalization: {
          duplicateMemberships: [
            {
              providerPlayerId: 'dup-player-1',
              requiresReview: true,
              clubs: ['clubA', 'clubB'],
              reason: 'Needs manual review',
            },
          ],
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  await writeFile(
    path.join(TMP_DIR, 'market-import-progress.json'),
    JSON.stringify(
      {
        seasonKey: 'season-2026',
        completedClubProviderIds: ['clubA', 'clubB'],
        playersPerClub: {
          'Club A': 1,
          'Club B': 1,
        },
        normalizedPlayers: [
          {
            providerPlayerId: 'dup-player-1',
            fullName: 'Dual Club Player',
            displayName: 'Dual Club Player',
            positionGroup: 'Forward',
            detailedPosition: 'Striker',
            clubProviderId: 'clubA',
          },
          {
            providerPlayerId: 'dup-player-1',
            fullName: 'Dual Club Player',
            displayName: 'Dual Club Player',
            positionGroup: 'Forward',
            detailedPosition: 'Striker',
            clubProviderId: 'clubB',
          },
        ],
      },
      null,
      2,
    ),
    'utf8',
  )

  await writeFile(
    path.join(TMP_DIR, 'market-import-review-decisions.json'),
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        decisions: {
          'dup-player-1': {
            providerPlayerId: 'dup-player-1',
            activeClubProviderId: 'clubB',
            reviewerId: 'admin-1',
            decidedAt: new Date().toISOString(),
          },
        },
      },
      null,
      2,
    ),
    'utf8',
  )

  const result = await buildDevelopmentDatasetFromImportArtifacts()

  assert.equal(result.excluded.length, 0)
  assert.equal(result.dataset.players.length, 1)
  assert.equal(result.dataset.players[0]?.clubProviderId, 'clubB')

  await rm(path.join(TMP_DIR, 'market-import-progress.test.json'), { force: true })
})
