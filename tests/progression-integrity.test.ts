import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const migrationUrl = new URL('../supabase/migrations/20260802000100_staging_progression_integrity_repair.sql', import.meta.url)
const usernamePageUrl = new URL('../app/username/page.tsx', import.meta.url)

async function migration() {
  return readFile(migrationUrl, 'utf8')
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

test('completion keys are persisted and unique per user at database level', async () => {
  const sql = await migration()
  assert.match(sql, /add column if not exists completion_key text/i)
  assert.match(sql, /alter column completion_key set not null/i)
  assert.match(sql, /char_length\(completion_key\) between 24 and 120/i)
  assert.match(sql, /completion_key ~ '\^\[A-Za-z0-9:_-\]\+\$'/i)
  assert.match(sql, /create unique index if not exists quiz_results_user_completion_key_idx\s+on public\.quiz_results\(user_id, completion_key\)/i)
})

test('complete_quiz is idempotent and concurrency-safe for duplicate completion keys', async () => {
  const sql = await migration()
  assert.match(sql, /on conflict \(user_id, completion_key\) do nothing/i)
  assert.match(sql, /get diagnostics inserted_count = row_count;/i)
  const duplicateGuardStart = sql.indexOf('if inserted_count = 0 then')
  const duplicateGuardEnd = sql.indexOf('end if;', duplicateGuardStart)
  const duplicateGuardSql = sql.slice(duplicateGuardStart, duplicateGuardEnd)
  assert.match(duplicateGuardSql, /already_processed', true/i)
  assert.match(duplicateGuardSql, /awarded', false/i)

  const afterGuard = sql.slice(duplicateGuardEnd)
  assert.match(afterGuard, /insert into public\.mode_stats/i)
  assert.match(afterGuard, /insert into public\.season_stats/i)
})

test('server controls Brussels activity date and rejects anonymous completion', async () => {
  const sql = await migration()
  assert.match(sql, /activity_day date := \(now\(\) at time zone 'Europe\/Brussels'\)::date;/i)
  assert.doesNotMatch(sql, /p_activity_date/i)
  assert.match(sql, /if uid is null then\s+raise exception 'Not authenticated';/i)
})

test('only the new complete_quiz signature is exposed to authenticated users', async () => {
  const sql = await migration()
  assert.match(sql, /drop function if exists public\.complete_quiz\(text, integer, integer, integer, date\)/i)
  assert.match(sql, /create or replace function public\.complete_quiz\([\s\S]*p_quiz_id text,[\s\S]*p_score integer,[\s\S]*p_total integer,[\s\S]*p_xp integer,[\s\S]*p_completion_key text/im)
  assert.match(sql, /grant execute on function public\.complete_quiz\(text, integer, integer, integer, text\) to authenticated/i)
  assert.doesNotMatch(sql, /grant execute on function public\.complete_quiz\(text, integer, integer, integer, date\)/i)
})

test('direct progression writes are hardened while username edit remains supported', async () => {
  const sql = await migration()
  const usernamePage = await readFile(usernamePageUrl, 'utf8')

  assert.match(sql, /revoke insert, update, delete on table public\.quiz_results from anon, authenticated/i)
  assert.match(sql, /revoke insert, update, delete on table public\.mode_stats from anon, authenticated/i)
  assert.match(sql, /revoke insert, update, delete on table public\.season_stats from anon, authenticated/i)
  assert.match(sql, /revoke update on table public\.profiles from anon, authenticated/i)
  assert.match(sql, /create or replace function public\.set_profile_username\(/i)
  assert.match(sql, /grant execute on function public\.set_profile_username\(text\) to authenticated/i)

  assert.match(usernamePage, /supabase\.rpc\('set_profile_username'/)
  assert.doesNotMatch(usernamePage, /from\('profiles'\)\.upsert/)
})

test('repository SQL never defines or grants obsolete complete_quiz date signature except explicit DROP cleanup', async () => {
  const thisFilePath = fileURLToPath(import.meta.url)
  const repoRoot = path.resolve(path.dirname(thisFilePath), '..')
  const sqlFiles = await collectSqlFiles(repoRoot)

  const obsoleteSignature = /public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\)/i
  const obsoleteGrant = /grant\s+execute\s+on\s+function\s+public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\)\s+to\s+authenticated/i
  const obsoleteDefinition = /create\s+or\s+replace\s+function\s+public\.complete_quiz\([\s\S]*?p_activity_date\s+date/i
  const completeQuizDefinition = /create\s+or\s+replace\s+function\s+public\.complete_quiz\(/i

  let completeQuizDefinitionCount = 0
  let completeQuizGrantCount = 0

  for (const filePath of sqlFiles) {
    const sql = await readFile(filePath, 'utf8')
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase()

    assert.doesNotMatch(sql, obsoleteGrant, `${normalizedPath} grants obsolete complete_quiz date signature`)
    assert.doesNotMatch(sql, obsoleteDefinition, `${normalizedPath} defines obsolete complete_quiz date signature`)

    const lines = sql.split(/\r?\n/)
    for (const line of lines) {
      if (obsoleteSignature.test(line)) {
        const normalizedLine = line.trim().toLowerCase()
        assert.match(
          normalizedLine,
          /^drop function if exists public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*date\);?$/,
          `${normalizedPath} contains obsolete signature outside explicit DROP FUNCTION cleanup`,
        )
      }
      obsoleteSignature.lastIndex = 0
    }

    if (completeQuizDefinition.test(sql)) {
      completeQuizDefinitionCount += 1
      assert.match(sql, /p_completion_key\s+text/i, `${normalizedPath} complete_quiz must accept p_completion_key text`)
      assert.match(sql, /returns\s+jsonb/i, `${normalizedPath} complete_quiz must return jsonb result structure`)
    }

    const grantMatches = sql.match(/grant\s+execute\s+on\s+function\s+public\.complete_quiz\([^\)]*\)\s+to\s+authenticated/gi) ?? []
    completeQuizGrantCount += grantMatches.length
    for (const grant of grantMatches) {
      assert.match(
        grant,
        /public\.complete_quiz\(text,\s*integer,\s*integer,\s*integer,\s*text\)/i,
        `${normalizedPath} uses non-authoritative complete_quiz grant signature`,
      )
    }
  }

  assert.ok(completeQuizDefinitionCount > 0, 'expected at least one complete_quiz definition in repository SQL')
  assert.ok(completeQuizGrantCount > 0, 'expected at least one complete_quiz authenticated grant in repository SQL')
})
