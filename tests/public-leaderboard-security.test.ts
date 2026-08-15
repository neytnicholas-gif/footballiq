import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260815130101_secure_public_leaderboards.sql', 'utf8')
const leaderboard = readFileSync('components/competitive-leaderboard.tsx', 'utf8')
const playerProfile = readFileSync('app/player/[username]/page.tsx', 'utf8')

describe('public leaderboard privacy contract', () => {
  it('publishes only narrow, hardened leaderboard functions', () => {
    expect(migration).toMatch(/create or replace function public\.get_public_profiles\([\s\S]*security definer[\s\S]*set search_path=pg_catalog,public/i)
    expect(migration).toMatch(/create or replace function public\.get_public_quiz_results\([\s\S]*security definer[\s\S]*set search_path=pg_catalog,public/i)
    expect(migration).toMatch(/revoke all on function public\.get_public_profiles\(uuid\[\],text\),public\.get_public_quiz_results\(date,date\)[\s\S]*from public,anon,authenticated,service_role/i)
    expect(migration).toMatch(/grant execute on function public\.get_public_profiles\(uuid\[\],text\),public\.get_public_quiz_results\(date,date\)[\s\S]*to anon,authenticated/i)
    expect(migration).toMatch(/limit 100/i)
    expect(migration).toMatch(/limit 2000/i)
  })

  it('removes public views and protects their source tables with owner-only reads', () => {
    expect(migration).toMatch(/create policy profiles_owner_read[\s\S]*for select to authenticated using \(\(select auth\.uid\(\)\)=id\)/i)
    expect(migration).toMatch(/create policy quiz_results_owner_read[\s\S]*for select to authenticated using \(\(select auth\.uid\(\)\)=user_id\)/i)
    expect(migration).toMatch(/revoke select on table public\.profiles,public\.quiz_results from public,anon,authenticated/i)
    expect(migration).toMatch(/drop view if exists public\.public_leaderboard_profiles/i)
    expect(migration).toMatch(/drop view if exists public\.public_leaderboard_quiz_results/i)
  })

  it('loads public pages through the narrow functions without table fallbacks', () => {
    expect(leaderboard).toMatch(/supabase\.rpc\('get_public_profiles'/)
    expect(leaderboard).toMatch(/supabase\.rpc\('get_public_quiz_results'/)
    expect(leaderboard).not.toMatch(/\.from\('profiles'\)|\.from\('quiz_results'\)|public_leaderboard_/)
    expect(playerProfile).toMatch(/supabase\.rpc\('get_public_profiles'/)
    expect(playerProfile).not.toMatch(/\.from\('profiles'\)|\.from\('quiz_results'\)|public_leaderboard_/)
  })
})
