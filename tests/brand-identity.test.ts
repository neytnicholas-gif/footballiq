import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Early Shout identity', () => {
  it('uses one canonical public name, message and currency split', () => {
    const brand = read('lib/brand.ts')
    const logo = read('components/logo.tsx')
    const home = read('app/page.tsx')
    const rules = read('app/game-rules/page.tsx')
    const rewards = read('components/market/market-progression-hub.tsx')

    expect(brand).toContain("name: 'Early Shout'")
    expect(brand).toContain("tagline: 'See it early. Make the call.'")
    expect(logo).toContain('Early <span className="brand-accent-text">Shout</span>')
    expect(home).toContain('>EARLY</span>')
    expect(home).toContain('>SHOUT.</span>')
    expect(rules).toContain('100m Market Credits')
    expect(rewards).toContain('Style Credits')
  })

  it('keeps established browser storage keys so existing players retain progress', () => {
    expect(read('components/account-prompt.tsx')).toContain("'footballiq-account-prompt-dismissed-v1'")
    expect(read('components/daily-challenge.tsx')).toContain("'footballiq-daily-history-v1'")
    expect(read('components/predictions-game.tsx')).toContain("'footballiq-prediction-history'")
  })

  it('offers the flagship Player Market first and keeps a quick guest game available', () => {
    const home = read('app/page.tsx')
    const duels = read('app/quizzes/football-duels/page.tsx')
    const duelPacks = read('lib/duel-packs.ts')
    const tour = read('components/onboarding-tour.tsx')

    expect(home).toContain('href="/quizzes/football-duels"')
    expect(home).toContain('PLAY PLAYER MARKET')
    expect(home).toContain('No sign-up')
    expect(home).toContain('href="/beta"')
    expect(home).not.toContain('first 100')
    expect(duelPacks).toContain("title: 'Daily Quick Play'")
    expect(duels).toContain('setSelected(dailyPack())')
    expect(tour).toContain("router.push('/market')")
    expect(tour).toContain('Open Player Market')
    expect(tour).toContain('Show me around')
    expect(read('components/account-prompt.tsx')).toContain("const playPaths = ['/quizzes', '/daily', '/predictions']")
    expect(read('components/duel-quiz.tsx')).toContain('Keep your score and {xpEarned} XP')
  })

  it('presents profile frames as a reversible player choice', () => {
    const rewards = read('components/market/market-progression-hub.tsx')

    expect(rewards).toContain('Frames are your choice.')
    expect(rewards).toContain('Preview the styles below')
    expect(rewards).toContain('Choose this frame')
    expect(rewards).toContain('You can swap at any time.')
    expect(rewards).not.toContain('It puts a new frame around your public profile card.')
  })

  it('removes the retired identity from public application source', () => {
    const publicSource = [
      'app/layout.tsx',
      'app/page.tsx',
      'app/terms/page.tsx',
      'app/privacy/page.tsx',
      'components/logo.tsx',
      'components/site-footer.tsx',
      'components/market/player-market-home.tsx',
      'components/market/player-market-browser.tsx',
      'components/market/player-market-portfolio.tsx',
      'components/market/player-market-detail.tsx',
      'app/api/market/catalogue/route.ts',
    ].map(read).join('\n')

    expect(publicSource).not.toMatch(/FootballIQ|Verdict XI|Back Your Eye|backyoureye|B\/Y/)
  })
})
