import {
  OPENING_PRICE_METHOD_VERSION,
  VALUE_CEILING,
  VALUE_FLOOR,
  type OpeningPriceConfidence,
  type OpeningPriceResult,
} from '@/lib/market/real-valuation'
import type { MarketPosition } from '@/lib/market/types'

export type PersistedOpeningPrice = {
  initial: number
  current: number
  methodVersion: string
  confidence: OpeningPriceConfidence
  evidence: unknown
}

type ResolveOpeningPriceInput = {
  existing?: PersistedOpeningPrice
  candidate: OpeningPriceResult
  candidateCurrentPrice?: number
  position: MarketPosition
  age: number | null
}

export function legacyOpeningValue(position: MarketPosition, age: number | null) {
  const positionBase: Record<MarketPosition, number> = { GK: 5_500_000, DEF: 6_200_000, MID: 6_800_000, FWD: 7_200_000 }
  const ageAdjustment = age === null ? 0
    : age <= 21 ? 700_000 : age <= 24 ? 1_000_000 : age <= 28 ? 800_000
      : age <= 31 ? 300_000 : age <= 34 ? -300_000 : -700_000
  return Math.max(VALUE_FLOOR, Math.min(VALUE_CEILING, positionBase[position] + ageAdjustment))
}

function isOpeningEvidence(value: unknown): value is OpeningPriceResult['evidence'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return typeof row.method_version === 'string'
    && typeof row.calculated_value === 'number'
    && typeof row.confidence === 'string'
    && Boolean(row.source_inputs && typeof row.source_inputs === 'object')
    && Boolean(row.scores && typeof row.scores === 'object')
}

function assertFrozenEvidence(existing: PersistedOpeningPrice): asserts existing is PersistedOpeningPrice & { evidence: OpeningPriceResult['evidence'] } {
  if (!isOpeningEvidence(existing.evidence)) {
    throw new Error('Opening-price integrity check failed: the frozen evidence is missing or malformed.')
  }
  if (
    existing.evidence.method_version !== existing.methodVersion
    || existing.evidence.calculated_value !== existing.initial
    || existing.evidence.confidence !== existing.confidence
  ) {
    throw new Error('Opening-price integrity check failed: the frozen price, method, confidence and evidence no longer agree.')
  }
}

/**
 * Treats the opening value and its evidence as one immutable decision. A later
 * provider sync may refresh current football data, but it cannot rewrite the
 * explanation for a price that remains frozen.
 */
export function resolveOpeningPricePersistence({ existing, candidate, candidateCurrentPrice = candidate.value, position, age }: ResolveOpeningPriceInput) {
  const alreadyOnCurrentModel = existing?.methodVersion === OPENING_PRICE_METHOD_VERSION
  if (existing && alreadyOnCurrentModel) assertFrozenEvidence(existing)

  const migrateFromLegacy = Boolean(existing && !alreadyOnCurrentModel)
  const openingPrice = alreadyOnCurrentModel ? existing.initial : candidate.value
  const preservedMovement = existing ? existing.current - existing.initial : candidateCurrentPrice - candidate.value
  const currentPrice = Math.max(VALUE_FLOOR, Math.min(VALUE_CEILING, openingPrice + preservedMovement))
  const evidence = alreadyOnCurrentModel ? existing.evidence : candidate.evidence
  const confidence = alreadyOnCurrentModel ? existing.confidence : candidate.confidence

  return {
    openingPrice,
    currentPrice,
    evidence,
    confidence,
    methodVersion: OPENING_PRICE_METHOD_VERSION,
    repriced: migrateFromLegacy && openingPrice !== existing?.initial,
    migratedLegacyBaseline: migrateFromLegacy && existing?.initial === legacyOpeningValue(position, age),
  }
}
