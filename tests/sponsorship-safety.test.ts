import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ACTIVE_SPONSOR_CAMPAIGNS, getSponsorForPlacement } from '@/lib/sponsorship'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('sponsorship launch safety', () => {
  it('does not render a sponsor before a real campaign is configured', () => {
    expect(ACTIVE_SPONSOR_CAMPAIGNS).toEqual([])
    expect(getSponsorForPlacement('home')).toBeNull()
  })

  it('marks outbound sponsor links and does not include tracking scripts', () => {
    const placement = read('components/sponsor-placement.tsx')
    expect(placement).toContain('rel="sponsored noopener noreferrer"')
    expect(placement).not.toMatch(/pixel|doubleclick|googlesyndication|gtag/i)
  })

  it('keeps advertising disclosures in public legal pages', () => {
    expect(read('app/privacy/page.tsx')).toContain('Advertising and sponsorship')
    expect(read('app/terms/page.tsx')).toContain('Advertising and sponsors')
  })

  it('documents the automated-ad consent gate', () => {
    const plan = read('docs/SPONSORSHIP_LAUNCH_PLAN.md')
    expect(plan).toContain('Google-certified CMP')
    expect(plan).toContain('Do not add AdSense')
  })
})
