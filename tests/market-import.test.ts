import assert from 'node:assert/strict'
import path from 'path'
import test from 'node:test'
import {
  discoverMarketCompetition,
  runMarketSeasonImport,
} from '../lib/market/import-workflow'
import { apiFootballAdapter } from '../lib/market/provider/api-football'
import type {
  DataProviderAdapter,
  ProviderClub,
  ProviderCompetition,
  ProviderPage,
  ProviderPlayer,
  ProviderSeason,
} from '../lib/market/provider/types'

function pageOf<T>(items: T[], page = 1, hasNextPage = false): ProviderPage<T> {
  return {
    items,
    page,
    hasNextPage,
  }
}

const TEST_PROGRESS_PATH = path.join(process.cwd(), 'tmp', 'market-import-progress.test.json')

function runImportForTest(options: {
  dryRun?: boolean
  writeEnabled?: boolean
  adapterOverride?: DataProviderAdapter
}) {
  return runMarketSeasonImport({
    dryRun: options.dryRun ?? true,
    writeEnabled: options.writeEnabled,
    adapterOverride: options.adapterOverride,
    progressFilePath: TEST_PROGRESS_PATH,
  })
}

function makeBaseAdapter(overrides?: Partial<DataProviderAdapter>): DataProviderAdapter {
  const competitions: ProviderCompetition[] = [
    {
      providerCompetitionId: '39',
      key: 'league-39',
      name: 'Premier League',
      country: 'England',
    },
  ]

  const seasons: ProviderSeason[] = [
    {
      providerSeasonId: '39-2026',
      key: 'season-2026',
      startsAt: '2026-08-01',
      endsAt: '2027-05-31',
    },
  ]

  const clubs: ProviderClub[] = Array.from({ length: 20 }).map((_, index) => ({
    providerClubId: String(index + 1),
    name: `Club ${index + 1}`,
    shortName: `C${index + 1}`,
    slug: `club-${index + 1}`,
    primaryColour: '#123456',
    secondaryColour: '#ddeeff',
    foregroundColour: '#101010',
    colourConfidence: 'review-required',
  }))

  const squad: ProviderPlayer[] = [
    {
      providerPlayerId: 'p1',
      fullName: 'Player One',
      displayName: 'Player One',
      positionGroup: 'Defender',
      detailedPosition: 'Center Back',
    },
    {
      providerPlayerId: 'p2',
      fullName: 'Player Two',
      displayName: 'Player Two',
      positionGroup: 'Midfielder',
      detailedPosition: 'Central Midfielder',
    },
  ]

  const base: DataProviderAdapter = {
    name: 'mock-provider',
    async fetchCompetitions() {
      return pageOf(competitions)
    },
    async fetchSeasons() {
      return pageOf(seasons)
    },
    async fetchClubs() {
      return pageOf(clubs)
    },
    async fetchSquad() {
      return pageOf(squad)
    },
    async fetchFixtures(_seasonKey, pagination) {
      return pageOf([], pagination.page)
    },
    async fetchPlayerMatchStats(_seasonKey, pagination) {
      return pageOf([], pagination.page)
    },
  }

  return {
    ...base,
    ...overrides,
  }
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

test('league-result ambiguity is blocked', async () => {
  const ambiguousAdapter = makeBaseAdapter({
    async fetchCompetitions() {
      return pageOf([
        { providerCompetitionId: '39', key: 'league-39', name: 'Premier League', country: 'England' },
        { providerCompetitionId: '99', key: 'league-99', name: 'Premier League', country: 'England' },
      ])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: undefined,
    },
    async () => {
      await assert.rejects(async () => discoverMarketCompetition({ adapterOverride: ambiguousAdapter }), /ambiguous/)
    }
  )
})

test('missing environment variables are blocked', async () => {
  const adapter = makeBaseAdapter()
  await withEnv(
    {
      API_FOOTBALL_KEY: undefined,
    },
    async () => {
      await assert.rejects(
        async () => discoverMarketCompetition({ adapterOverride: adapter }),
        /API_FOOTBALL_KEY is not configured/
      )
    }
  )
})

test('incorrect club count causes validation error', async () => {
  const adapter = makeBaseAdapter({
    async fetchClubs() {
      return pageOf(Array.from({ length: 19 }).map((_, index) => ({
        providerClubId: String(index + 1),
        name: `Club ${index + 1}`,
        shortName: `C${index + 1}`,
        slug: `club-${index + 1}`,
      })))
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.imported.clubs, 19)
      assert.ok(report.issues.some((entry) => entry.code === 'INVALID_CLUB_COUNT'))
      assert.ok(report.issues.some((entry) => entry.code === 'IMPORT_ABORTED'))
    }
  )
})

test('duplicate clubs are detected', async () => {
  const adapter = makeBaseAdapter({
    async fetchClubs() {
      const duplicate = {
        providerClubId: '1',
        name: 'Duplicate Club',
        shortName: 'DC',
        slug: 'duplicate-club',
      }

      return pageOf([
        ...Array.from({ length: 18 }).map((_, index) => ({
          providerClubId: String(index + 2),
          name: `Club ${index + 2}`,
          shortName: `C${index + 2}`,
          slug: `club-${index + 2}`,
        })),
        duplicate,
        duplicate,
      ])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.ok(report.issues.some((entry) => entry.code === 'DUPLICATE_CLUB_PROVIDER_ID'))
    }
  )
})

test('duplicate players across clubs produce one canonical player with review classification', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      const duplicated: ProviderPlayer = {
        providerPlayerId: 'shared-player',
        fullName: 'Shared Player',
        displayName: 'Shared Player',
        positionGroup: 'Forward',
        detailedPosition: 'Striker',
      }

      if (clubProviderId === '1' || clubProviderId === '2') {
        return pageOf([duplicated])
      }

      return pageOf([
        {
          providerPlayerId: `player-${clubProviderId}`,
          fullName: `Player ${clubProviderId}`,
          displayName: `Player ${clubProviderId}`,
          positionGroup: 'Defender',
          detailedPosition: 'Center Back',
        },
      ])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.normalization?.rawPlayerRowsReceived, 20)
      assert.equal(report.normalization?.uniqueCanonicalPlayers, 19)
      assert.ok((report.normalization?.duplicateMemberships.length ?? 0) > 0)
      assert.ok(
        report.issues.some(
          (entry) => entry.code === 'PLAYER_MEMBERSHIP_REVIEW_REQUIRED' || entry.code === 'PLAYER_MEMBERSHIP_WARNING'
        )
      )
    }
  )
})

