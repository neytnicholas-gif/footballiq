// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260818080145_harden_beta_launch_gates.sql', 'utf8')
const limiterStart = migration.indexOf('create table if not exists public.api_rate_limits')
const limiterEnd = migration.indexOf('-- Re-publish only')
const limiterSql = migration.slice(limiterStart, limiterEnd)
const db = new PGlite()

describe('shared PostgreSQL rate limiter', () => {
  beforeAll(async () => {
    await db.exec('create role anon; create role authenticated; create role service_role;')
    await db.exec(limiterSql)
  })

  afterAll(async () => {
    await db.close()
  })

  it('admits exactly the shared limit under a parallel burst', async () => {
    const hash = 'a'.repeat(64)
    const claims = await Promise.all(Array.from({ length: 24 }, () => db.query<{ allowed: boolean }>(
      'select allowed from public.claim_api_rate_limit($1,$2,$3,$4)',
      ['contact', hash, 5, 3600],
    )))
    expect(claims.flatMap((result) => result.rows).filter((row) => row.allowed)).toHaveLength(5)
    expect(claims.flatMap((result) => result.rows).filter((row) => !row.allowed)).toHaveLength(19)
  })

  it('keeps a separate bucket for a different subject', async () => {
    const result = await db.query<{ allowed: boolean; remaining: number }>(
      'select * from public.claim_api_rate_limit($1,$2,$3,$4)',
      ['contact', 'b'.repeat(64), 5, 3600],
    )
    expect(result.rows[0]).toMatchObject({ allowed: true, remaining: 4 })
  })
})
