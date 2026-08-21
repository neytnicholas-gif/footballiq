import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Make the Call product integration', () => {
  const catalogue = readFileSync('app/games/page.tsx', 'utf8')
  const quizCatalogue = readFileSync('app/quizzes/page.tsx', 'utf8')
  const header = readFileSync('components/site-header.tsx', 'utf8')
  const page = readFileSync('app/quizzes/start-bench-sell/page.tsx', 'utf8')
  const client = readFileSync('components/start-bench-sell-game.tsx', 'utf8')
  const route = readFileSync('app/api/quizzes/start-bench-sell/route.ts', 'utf8')
  const globalStyles = readFileSync('app/globals.css', 'utf8')

  it('is discoverable with the required route and metadata', () => {
    expect(catalogue).toContain("title: 'Make the Call'")
    expect(catalogue).toContain("href: '/quizzes/start-bench-sell'")
    expect(catalogue).toContain('MAKE_CALL_TOTAL_ROUNDS')
    expect(quizCatalogue).not.toContain("title: 'Make the Call'")
    expect(header).toContain("['Games', '/games']")
    expect(header).toContain("['Quizzes', '/quizzes']")
    expect(page).toContain('Make the Call: Start One, Bench One, Sell One | Early Shout')
    expect(page).toContain('alternates: { canonical }')
  })

  it('uses semantic, keyboard-operable selection controls and live announcements', () => {
    expect(client).toContain('aria-pressed={active}')
    expect(client).toContain('aria-label={`Assign an action to ${player.display_name}`}')
    expect(client).toContain('role="status" aria-live="polite"')
    expect(globalStyles).toContain('prefers-reduced-motion')
    expect(client).not.toContain('draggable=')
  })

  it('gates results behind a server-recorded vote and never accepts browser XP', () => {
    expect(route).toContain("identity.admin.rpc('submit_make_call_vote_private'")
    expect(route).not.toMatch(/body\.xp|p_xp/)
    expect(route).toContain("'Cache-Control': 'private, no-store, max-age=0'")
  })

  it('tracks only stable IDs and action labels, never player names or emails', () => {
    expect(client).toContain("track('player_assignment_changed'")
    expect(client).toContain('player_id: player.id')
    expect(client).not.toMatch(/track\([^\n]+display_name/)
  })
})
