import type { PerformanceImport, RealPerformanceProvider, ValidatedPerformance } from '@/lib/market/performance-ingestion'
import { validatePerformanceImport } from '@/lib/market/performance-ingestion'

export type IngestionActor = 'service_role' | 'authenticated' | 'anonymous'
export type PerformanceCorrection = { originalIdempotencyKey: string; correctedImport: PerformanceImport; reason: string }
export type IngestionBatch = { providerBatchId: string; payloadChecksum: string; retrievedAt: string; imports: PerformanceImport[]; corrections?: PerformanceCorrection[] }
export type StoredBatch = { id: string; status: 'processing' | 'applied'; unchanged: boolean }

export type IngestionTransaction = {
  createOrLockBatch(input: { providerName: string; providerBatchId: string; payloadChecksum: string; retrievedAt: string }): Promise<StoredBatch>
  existingPerformanceKeys(keys: string[]): Promise<Set<string>>
  storePerformances(batchId: string, performances: ValidatedPerformance[]): Promise<void>
  applyPerformanceValues(batchId: string, performances: ValidatedPerformance[]): Promise<void>
  supersedePerformance(batchId: string, correction: PerformanceCorrection, corrected: ValidatedPerformance): Promise<void>
  rebuildPlayerTimeline(batchId: string, corrected: ValidatedPerformance, reason: string): Promise<void>
  markBatchApplied(batchId: string, acceptedCount: number): Promise<void>
}

export type IngestionRepository = { transaction<T>(work: (transaction: IngestionTransaction) => Promise<T>): Promise<T> }
export type IngestionResult = { batchId: string; status: 'applied' | 'unchanged'; acceptedCount: number; correctionCount: number }

function assertServerOnly(actor: IngestionActor) {
  if (typeof window !== 'undefined') throw new Error('Market ingestion is server-only.')
  if (actor !== 'service_role') throw new Error('Market ingestion requires a trusted service role.')
}

export async function ingestVerifiedPerformanceBatch(input: {
  actor: IngestionActor
  provider: RealPerformanceProvider
  repository: IngestionRepository
  batch: IngestionBatch
}): Promise<IngestionResult> {
  assertServerOnly(input.actor)
  if (!input.provider.enabled) throw new Error('Real-performance provider is disabled; production ingestion is blocked.')
  if (!input.batch.providerBatchId.trim() || !input.batch.payloadChecksum.trim()) throw new Error('Batch identity and checksum are required.')

  // Validate all records before opening the write transaction. Any invalid row
  // rejects the whole batch, preventing partial player-value updates.
  const validated: ValidatedPerformance[] = []
  const validationErrors: string[] = []
  for (const performanceImport of input.batch.imports) {
    const result = validatePerformanceImport(performanceImport)
    validated.push(...result.accepted)
    validationErrors.push(...result.issues.map((issue) => `${issue.code}: ${issue.message}`))
  }

  const validatedCorrections: Array<{ correction: PerformanceCorrection; performance: ValidatedPerformance }> = []
  for (const correction of input.batch.corrections ?? []) {
    if (!correction.reason.trim()) validationErrors.push('correction_reason: Corrections require a reason.')
    const result = validatePerformanceImport(correction.correctedImport)
    if (result.accepted.length !== 1) validationErrors.push(...result.issues.map((issue) => `${issue.code}: ${issue.message}`))
    else validatedCorrections.push({ correction, performance: result.accepted[0]! })
  }
  if (validationErrors.length > 0) throw new Error(`Batch validation failed: ${validationErrors.join(' | ')}`)

  return input.repository.transaction(async (transaction) => {
    const storedBatch = await transaction.createOrLockBatch({
      providerName: input.provider.name,
      providerBatchId: input.batch.providerBatchId,
      payloadChecksum: input.batch.payloadChecksum,
      retrievedAt: input.batch.retrievedAt,
    })
    if (storedBatch.unchanged && storedBatch.status === 'applied') {
      return { batchId: storedBatch.id, status: 'unchanged', acceptedCount: 0, correctionCount: 0 }
    }

    const keys = validated.map((event) => event.idempotencyKey)
    const existing = await transaction.existingPerformanceKeys(keys)
    const newPerformances = validated.filter((event) => !existing.has(event.idempotencyKey))
    await transaction.storePerformances(storedBatch.id, newPerformances)
    await transaction.applyPerformanceValues(storedBatch.id, newPerformances)

    for (const { correction, performance } of validatedCorrections) {
      await transaction.supersedePerformance(storedBatch.id, correction, performance)
      await transaction.rebuildPlayerTimeline(storedBatch.id, performance, correction.reason)
    }

    await transaction.markBatchApplied(storedBatch.id, newPerformances.length + validatedCorrections.length)
    return { batchId: storedBatch.id, status: 'applied', acceptedCount: newPerformances.length, correctionCount: validatedCorrections.length }
  })
}
