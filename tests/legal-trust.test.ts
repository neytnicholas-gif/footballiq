import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('legal and market trust guards', () => {
  it('keeps legal documents globally discoverable and acknowledged at signup', () => {
    const footer = read('components/site-footer.tsx')
    const signup = read('app/signup/page.tsx')
    const layout = read('app/layout.tsx')

    expect(layout).toContain('<SiteFooter />')
    expect(footer).toContain("href: '/terms'")
    expect(footer).toContain("href: '/privacy'")
    expect(footer).toContain("href: '/game-rules'")
    expect(signup).toContain('name="legalAcknowledgement"')
    expect(signup).toContain('type="checkbox" required')
  })

  it('does not expose simulated player data or financial-promotion copy in routed market UI', () => {
    const detailRoute = read('app/market/player/[slug]/page.tsx')
    const visibleMarket = [
      read('components/market/player-market-home.tsx'),
      read('components/market/player-market-browser.tsx'),
      read('components/market/player-market-portfolio.tsx'),
    ].join('\n')

    expect(detailRoute).not.toContain('sample-data')
    expect(detailRoute).not.toContain('buildSampleSeasonStats')
    expect(visibleMarket).not.toMatch(/\binvest(?:ing|ment|or)?\b/i)
    expect(visibleMarket).not.toMatch(/\bundervalued\b/i)
    expect(visibleMarket).not.toContain('Sportmonks verified')
  })

  it('keeps current quizzes and Academy experiences free while payments are disabled', () => {
    const freeExperienceRoutes = [
      'app/quizzes/referee-decisions/page.tsx',
      'app/quizzes/would-you-scout-him/page.tsx',
      'app/academy/scout/page.tsx',
      'app/academy/referee/page.tsx',
      'app/academy/scout/scout-room-player-evaluation/page.tsx',
      'app/academy/referee/referee-debrief-penalty-area/page.tsx',
      'components/academy/scout-room-experience.tsx',
      'components/academy/referee-debrief-experience.tsx',
    ].map(read).join('\n')
    const academy = read('lib/academy.ts')
    const accessRoadmap = read('app/pro/page.tsx')
    const footer = read('components/site-footer.tsx')

    expect(freeExperienceRoutes).not.toContain('ProAccessGate')
    expect(freeExperienceRoutes).not.toMatch(/Pro Scout Room|Pro Referee Debrief/)
    expect(academy).not.toContain("type: 'pro'")
    expect(accessRoadmap).toContain('No checkout')
    expect(footer).toContain('no payment is being collected')
  })

  it('does not leak operator setup instructions or misleading social links', () => {
    const leaderboard = read('components/competitive-leaderboard.tsx')
    const footer = read('components/site-footer.tsx')
    const header = read('components/site-header.tsx')

    expect(leaderboard).not.toContain('Run the included competitive-platform SQL')
    expect(footer).not.toMatch(/Instagram|YouTube|LinkedIn/)
    expect(header).not.toContain('text-slate-950')
  })
})
