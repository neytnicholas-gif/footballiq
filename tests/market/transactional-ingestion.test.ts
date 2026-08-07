// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { PerformanceImport, RealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { disabledRealPerformanceProvider } from '@/lib/market/performance-ingestion'
import { getRealPerformanceProvider } from '@/lib/market/server/provider-runtime'
import { ingestVerifiedPerformanceBatch, type IngestionRepository, type IngestionTransaction, type PerformanceCorrection, type StoredBatch } from '@/lib/market/server/ingestion-service'

const enabledProvider: RealPerformanceProvider = {
  ...disabledRealPerformanceProvider,
  name: 'test-licensed-provider',
  enabled: true,
}

function performanceImport(overrides: Partial<PerformanceImport['appearances'][number]> = {}, fixtureOverrides: Partial<PerformanceImport['fixture']> = {}): PerformanceImport {
  return {
    fixture: {
      providerFixtureId: 'fixture-1', competitionId: 'pl', seasonId: '2026', gameweek: 1,
      kickoffAt: '2026-08-15T14:00:00Z', status: 'finished', homeClubId: 'home', awayClubId: 'away', ...fixtureOverrides,
    },
    appearances: [{
      providerAppearanceId: 'appearance-1', providerFixtureId: 'fixture-1', providerPlayerId: 'player-1',
      minutesPlayed: 90, rating: 7.5, appeared: true, verificationStatus: 'verified', sourceName: 'provider',
      sourceReference: 'provider://fixture-1', retrievedAt: '2026-08-15T17:00:00Z', ...overrides,
    }],
  }
}

type State = { batches: Map<string, StoredBatch>; keys: Set<string>; applied: string[]; corrections: string[] }

class MemoryRepository implements IngestionRepository {
  state: State = { batches: new Map(), keys: new Set(), applied: [], corrections: [] }
  failDuringApply = false
  private queue: Promise<void> = Promise.resolve()

  async transaction<T>(work: (transaction: IngestionTransaction) => Promise<T>): Promise<T> {
    let release!: () => void
    const previous = this.queue
    this.queue = new Promise<void>((resolve) => { release = resolve })
    await previous
    const snapshot: State = {
      batches: new Map(this.state.batches), keys: new Set(this.state.keys),
      applied: [...this.state.applied], corrections: [...this.state.corrections],
    }
    const transaction: IngestionTransaction = {
      createOrLockBatch: async (input) => {
        const existing = this.state.batches.get(input.providerBatchId)
        if (existing) return { ...existing, unchanged: true }
        const batch = { id: `batch-${this.state.batches.size + 1}`, status: 'processing' as const, unchanged: false }
        this.state.batches.set(input.providerBatchId, batch)
        return batch
      },
      existingPerformanceKeys: async (keys) => new Set(keys.filter((key) => this.state.keys.has(key))),
      storePerformances: async (_batchId, performances) => performances.forEach((event) => this.state.keys.add(event.idempotencyKey)),
      applyPerformanceValues: async (_batchId, performances) => {
        if (this.failDuringApply) throw new Error('forced value-update failure')
        this.state.applied.push(...performances.map((event) => event.idempotencyKey))
      },
      supersedePerformance: async (_batchId, correction) => { this.state.corrections.push(`supersede:${correction.originalIdempotencyKey}`) },
      rebuildPlayerTimeline: async (_batchId, corrected, reason) => { this.state.corrections.push(`rebuild:${corrected.idempotencyKey}:${reason}`) },
      markBatchApplied: async () => {
        const entry = [...this.state.batches.entries()].at(-1)
        if (entry) this.state.batches.set(entry[0], { ...entry[1], status: 'applied' })
      },
    }
    try { return await work(transaction) } catch (error) { this.state = snapshot; throw error } finally { release() }
  }
}

function request(repository: IngestionRepository, imports = [performanceImport()], corrections?: PerformanceCorrection[]) {
  return ingestVerifiedPerformanceBatch({
    actor: 'service_role', provider: enabledProvider, repository,
    batch: { providerBatchId: 'provider-batch-1', payloadChecksum: 'sha256:one', retrievedAt: '2026-08-15T17:00:00Z', imports, corrections },
  })
}

describe('transactional Market ingestion boundary', () => {
  it('makes unchanged and concurrent duplicate imports idempotent', async () => {
    const repository = new MemoryRepository()
    const [first, second] = await Promise.all([request(repository), request(repository)])
    expect([first.status, second.status].sort()).toEqual(['applied', 'unchanged'])
    expect(repository.state.applied).toHaveLength(1)
  })

  it('rejects a partially invalid batch before any write', async () => {
    const repository = new MemoryRepository()
    await expect(request(repository, [performanceImport(), performanceImport({ rating: null, providerPlayerId: 'player-2' })])).rejects.toThrow('Batch validation failed')
    expect(repository.state.batches.size).toBe(0)
    expect(repository.state.applied).toHaveLength(0)
  })

  it('rolls back all stored events when value application fails', async () => {
    const repository = new MemoryRepository()
    repository.failDuringApply = true
    await expect(request(repository)).rejects.toThrow('forced value-update failure')
    expect(repository.state.batches.size).toBe(0)
    expect(repository.state.keys.size).toBe(0)
  })

  it('preserves the original correction and requests deterministic timeline rebuilding', async () => {
    const repository = new MemoryRepository()
    const correction: PerformanceCorrection = {
      originalIdempotencyKey: 'provider:fixture-0:player-1', reason: 'Provider corrected the match rating',
      correctedImport: performanceImport({ rating: 8.1 }),
    }
    const result = await request(repository, [], [correction])
    expect(result.correctionCount).toBe(1)
    expect(repository.state.corrections).toEqual([
      'supersede:provider:fixture-0:player-1',
      'rebuild:provider:fixture-1:player-1:Provider corrected the match rating',
    ])
  })

  it.each(['authenticated', 'anonymous'] as const)('rejects %s ingestion', async (actor) => {
    await expect(ingestVerifiedPerformanceBatch({ actor, provider: enabledProvider, repository: new MemoryRepository(), batch: { providerBatchId: 'b', payloadChecksum: 'c', retrievedAt: '2026-08-15T17:00:00Z', imports: [] } })).rejects.toThrow('trusted service role')
  })

  it('keeps production provider execution disabled', async () => {
    expect(getRealPerformanceProvider().enabled).toBe(false)
    await expect(ingestVerifiedPerformanceBatch({ actor: 'service_role', provider: disabledRealPerformanceProvider, repository: new MemoryRepository(), batch: { providerBatchId: 'b', payloadChecksum: 'c', retrievedAt: '2026-08-15T17:00:00Z', imports: [] } })).rejects.toThrow('provider is disabled')
  })

  it('does not expose provider runtime or credential names through client entry points', () => {
    const clientSources = [
      'lib/market/client.ts', 'components/market/player-market-home.tsx',
      'components/market/player-market-browser.tsx', 'app/market/page.tsx',
    ].map((file) => readFileSync(file, 'utf8')).join('\n')
    expect(clientSources).not.toMatch(/provider-runtime|ingestion-service|SERVICE_ROLE|PROVIDER_API_KEY|NEXT_PUBLIC_.*PROVIDER/i)
  })
})