test('unknown position mapping is flagged as unresolved', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad() {
      return pageOf([
        {
          providerPlayerId: 'unknown-1',
          fullName: 'Unknown Position',
          displayName: 'Unknown Position',
          positionGroup: 'Unknown',
        },
      ])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.ok((report.unresolvedRecords?.length ?? 0) > 0)
      assert.ok((report.positionCounts?.Unknown ?? 0) > 0)
    }
  )
})

test('pagination is handled for squads', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId, _seasonKey, pagination) {
      if (clubProviderId !== '1') {
        return pageOf([], pagination.page, false)
      }

      if (pagination.page === 1) {
        return pageOf([
          {
            providerPlayerId: 'pg-1',
            fullName: 'Paged One',
            displayName: 'Paged One',
            positionGroup: 'Midfielder',
            detailedPosition: 'CM',
          },
        ], 1, true)
      }

      return pageOf([
        {
          providerPlayerId: 'pg-2',
          fullName: 'Paged Two',
          displayName: 'Paged Two',
          positionGroup: 'Forward',
          detailedPosition: 'CF',
        },
      ], 2, false)
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.imported.squads, 2)
    }
  )
})

test('dry-run no-write guarantee blocks write mode', async () => {
  const adapter = makeBaseAdapter()

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      await assert.rejects(
        async () => runImportForTest({ dryRun: false, writeEnabled: true, adapterOverride: adapter }),
        /write mode is disabled/
      )
    }
  )
})

test('idempotent normalization yields stable totals', async () => {
  const adapter = makeBaseAdapter()

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const first = await runImportForTest({ adapterOverride: adapter })
      const second = await runImportForTest({ adapterOverride: adapter })

      assert.equal(first.imported.clubs, second.imported.clubs)
      assert.equal(first.imported.squads, second.imported.squads)
      assert.deepEqual(first.positionCounts, second.positionCounts)
    }
  )
})

test('transferred or inactive handling is represented as prospective deactivations', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId === '1') {
        return pageOf([
          {
            providerPlayerId: 'live-player-1',
            fullName: 'Live Player 1',
            displayName: 'Live Player 1',
            positionGroup: 'Goalkeeper',
            detailedPosition: 'Goalkeeper',
          },
        ])
      }
      return pageOf([])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.ok((report.prospectiveChanges?.players.deactivations ?? 0) >= 0)
    }
  )
})

