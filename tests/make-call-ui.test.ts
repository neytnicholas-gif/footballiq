import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StartBenchSellGame } from '@/components/start-bench-sell-game'
import type { MakeCallSnapshot } from '@/lib/make-call'

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({ session: null, user: null, loading: false, refreshProfile: vi.fn() }),
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

const playerIds = [
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000013',
]

const initial: MakeCallSnapshot = {
  matchup: {
    id: '10000000-0000-4000-8000-000000000001',
    slug: 'mbappe-haaland-yamal',
    prompt: 'Start one. Bench one. Sell one.',
    players: [
      { id: playerIds[0]!, stable_player_id: 'mbappe', display_name: 'Kylian Mbappé', short_name: 'Mbappé', club_name: 'Real Madrid', position_label: 'Forward', initials: 'KM', accent_from: '#1d4ed8', accent_to: '#ffffff' },
      { id: playerIds[1]!, stable_player_id: 'haaland', display_name: 'Erling Haaland', short_name: 'Haaland', club_name: 'Manchester City', position_label: 'Forward', initials: 'EH', accent_from: '#7dd3fc', accent_to: '#ffffff' },
      { id: playerIds[2]!, stable_player_id: 'yamal', display_name: 'Lamine Yamal', short_name: 'Yamal', club_name: 'Barcelona', position_label: 'Forward', initials: 'LY', accent_from: '#be123c', accent_to: '#1e3a8a' },
    ],
  },
  vote: null,
  results: null,
  xp: { daily_total: 0, daily_cap: 15 },
}

function response(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function buttonWithText(container: HTMLElement, text: string) {
  const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(text))
  if (!button) throw new Error(`Button not found: ${text}`)
  return button as HTMLButtonElement
}

function choose(container: HTMLElement, playerName: string, action: 'START' | 'BENCH' | 'SELL') {
  const group = container.querySelector(`[aria-label="Assign an action to ${playerName}"]`)
  if (!group) throw new Error(`Player controls not found: ${playerName}`)
  const button = [...group.querySelectorAll('button')].find((candidate) => candidate.textContent?.includes(action))
  if (!button) throw new Error(`${action} control not found for ${playerName}`)
  button.click()
}

describe('Make the Call browser interaction', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('keeps choices after a failed save, retries, then reveals genuine results', async () => {
    const completed: MakeCallSnapshot = {
      ...initial,
      vote: { start_player_id: playerIds[0]!, bench_player_id: playerIds[1]!, sell_player_id: playerIds[2]! },
      results: {
        sample_size: 3,
        start_counts: { [playerIds[0]!]: 2, [playerIds[1]!]: 1, [playerIds[2]!]: 0 },
        bench_counts: { [playerIds[0]!]: 1, [playerIds[1]!]: 2, [playerIds[2]!]: 0 },
        sell_counts: { [playerIds[0]!]: 0, [playerIds[1]!]: 0, [playerIds[2]!]: 3 },
        exact_count: 2,
      },
      xp_awarded_now: 0,
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(initial))
      .mockResolvedValueOnce(response({ error: 'Temporary save problem.' }, false))
      .mockResolvedValueOnce(response(completed))
    vi.stubGlobal('fetch', fetchMock)

    await act(async () => root.render(createElement(StartBenchSellGame)))
    await settle()

    const submit = buttonWithText(container, 'Make the Call')
    expect(submit.disabled).toBe(true)
    await act(async () => {
      choose(container, 'Kylian Mbappé', 'START')
      choose(container, 'Erling Haaland', 'BENCH')
      choose(container, 'Lamine Yamal', 'SELL')
    })
    expect(submit.disabled).toBe(false)

    await act(async () => submit.click())
    await settle()
    expect(container.textContent).toContain('Temporary save problem. Your choices are still here.')
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(3)

    await act(async () => buttonWithText(container, 'Make the Call').click())
    await settle()
    expect(container.textContent).toContain('Your verdict')
    expect(container.textContent).toContain('Early results — based on 3 calls.')
    expect(container.textContent).toContain('67% agreed')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
