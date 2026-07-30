type InitialValueInput = {
  providerPlayerId: string
  positionGroup: 'GK' | 'DEF' | 'MID' | 'FWD'
  age?: number | null
  hasNationality: boolean
  hasDetailedPosition: boolean
  squadDataConfidence?: 'high' | 'medium' | 'low'
}

type InitialValueConfig = {
  minPriceMinor: number
  maxPriceMinor: number
  baseByPosition: Record<'GK' | 'DEF' | 'MID' | 'FWD', number>
  ageBandAdjustments: {
    young: number
    prime: number
    experienced: number
  }
  completenessAdjustments: {
    nationalityMissing: number
    detailedPositionMissing: number
  }
  confidenceAdjustments: {
    high: number
    medium: number
    low: number
  }
  idSpreadRange: number
}

export const DEFAULT_INITIAL_VALUE_CONFIG: InitialValueConfig = {
  minPriceMinor: 60,
  maxPriceMinor: 140,
  baseByPosition: {
    GK: 82,
    DEF: 86,
    MID: 92,
    FWD: 96,
  },
  ageBandAdjustments: {
    young: 4,
    prime: 6,
    experienced: -2,
  },
  completenessAdjustments: {
    nationalityMissing: -2,
    detailedPositionMissing: -3,
  },
  confidenceAdjustments: {
    high: 2,
    medium: 0,
    low: -4,
  },
  idSpreadRange: 7,
}

function stableHash(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function getAgeBand(age?: number | null): 'young' | 'prime' | 'experienced' | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age <= 0) return null
  if (age <= 22) return 'young'
  if (age <= 29) return 'prime'
  return 'experienced'
}

export function computeInitialFootballIQValueMinor(
  input: InitialValueInput,
  config: InitialValueConfig = DEFAULT_INITIAL_VALUE_CONFIG,
): number {
  let value = config.baseByPosition[input.positionGroup]

  const ageBand = getAgeBand(input.age)
  if (ageBand) {
    value += config.ageBandAdjustments[ageBand]
  }

  if (!input.hasNationality) {
    value += config.completenessAdjustments.nationalityMissing
  }

  if (!input.hasDetailedPosition) {
    value += config.completenessAdjustments.detailedPositionMissing
  }

  const confidence = input.squadDataConfidence ?? 'medium'
  value += config.confidenceAdjustments[confidence]

  // Deterministic bounded spread to avoid flat values while staying provider-independent.
  const spread = (stableHash(input.providerPlayerId) % (config.idSpreadRange * 2 + 1)) - config.idSpreadRange
  value += spread

  if (value < config.minPriceMinor) return config.minPriceMinor
  if (value > config.maxPriceMinor) return config.maxPriceMinor
  return value
}
