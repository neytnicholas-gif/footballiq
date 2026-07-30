import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeInitialFootballIQValueMinor,
  DEFAULT_INITIAL_VALUE_CONFIG,
} from '../lib/market/initial-valuation'

test('initial valuation is deterministic for same player input', () => {
  const input = {
    providerPlayerId: 'provider-123',
    positionGroup: 'MID' as const,
    age: 25,
    hasNationality: true,
    hasDetailedPosition: true,
    squadDataConfidence: 'high' as const,
  }

  const first = computeInitialFootballIQValueMinor(input)
  const second = computeInitialFootballIQValueMinor(input)

  assert.equal(first, second)
})

test('initial valuation remains inside configured min/max bounds', () => {
  const lowInput = {
    providerPlayerId: 'low-case-player',
    positionGroup: 'GK' as const,
    age: 38,
    hasNationality: false,
    hasDetailedPosition: false,
    squadDataConfidence: 'low' as const,
  }

  const highInput = {
    providerPlayerId: 'high-case-player',
    positionGroup: 'FWD' as const,
    age: 24,
    hasNationality: true,
    hasDetailedPosition: true,
    squadDataConfidence: 'high' as const,
  }

  const low = computeInitialFootballIQValueMinor(lowInput)
  const high = computeInitialFootballIQValueMinor(highInput)

  assert.ok(low >= DEFAULT_INITIAL_VALUE_CONFIG.minPriceMinor)
  assert.ok(high <= DEFAULT_INITIAL_VALUE_CONFIG.maxPriceMinor)
})

test('missing data and low confidence reduce initial valuation', () => {
  const complete = computeInitialFootballIQValueMinor({
    providerPlayerId: 'comparison-player',
    positionGroup: 'DEF',
    age: 26,
    hasNationality: true,
    hasDetailedPosition: true,
    squadDataConfidence: 'high',
  })

  const incomplete = computeInitialFootballIQValueMinor({
    providerPlayerId: 'comparison-player',
    positionGroup: 'DEF',
    age: 26,
    hasNationality: false,
    hasDetailedPosition: false,
    squadDataConfidence: 'low',
  })

  assert.ok(incomplete < complete)
})