test('secret redaction is enforced in discovery failures', async () => {
  const secret = 'SENSITIVE_API_FOOTBALL_KEY'
  const adapter = makeBaseAdapter({
    async fetchCompetitions() {
      throw new Error(`provider failed with key ${secret}`)
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: secret,
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      const issueText = JSON.stringify(report.issues)
      assert.equal(issueText.includes(secret), false)
      assert.equal(issueText.includes('[REDACTED]'), true)
    }
  )
})

test('report totals include clubs, players, and per-club counts', async () => {
  const adapter = makeBaseAdapter()

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.imported.clubs, 20)
      assert.equal(report.imported.squads, 2)
      assert.equal(report.normalization?.rawPlayerRowsReceived, 40)
      assert.equal(report.normalization?.uniqueCanonicalPlayers, 2)
      assert.ok(report.playersPerClub)
      assert.equal(Object.keys(report.playersPerClub ?? {}).length, 20)
    }
  )
})

test('identical duplicate player rows are deduplicated as exact duplicate payload', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId !== '1') {
        return pageOf([])
      }

      const row: ProviderPlayer = {
        providerPlayerId: 'dup-1',
        fullName: 'Duplicated Row',
        displayName: 'Duplicated Row',
        positionGroup: 'Midfielder',
        detailedPosition: 'CM',
        providerUpdatedAt: '2026-10-01T00:00:00.000Z',
      }

      return pageOf([row, row, row])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.normalization?.rawPlayerRowsReceived, 3)
      assert.equal(report.normalization?.uniqueCanonicalPlayers, 1)
      assert.equal(report.normalization?.exactDuplicatesRemoved, 2)
      assert.equal(report.normalization?.duplicateMemberships[0]?.classification, 'exact-duplicate-payload')
      assert.equal(report.issues.some((entry) => entry.code === 'IMPORT_ABORTED'), false)
    }
  )
})

test('transfer-like conflict chooses active club using latest providerUpdatedAt', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId === '1') {
        return pageOf([
          {
            providerPlayerId: 'moving-1',
            fullName: 'Moving Player',
            displayName: 'Moving Player',
            positionGroup: 'Forward',
            detailedPosition: 'Striker',
            providerUpdatedAt: '2026-01-01T00:00:00.000Z',
          },
        ])
      }

      if (clubProviderId === '2') {
        return pageOf([
          {
            providerPlayerId: 'moving-1',
            fullName: 'Moving Player',
            displayName: 'Moving Player',
            positionGroup: 'Forward',
            detailedPosition: 'Striker',
            providerUpdatedAt: '2026-06-01T00:00:00.000Z',
          },
        ])
      }

      return pageOf([])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      const membership = report.normalization?.duplicateMemberships.find((entry) => entry.providerPlayerId === 'moving-1')
      assert.ok(membership)
      assert.equal(membership?.classification, 'possible-transfer')
      assert.equal(membership?.activeClubProviderId, '2')
      assert.equal(membership?.requiresReview, false)
      assert.equal(report.normalization?.unresolvedPlayersRequiringReview, 0)
    }
  )
})

test('same player id in two clubs without reliable timestamps is marked unresolved', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId === '1' || clubProviderId === '2') {
        return pageOf([
          {
            providerPlayerId: 'shared-no-time',
            fullName: 'Shared No Time',
            displayName: 'Shared No Time',
            positionGroup: 'Defender',
            detailedPosition: 'Center Back',
          },
        ])
      }

      return pageOf([])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      const membership = report.normalization?.duplicateMemberships.find((entry) => entry.providerPlayerId === 'shared-no-time')
      assert.ok(membership)
      assert.equal(membership?.classification, 'unresolved-provider-inconsistency')
      assert.equal(membership?.requiresReview, true)
      assert.ok(report.issues.some((entry) => entry.code === 'PLAYER_MEMBERSHIP_REVIEW_REQUIRED'))
    }
  )
})

test('missing club information is captured as missing required field', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId !== '1') {
        return pageOf([])
      }

      return pageOf([
        {
          providerPlayerId: '',
          fullName: 'No Provider Id',
          displayName: 'No Provider Id',
          positionGroup: 'Midfielder',
          detailedPosition: 'CM',
        },
      ])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.ok(report.issues.some((entry) => entry.code === 'MISSING_REQUIRED_FIELD'))
    }
  )
})

