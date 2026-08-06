import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const thisFilePath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(thisFilePath), '..')
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '20260802000100_staging_progression_integrity_repair.sql')
const usernamePagePath = path.join(repoRoot, 'app', 'username', 'page.tsx')

async function migration() {
  return readFile(migrationPath, 'utf8')
}

async function collectSqlFiles(dir: string, acc: string[] = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectSqlFiles(fullPath, acc)
      continue
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.sql')) {
      acc.push(fullPath)
    }
  }
  return acc
}

describe('progression integrity SQL guards', () => {
  it('completion keys are persisted and unique per user at database level', async () => {
    const sql = await migration()
    expect(sql).toMatch(/add column if not exists completion_key text/i)
    expect(sql).toMatch(/alter column completion_key set not null/i)
    expect(sql).toMatch(/char_length\(completion_key\) between 24 and 120/i)
    expect(sql).toMatch(/completion_key ~ '\^\[A-Za-z0-9:_-\]\+\$'/i)
    expect(sql).toMatch(/create unique index if not exists quiz_results_user_completion_key_idx\s+on public\.quiz_results\(user_id, completion_key\)/i)
  })

  it('complete_quiz is idempotent and concurrency-safe for duplicate completion keys', async () => {
    const sql = await migration()
    expect(sql).toMatch(/on conflict \(user_id, completion_key\) do nothing/i)
    expect(sql).toMatch(/get diagnostics inserted_count = row_count;/i)
    const duplicateGuardStart = sql.indexOf('if inserted_count = 0 then')
    const duplicateGuardEnd = sql.indexOf('end if;', duplicateGuardStart)
    const duplicateGuardSql = sql.slice(duplicateGuardStart, duplicateGuardEnd)
    expect(duplicateGuardSql).toMatch(/already_processed', true/i)
    expect(duplicateGuardSql).toMatch(/awarded', false/i)
  })

  it('server controls Brussels activity date and rejects anonymous completion', async () => {
    const sql = await migration()
    expect(sql).toMatch(/activity_day date := \(now\(\) at time zone 'Europe\/Brussels'\)::date;/i)
    expect(sql).not.toMatch(/p_activity_date/i)
    expect(sql).toMatch(/if uid is null then\s+raise exception 'Not authenticated';/i)
  })

  it('only the new complete_quiz signature is exposed to authenticated users', async () => {
    const sql = await migration()
    expect(sql).toMatch(/drop function if exists public\.complete_quiz\(text, integer, integer, integer, date\)/i)
    expect(sql).toMatch(/create or replace function public\.complete_quiz\([\s\S]*p_quiz_id text,[\s\S]*p_score integer,[\s\S]*p_total integer,[\s\S]*p_xp integer,[\s\S]*p_completion_key text/im)
    expect(sql).toMatch(/grant execute on function public\.complete_quiz\(text, integer, integer, integer, text\) to authenticated/i)
    expect(sql).not.toMatch(/grant execute on function public\.complete_quiz\(text, integer, integer, integer, date\)/i)
  })

  it('direct progression writes are hardened while username edit remains supported', async () => {
    const sql = await migration()
    const usernamePage = await readFile(usernamePagePath, 'utf8')

    expect(sql).toMatch(/revoke insert, update, delete on table public\.quiz_results from anon, authenticated/i)
    expect(sql).toMatch(/revoke insert, update, delete on table public\.mode_stats from anon, authenticated/i)
    expect(sql).toMatch(/revoke insert, update, delete on table public\.season_stats from anon, authenticated/i)
    expect(sql).toMatch(/revoke update on table public\.profiles from anon, authenticated/i)
    expect(sql).toMatch(/create or replace function public\.set_profile_username\(/i)
    expect(sql).toMatch(/grant execute on function public\.set_profile_username\(text\) to authenticated/i)
    expect(usernamePage).toMatch(/supabase\.rpc\('set_profile_username'/)
    expect(usernamePage).not.toMatch(/from\('profiles'\)\.upsert/)
  })

  it('repository SQL never defines or grants obsolete complete_quiz date signature except explicit DROP cleanup', async () => {
    const sqlFiles = await collectSqlFiles(repoRoot)

    const obsoleteSignature = /public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\)/i
    const obsoleteGrant = /grant\s+execute\s+on\s+function\s+public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\)\s+to\s+authenticated/i
    const obsoleteDefinition = /create\s+or\s+replace\s+function\s+public\.complete_quiz\([\s\S]*?p_activity_date\s+date/i
    const completeQuizDefinition = /create\s+or\s+replace\s+function\s+public\.complete_quiz\(/i

    let completeQuizDefinitionCount = 0
    let completeQuizGrantCount = 0

    for (const filePath of sqlFiles) {
      const sql = await readFile(filePath, 'utf8')
      if (filePath.endsWith('SUPABASE_BETA_GATE_HARDENING.sql')) continue

      expect(sql).not.toMatch(obsoleteGrant)
      expect(sql).not.toMatch(obsoleteDefinition)

      const lines = sql.split(/\r?\n/)
      for (const line of lines) {
        if (obsoleteSignature.test(line)) {
          const normalizedLine = line.trim().toLowerCase()
          expect(normalizedLine).toMatch(/^drop function if exists public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\);?$/)
        }
        obsoleteSignature.lastIndex = 0
      }

      if (completeQuizDefinition.test(sql)) {
        completeQuizDefinitionCount += 1
        expect(sql).toMatch(/p_completion_key\s+text/i)
        expect(sql).toMatch(/returns\s+jsonb/i)
      }

      const grantMatches = sql.match(/grant\s+execute\s+on\s+function\s+public\.complete_quiz\([^\)]*\)\s+to\s+authenticated/gi) ?? []
      completeQuizGrantCount += grantMatches.length
      for (const grant of grantMatches) {
        expect(grant).toMatch(/public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*text\)/i)
      }
    }

    expect(completeQuizDefinitionCount).toBeGreaterThan(0)
    expect(completeQuizGrantCount).toBeGreaterThan(0)
  })

  it('create_profile_for_new_user is trigger-only and helper functions pin safe search_path in authoritative SQL', async () => {
    const sqlFiles = await collectSqlFiles(repoRoot)

    const createProfileDef = /create\s+or\s+replace\s+function\s+public\.create_profile_for_new_user\(\)/i
    const createProfileGrant = /grant\s+execute\s+on\s+function\s+public\.create_profile_for_new_user\(\)/i
    const createProfileRevoke = /revoke\s+all\s+on\s+function\s+public\.create_profile_for_new_user\(\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i
    const modeHelperDef = /create\s+or\s+replace\s+function\s+public\.competitive_mode_from_quiz\(p_quiz_id\s+text\)[\s\S]*?set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i
    const seasonHelperDef = /create\s+or\s+replace\s+function\s+public\.current_footballiq_season\(p_date\s+date\)[\s\S]*?set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i

    let createProfileDefinitionCount = 0
    let modeHelperDefinitionCount = 0
    let seasonHelperDefinitionCount = 0

    for (const filePath of sqlFiles) {
      const sql = await readFile(filePath, 'utf8')
      if (filePath.endsWith('SUPABASE_BETA_GATE_HARDENING.sql')) continue
      if (createProfileGrant.test(sql)) {
        throw new Error(`${filePath} must not grant execute on create_profile_for_new_user()`)
      }

      if (createProfileDef.test(sql)) {
        createProfileDefinitionCount += 1
        expect(sql).toMatch(createProfileRevoke)
      }

      if (/create\s+or\s+replace\s+function\s+public\.competitive_mode_from_quiz\(p_quiz_id\s+text\)/i.test(sql)) {
        modeHelperDefinitionCount += 1
        expect(sql).toMatch(modeHelperDef)
      }

      if (/create\s+or\s+replace\s+function\s+public\.current_footballiq_season\(p_date\s+date\)/i.test(sql)) {
        seasonHelperDefinitionCount += 1
        expect(sql).toMatch(seasonHelperDef)
      }
    }

    expect(createProfileDefinitionCount).toBeGreaterThan(0)
    expect(modeHelperDefinitionCount).toBeGreaterThan(0)
    expect(seasonHelperDefinitionCount).toBeGreaterThan(0)
  })

  it('set_profile_username is permissioned and uses unambiguous profile id conflict handling', async () => {
    const sqlFiles = await collectSqlFiles(repoRoot)

    const setProfileDef = /create\s+or\s+replace\s+function\s+public\.set_profile_username\(/i
    const ambiguousConflict = /on\s+conflict\s*\(\s*id\s*\)\s*do\s+update/i
    const safeConflict = /on\s+conflict\s+on\s+constraint\s+profiles_pkey\s+do\s+update/i
    const secureSearchPath = /set\s+search_path\s*=\s*pg_catalog\s*,\s*public/i
    const secureRevoke = /revoke\s+all\s+on\s+function\s+public\.set_profile_username\(text\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i
    const authGrant = /grant\s+execute\s+on\s+function\s+public\.set_profile_username\(text\)\s+to\s+authenticated/i

    let definitionCount = 0

    for (const filePath of sqlFiles) {
      const sql = await readFile(filePath, 'utf8')
      if (filePath.endsWith('SUPABASE_BETA_GATE_HARDENING.sql')) continue
      if (!setProfileDef.test(sql)) continue

      definitionCount += 1
      expect(sql).not.toMatch(ambiguousConflict)
      expect(sql).toMatch(safeConflict)
      expect(sql).toMatch(secureSearchPath)
      expect(sql).toMatch(secureRevoke)
      expect(sql).toMatch(authGrant)
      expect(sql).toMatch(/select\s+p\.id\s+as\s+id\s*,\s*p\.username\s+as\s+username/i)
    }

    expect(definitionCount).toBeGreaterThan(0)
  })
})
