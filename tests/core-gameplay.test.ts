import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getBrusselsDateISO,
  getBrusselsDateStartUtcIso,
  getBrusselsPeriodStartUtcIso,
} from '../lib/brussels-time'
import {
  buildCompletionKey,
  resetCompletionAttemptsForTests,
  saveQuizResult,
} from '../lib/quiz-save'

test('saveQuizResult reuses an in-flight completion attempt', async () => {
  resetCompletionAttemptsForTests()

  let calls = 0
  let release: (() => void) | null = null
  const rpc = async () => {
    calls += 1
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return { data: { ok: true }, error: null }
  }

  const firstAttempt = saveQuizResult(
    {
      quizId: 'referee-arena',
      score: 4,
      total: 5,
      xp: 72,
      completionKey: buildCompletionKey('referee-arena', 0),
    },
    { rpc },
  )
  const secondAttempt = saveQuizResult(
    {
      quizId: 'referee-arena',
      score: 4,
      total: 5,
      xp: 72,
      completionKey: buildCompletionKey('referee-arena', 0),
    },
    { rpc },
  )

  assert.equal(calls, 1)
  release!()

  const [firstResult, secondResult] = await Promise.all([firstAttempt, secondAttempt])
  assert.deepEqual(firstResult, { data: { ok: true }, error: null, skipped: false })
  assert.deepEqual(secondResult, firstResult)
})

test('saveQuizResult allows retry after a failed attempt with the same completion key', async () => {
  resetCompletionAttemptsForTests()

  let calls = 0
  const rpc = async () => {
    calls += 1
    if (calls === 1) {
      return { data: null, error: { message: 'Temporary failure' } }
    }

    return { data: { ok: true }, error: null }
  }

  const firstResult = await saveQuizResult(
    {
      quizId: 'daily-2026-08-01',
      score: 5,
      total: 5,
      xp: 110,
      completionKey: buildCompletionKey('daily-2026-08-01', 0),
    },
    { rpc },
  )
  const secondResult = await saveQuizResult(
    {
      quizId: 'daily-2026-08-01',
      score: 5,
      total: 5,
      xp: 110,
      completionKey: buildCompletionKey('daily-2026-08-01', 0),
    },
    { rpc },
  )

  assert.equal(calls, 2)
  assert.deepEqual(firstResult, {
    data: null,
    error: { message: 'Temporary failure' },
    skipped: false,
  })
  assert.deepEqual(secondResult, { data: { ok: true }, error: null, skipped: false })
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