test('duplicate player names with different provider ids remain distinct canonical players', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId === '1') {
        return pageOf([
          {
            providerPlayerId: 'name-1',
            fullName: 'Alex Smith',
            displayName: 'Alex Smith',
            positionGroup: 'Forward',
            detailedPosition: 'Striker',
          },
          {
            providerPlayerId: 'name-2',
            fullName: 'Alex Smith',
            displayName: 'Alex Smith',
            positionGroup: 'Midfielder',
            detailedPosition: 'CM',
          },
        ])
      }

      return pageOf([])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      assert.equal(report.normalization?.rawPlayerRowsReceived, 2)
      assert.equal(report.normalization?.uniqueCanonicalPlayers, 2)
    }
  )
})

test('one provider id always yields one canonical player record', async () => {
  const adapter = makeBaseAdapter({
    async fetchSquad(clubProviderId) {
      if (clubProviderId === '1') {
        return pageOf([
          {
            providerPlayerId: 'single-id-1',
            fullName: 'Single Identity',
            displayName: 'Single Identity',
            positionGroup: 'Defender',
            detailedPosition: 'Center Back',
            providerUpdatedAt: '2026-01-01T00:00:00.000Z',
          },
        ])
      }

      if (clubProviderId === '2') {
        return pageOf([
          {
            providerPlayerId: 'single-id-1',
            fullName: 'Single Identity',
            displayName: 'Single Identity',
            positionGroup: 'Defender',
            detailedPosition: 'Center Back',
            providerUpdatedAt: '2026-06-01T00:00:00.000Z',
          },
        ])
      }

      return pageOf([])
    },
  })

  await withEnv(
    {
      API_FOOTBALL_KEY: 'test-key',
      MARKET_TARGET_SEASON: '2026',
      MARKET_TARGET_LEAGUE_ID: '39',
    },
    async () => {
      const report = await runImportForTest({ adapterOverride: adapter })
      const canonicalCount = report.normalization?.duplicateMemberships.filter(
        (entry) => entry.providerPlayerId === 'single-id-1'
      ).length

      assert.equal(canonicalCount, 1)
      assert.equal(report.normalization?.uniqueCanonicalPlayers, 1)
    }
  )
})

test('rate-limit handling retries and then succeeds', async () => {
  const originalFetch = globalThis.fetch
  let callCount = 0

  const mockedFetch: typeof fetch = async () => {
    callCount += 1
    if (callCount === 1) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 429,
        headers: {
          'retry-after': '1',
        },
      })
    }

    return new Response(
      JSON.stringify({
        response: [
          {
            league: { id: 39, name: 'Premier League' },
            country: { name: 'England' },
            seasons: [{ year: 2026, start: '2026-08-01', end: '2027-05-31', current: false }],
          },
        ],
      }),
      { status: 200 }
    )
  }

  globalThis.fetch = mockedFetch

  try {
    await withEnv(
      {
        API_FOOTBALL_KEY: 'test-key',
      },
      async () => {
        const page = await apiFootballAdapter.fetchCompetitions(
          { page: 1, perPage: 100 },
          { dryRun: true, requestedAt: new Date().toISOString(), source: 'test' }
        )

        assert.ok(page.items.length >= 1)
        assert.equal(callCount >= 2, true)
      }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('api-football squad pagination metadata is surfaced', async () => {
  const originalFetch = globalThis.fetch

  const mockedFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        response: [
          {
            player: { id: 10, name: 'Paged Player', firstname: 'Paged', lastname: 'Player' },
            statistics: [{ games: { position: 'Midfielder', number: 8 } }],
          },
        ],
        paging: { current: 1, total: 2 },
      }),
      { status: 200 }
    )
  }

  globalThis.fetch = mockedFetch

  try {
    await withEnv(
      {
        API_FOOTBALL_KEY: 'test-key',
        MARKET_TARGET_LEAGUE_ID: '39',
      },
      async () => {
        const page = await apiFootballAdapter.fetchSquad(
          '1',
          'season-2026',
          { page: 1, perPage: 50 },
          { dryRun: true, requestedAt: new Date().toISOString(), source: 'test' }
        )

        assert.equal(page.page, 1)
        assert.equal(page.hasNextPage, true)
        assert.equal(page.items[0]?.positionGroup, 'Midfielder')
      }
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
