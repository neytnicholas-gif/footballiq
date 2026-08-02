import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getBrusselsDateISO,
  getBrusselsDateStartUtcIso,
  getBrusselsPeriodStartUtcIso,
} from '../lib/brussels-time'
import {
  buildCompletionKey,
  createCompletionRunId,
  isValidCompletionKey,
  resetCompletionAttemptsForTests,
  saveQuizResult,
} from '../lib/quiz-save'

test('saveQuizResult reuses an in-flight completion attempt', async () => {
  resetCompletionAttemptsForTests()

  let calls = 0
  let release: (() => void) | null = null
  const rpc = async (_functionName: 'complete_quiz', payload: { p_completion_key: string }) => {
    calls += 1
    assert.equal(isValidCompletionKey(payload.p_completion_key), true)
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return {
      data: {
        awarded: true,
        already_processed: false,
        completion_key: payload.p_completion_key,
        activity_date: '2026-08-01',
      },
      error: null,
    }
  }

  const runId = createCompletionRunId()
  const completionKey = buildCompletionKey('referee-arena', runId)

  const firstAttempt = saveQuizResult(
    {
      quizId: 'referee-arena',
      score: 4,
      total: 5,
      xp: 72,
      completionKey,
    },
    { rpc },
  )
  const secondAttempt = saveQuizResult(
    {
      quizId: 'referee-arena',
      score: 4,
      total: 5,
      xp: 72,
      completionKey,
    },
    { rpc },
  )

  assert.equal(calls, 1)
  release!()

  const [firstResult, secondResult] = await Promise.all([firstAttempt, secondAttempt])
  assert.deepEqual(firstResult, {
    data: {
      awarded: true,
      already_processed: false,
      completion_key: completionKey,
      activity_date: '2026-08-01',
    },
    error: null,
    skipped: false,
  })
  assert.deepEqual(secondResult, firstResult)
})

test('saveQuizResult allows retry after a failed attempt with the same completion key', async () => {
  resetCompletionAttemptsForTests()

  let calls = 0
  const rpc = async (_functionName: 'complete_quiz', payload: { p_completion_key: string; p_activity_date?: string }) => {
    calls += 1
    if (calls === 1) {
      return { data: null, error: { message: 'Temporary failure' } }
    }

    return {
      data: {
        awarded: true,
        already_processed: false,
        completion_key: payload.p_completion_key,
        activity_date: '2026-08-01',
      },
      error: null,
    }
  }

  const runId = createCompletionRunId()
  const completionKey = buildCompletionKey('daily-2026-08-01', runId)

  const firstResult = await saveQuizResult(
    {
      quizId: 'daily-2026-08-01',
      score: 5,
      total: 5,
      xp: 110,
      completionKey,
    },
    { rpc },
  )
  const secondResult = await saveQuizResult(
    {
      quizId: 'daily-2026-08-01',
      score: 5,
      total: 5,
      xp: 110,
      completionKey,
    },
    { rpc },
  )

  assert.equal(calls, 2)
  assert.equal(rpc.length >= 2, true)
  assert.deepEqual(firstResult, {
    data: null,
    error: { message: 'Temporary failure' },
    skipped: false,
  })
  assert.deepEqual(secondResult, {
    data: {
      awarded: true,
      already_processed: false,
      completion_key: completionKey,
      activity_date: '2026-08-01',
    },
    error: null,
    skipped: false,
  })
})

test('completion keys are stable within a run and different for a new replay run', () => {
  const firstRunId = createCompletionRunId()
  const firstKeyA = buildCompletionKey('referee-arena', firstRunId)
  const firstKeyB = buildCompletionKey('referee-arena', firstRunId)
  const secondRunId = createCompletionRunId()
  const secondKey = buildCompletionKey('referee-arena', secondRunId)

  assert.equal(firstKeyA, firstKeyB)
  assert.notEqual(secondRunId, firstRunId)
  assert.notEqual(secondKey, firstKeyA)
  assert.equal(isValidCompletionKey(firstKeyA), true)
  assert.throws(() => buildCompletionKey('referee arena', ''), /Invalid completion key format\./)
})

test('saveQuizResult sends completion key and omits client activity date payload', async () => {
  resetCompletionAttemptsForTests()

  let seenPayload: Record<string, unknown> | null = null
  const rpc = async (_functionName: 'complete_quiz', payload: Record<string, unknown>) => {
    seenPayload = payload
    return {
      data: {
        awarded: false,
        already_processed: true,
        completion_key: String(payload.p_completion_key),
        activity_date: '2026-08-01',
      },
      error: null,
    }
  }

  const completionKey = buildCompletionKey('referee-arena', createCompletionRunId())
  const result = await saveQuizResult({
    quizId: 'referee-arena',
    score: 3,
    total: 5,
    xp: 42,
    completionKey,
  }, { rpc })

  assert.equal(result.data?.already_processed, true)
  assert.equal(seenPayload?.['p_completion_key'], completionKey)
  assert.equal('p_activity_date' in (seenPayload ?? {}), false)
})

test('Brussels day and period helpers use Europe/Brussels boundaries', () => {
  assert.equal(getBrusselsDateISO('2026-08-01T21:59:59.000Z'), '2026-08-01')
  assert.equal(getBrusselsDateISO('2026-08-01T22:00:00.000Z'), '2026-08-02')

  assert.equal(getBrusselsDateStartUtcIso('2026-08-02'), '2026-08-01T22:00:00.000Z')
  assert.equal(
    getBrusselsPeriodStartUtcIso('weekly', '2026-08-05T10:00:00.000Z'),
    '2026-08-02T22:00:00.000Z',
  )
  assert.equal(
    getBrusselsPeriodStartUtcIso('monthly', '2026-11-15T09:30:00.000Z'),
    '2026-10-31T23:00:00.000Z',
  )
})
