// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260813120000_secure_quiz_completion_tickets.sql', 'utf8')
const db = new PGlite()
const userId = '10000000-0000-0000-0000-000000000001'
const key = 'cqk:ticket-test:run-123456789012345678901234'

describe('quiz completion ticket database boundary', () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create role service_role nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table public.quiz_results(
        user_id uuid not null,
        completion_key text not null,
        primary key(user_id,completion_key)
      );
      create function public.complete_quiz(
        p_quiz_id text,p_score integer,p_total integer,p_xp integer,p_completion_key text
      ) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
      begin
        insert into public.quiz_results values(auth.uid(),p_completion_key)
        on conflict do nothing;
        return jsonb_build_object('awarded',true,'already_processed',false,'completion_key',p_completion_key);
      end $$;
      insert into auth.users values('${userId}');
    `)
    await db.exec(migration)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [userId])
  })

  afterAll(async () => db.close())

  it('rejects a direct reward call without a server ticket', async () => {
    await expect(db.query('select public.complete_quiz($1,$2,$3,$4,$5)', [
      'daily-2026-08-13', 5, 5, 110, key,
    ])).rejects.toThrow('not authorised by the server')
  })

  it('consumes an exact ticket once and returns an idempotent retry', async () => {
    await db.query(`insert into public.quiz_completion_tickets(
      user_id,completion_key,quiz_id,score,total,xp_earned,expires_at
    ) values($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')`, [
      userId, key, 'daily-2026-08-13', 5, 5, 110,
    ])

    const first = await db.query<{ result: { awarded: boolean; already_processed: boolean } }>(
      'select public.complete_quiz($1,$2,$3,$4,$5) result',
      ['daily-2026-08-13', 5, 5, 110, key],
    )
    expect(first.rows[0]!.result).toMatchObject({ awarded: true, already_processed: false })

    const retry = await db.query<{ result: { awarded: boolean; already_processed: boolean } }>(
      'select public.complete_quiz($1,$2,$3,$4,$5) result',
      ['daily-2026-08-13', 5, 5, 110, key],
    )
    expect(retry.rows[0]!.result).toMatchObject({ awarded: false, already_processed: true })
  })

  it('rejects a browser claim that does not match the ticket', async () => {
    const mismatchKey = 'cqk:ticket-test:run-999999999999999999999999'
    await db.query(`insert into public.quiz_completion_tickets(
      user_id,completion_key,quiz_id,score,total,xp_earned,expires_at
    ) values($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')`, [
      userId, mismatchKey, 'daily-2026-08-13', 3, 5, 50,
    ])
    await expect(db.query('select public.complete_quiz($1,$2,$3,$4,$5)', [
      'daily-2026-08-13', 5, 5, 110, mismatchKey,
    ])).rejects.toThrow('does not match')
  })
})
