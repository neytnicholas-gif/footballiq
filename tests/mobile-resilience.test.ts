import { beforeEach, describe, expect, it, vi } from 'vitest'
import manifest from '@/app/manifest'
import { readResilientSessionNumber, writeResilientSessionNumber } from '@/lib/resilient-session'

const supabaseMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: supabaseMocks.getSession },
    from: supabaseMocks.from,
  },
}))

import { clearQuizProgress, loadQuizProgress, saveQuizProgress } from '@/lib/quiz-progress'

describe('installable mobile experience', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    supabaseMocks.getSession.mockReset()
    supabaseMocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('publishes correctly sized normal and maskable icons', () => {
    const value = manifest()
    expect(value.display).toBe('standalone')
    expect(value.scope).toBe('/')
    expect(value.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]))
    expect(value.shortcuts).toHaveLength(3)
  })

  it('restores a shuffled deck after session storage is cleared', () => {
    writeResilientSessionNumber('early-shout:test-deck', 918273)
    window.sessionStorage.clear()
    expect(readResilientSessionNumber('early-shout:test-deck')).toBe(918273)
  })

  it('keeps an anonymous round on the phone and can clear it', async () => {
    await saveQuizProgress({
      quizId: 'phone-round',
      currentIndex: 3,
      score: 2,
      total: 10,
      progress: { index: 3, answers: [1, 0, 2] },
    })

    const restored = await loadQuizProgress('phone-round')
    expect(restored).toMatchObject({ quiz_id: 'phone-round', current_index: 3, score: 2, user_id: 'guest' })

    await clearQuizProgress('phone-round')
    expect(await loadQuizProgress('phone-round')).toBeNull()
  })
})
