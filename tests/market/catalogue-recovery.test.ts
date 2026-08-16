import { describe, expect, it, vi } from 'vitest'
import { retryCatalogueOperation, shouldRecoverCatalogueSync } from '@/lib/market/catalogue-recovery'

describe('catalogue sync recovery', () => {
  it('retries a failed idempotent league write once', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('temporary database interruption'))
      .mockResolvedValueOnce({ synced: 400 })
    await expect(retryCatalogueOperation(operation, 1)).resolves.toEqual({ value: { synced: 400 }, attempts: 2 })
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('recovers failed and stale running syncs, but leaves healthy runs alone', () => {
    const now = Date.parse('2026-08-16T12:30:00Z')
    expect(shouldRecoverCatalogueSync({ status: 'failed', started_at: '2026-08-16T12:29:00Z' }, now)).toBe(true)
    expect(shouldRecoverCatalogueSync({ status: 'running', started_at: '2026-08-16T12:14:59Z' }, now)).toBe(true)
    expect(shouldRecoverCatalogueSync({ status: 'running', started_at: '2026-08-16T12:20:00Z' }, now)).toBe(false)
    expect(shouldRecoverCatalogueSync({ status: 'completed', started_at: '2026-08-16T12:00:00Z' }, now)).toBe(false)
  })
})
