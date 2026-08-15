import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migrationPath = 'docs/proposed-migrations/20260806125316_market_real_performance_persistence.sql'
const sql = readFileSync(migrationPath, 'utf8')

describe('real-performance migration security contract', () => {
  it('keeps ingestion in a non-public schema with explicit end-user revocation and RLS', () => {
    expect(sql).toMatch(/create schema if not exists market_ingestion/i)
    expect(sql).toMatch(/revoke all on schema market_ingestion from public, anon, authenticated/i)
    expect(sql.match(/enable row level security/gi)?.length).toBeGreaterThanOrEqual(10)
    expect(sql).not.toMatch(/grant\s+(insert|update|delete|all)[^;]*\s+to\s+(anon|authenticated)/i)
  })

  it('enforces batch and event idempotency at the database layer', () => {
    expect(sql).toMatch(/unique \(provider_key, provider_batch_id\)/i)
    expect(sql).toMatch(/unique \(provider_key, payload_checksum\)/i)
    expect(sql).toMatch(/appearances_current_event_uidx/i)
    expect(sql).toMatch(/provider_key, provider_fixture_id, provider_player_id/i)
    expect(sql).toMatch(/value_updates_current_appearance_uidx/i)
  })

  it('retains versioned correction, quarantine and value-calculation history', () => {
    expect(sql).toMatch(/create table market_ingestion\.quarantined_records/i)
    expect(sql).toMatch(/create table market_ingestion\.corrections/i)
    expect(sql).toMatch(/supersedes_appearance_id/i)
    expect(sql).toMatch(/calculation_generation/i)
    expect(sql).toMatch(/supersedes_value_update_id/i)
    expect(sql).toMatch(/create table market_ingestion\.revaluation_requests/i)
  })

  it('does not activate providers or insert provider data', () => {
    expect(sql).toMatch(/enabled boolean not null default false/i)
    expect(sql).not.toMatch(/insert\s+into\s+market_ingestion\.(providers|provider_players|provider_fixtures|appearances)/i)
  })
})
