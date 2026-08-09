import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('Player Market launch gates', () => {
  it('serves the catalogue outside Preview with an authoritative opening baseline', () => {
    const route = read('app/api/market/catalogue/route.ts')
    expect(route).not.toContain("VERCEL_ENV !== 'preview'")
    expect(route).toContain('opening_price_minor')
  })

  it('never fakes authenticated trade success using anonymous state', () => {
    const client = read('lib/market/client.ts')
    const buy = client.slice(client.indexOf('export async function buyMarketPlayer'), client.indexOf('export async function sellMarketPlayer'))
    const sell = client.slice(client.indexOf('export async function sellMarketPlayer'), client.indexOf('export async function toggleMarketWatchlist'))
    expect(buy.match(/anonymousBuyPlayer/g)).toHaveLength(1)
    expect(sell.match(/anonymousSellPlayer/g)).toHaveLength(1)
    expect(buy).not.toContain('isMarketBackendUnavailable(error)')
    expect(sell).not.toContain('isMarketBackendUnavailable(error)')
  })

  it('removes obsolete RPCs and indexes rolling appearances', () => {
    const sql = read('supabase/migrations/20260809223000_close_final_market_launch_gates.sql')
    expect(sql).toContain('drop function if exists public.market_buy_player(uuid, text, integer)')
    expect(sql).toContain('drop function if exists public.market_sell_player(uuid, text)')
    expect(sql).toContain('market_player_match_stats_player_fixture_date_idx')
  })

  it('protects provider diagnostics and publishes security headers', () => {
    expect(read('app/api/market/sportmonks-trial/route.ts')).toContain('isMarketAdminRequest')
    expect(read('app/api/market/provider-trial/route.ts')).toContain('isMarketAdminRequest')
    expect(read('next.config.mjs')).toContain('Content-Security-Policy')
  })
})
