import { describe, expect, it } from 'vitest'
import { getClubHomeColour } from '@/components/market/club-colour-dot'

describe('club home-colour markers', () => {
  it('uses recognisable home colours for solid and striped clubs', () => {
    expect(getClubHomeColour('Chelsea')).toBe('#034694')
    expect(getClubHomeColour('Liverpool')).toBe('#c8102e')
    expect(getClubHomeColour('FC Barcelona')).toContain('#004d98')
    expect(getClubHomeColour('Real Betis')).toContain('#159447')
  })

  it('matches club names regardless of accents and casing', () => {
    expect(getClubHomeColour('Atlético de Madrid')).toBe(getClubHomeColour('ATLETICO DE MADRID'))
    expect(getClubHomeColour('Deportivo La Coruña')).toBe(getClubHomeColour('deportivo la coruna'))
  })

  it('gives future clubs a stable visible fallback', () => {
    expect(getClubHomeColour('Future United')).toMatch(/^hsl\(/)
    expect(getClubHomeColour('Future United')).toBe(getClubHomeColour('Future United'))
  })
})
