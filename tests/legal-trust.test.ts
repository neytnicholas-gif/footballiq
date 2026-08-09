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
})
