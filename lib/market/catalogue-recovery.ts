export type CatalogueRunStatus = {
  status: string
  started_at: string
}

export function shouldRecoverCatalogueSync(latest: CatalogueRunStatus | null, now = Date.now()) {
  if (!latest) return false
  if (latest.status === 'failed') return true
  if (latest.status !== 'running') return false
  const startedAt = Date.parse(latest.started_at)
  return Number.isFinite(startedAt) && now - startedAt >= 15 * 60 * 1_000
}

export async function retryCatalogueOperation<T>(operation: () => Promise<T>, retries = 1, delayMs = 0) {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return { value: await operation(), attempts: attempt + 1 }
    } catch (error) {
      lastError = error
      if (attempt < retries && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastError
}
