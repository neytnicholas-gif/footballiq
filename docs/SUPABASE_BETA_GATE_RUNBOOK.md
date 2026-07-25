# Supabase Beta Gate Runbook

Date: 2026-07-25
Owner goal: apply Beta Gate safely, with one unambiguous execution order and no surprise behavior changes.

## Scope of reviewed SQL

Reviewed files:
- SUPABASE_MASTER_SETUP.sql
- FootballIQ_SUPABASE_COMPLETE_V6.sql
- FOOTBALLIQ_COMPETITIVE_PLATFORM.sql
- SUPABASE_QUIZ_PROGRESS_V1.sql
- SUPABASE_BETA_GATE_HARDENING.sql
- SUPABASE_BETA_GATE_RLS_PUBLIC_VIEWS.sql
- SUPABASE_SQL_TO_RUN.sql

## Canonical execution order

Apply exactly this order in Supabase SQL editor:

1. SUPABASE_MASTER_SETUP.sql
2. FOOTBALLIQ_COMPETITIVE_PLATFORM.sql
3. SUPABASE_QUIZ_PROGRESS_V1.sql
4. SUPABASE_BETA_GATE_HARDENING.sql
5. SUPABASE_BETA_GATE_RLS_PUBLIC_VIEWS.sql

Alternative for step 1 only:
- If your project historically uses FootballIQ_SUPABASE_COMPLETE_V6.sql instead of SUPABASE_MASTER_SETUP.sql, run that file and skip SUPABASE_MASTER_SETUP.sql.
- Never run both in the same environment.

## SQL to NOT apply now

- SUPABASE_SQL_TO_RUN.sql should not be applied to production for Beta Gate.
Reason: it is a legacy partial bootstrap and defines a reduced public_leaderboard_profiles view shape (uses streak only) that is inconsistent with the current app-facing public profile view contract.

## Why each migration is required

1) SUPABASE_MASTER_SETUP.sql
- Creates core tables and base RLS/policies for profiles, quiz_results, predictions.
- Provides baseline complete_quiz function and profile bootstrap trigger.
- Required dependency for all later Beta Gate scripts.

2) FOOTBALLIQ_COMPETITIVE_PLATFORM.sql
- Adds competitive tables mode_stats and season_stats.
- Adds activity_date and attempt_id columns to quiz_results.
- Adds indexes for leaderboard and completion read paths.
- Defines competitive helper functions and competitive-aware complete_quiz signature.
- Adds public_leaderboard_quiz_results view grant.

3) SUPABASE_QUIZ_PROGRESS_V1.sql
- Adds quiz_progress table + owner-only RLS for save/resume state.
- Required for in-progress resume banners and state restoration in signed-in flows.

4) SUPABASE_BETA_GATE_HARDENING.sql
- Canonical hardening migration for idempotent reward writes.
- Backfills activity_date for legacy rows.
- Removes historical duplicate quiz_results rows before uniqueness enforcement.
- Replaces complete_quiz with the final attempt-aware, idempotent function.
- Adds/ensures reward-integrity and query indexes.

5) SUPABASE_BETA_GATE_RLS_PUBLIC_VIEWS.sql
- Enforces owner-only profile and quiz_results reads.
- Recreates public leaderboard views with only allowed public fields.
- Grants select on public views to anon/authenticated.

## Rerun safety

- SUPABASE_MASTER_SETUP.sql: intended idempotent, safe to rerun.
- FootballIQ_SUPABASE_COMPLETE_V6.sql: intended idempotent, safe to rerun.
- FOOTBALLIQ_COMPETITIVE_PLATFORM.sql: intended safe to rerun (if exists, create or replace, add column if not exists).
- SUPABASE_QUIZ_PROGRESS_V1.sql: safe to rerun.
- SUPABASE_BETA_GATE_HARDENING.sql: explicitly idempotent and safe to rerun.
- SUPABASE_BETA_GATE_RLS_PUBLIC_VIEWS.sql: safe to rerun.
- SUPABASE_SQL_TO_RUN.sql: do not use for this rollout.

## What each script changes

SUPABASE_MASTER_SETUP.sql
- Tables: profiles, quiz_results, predictions.
- RLS/policies: owner read/write policies for those tables.
- Functions/triggers: set_updated_at, create_profile_for_new_user, complete_quiz (base signature).
- Views: public_leaderboard_profiles.
- Indexes/constraints: quiz_results_first_completion and supporting uniques.

FootballIQ_SUPABASE_COMPLETE_V6.sql
- Same baseline object family as SUPABASE_MASTER_SETUP.sql.
- Treat as alternate baseline, not additive requirement.

FOOTBALLIQ_COMPETITIVE_PLATFORM.sql
- Tables: mode_stats, season_stats.
- Columns: quiz_results.attempt_id, quiz_results.activity_date.
- Views: public_leaderboard_quiz_results.
- Indexes: quiz_results_first_completion, quiz_results_attempt_once, quiz_results_activity_date_idx, quiz_results_completed_idx, quiz_results_user_completed_idx, mode/season leaderboard indexes.
- Functions: competitive_mode_from_quiz, current_footballiq_season, complete_quiz (attempt-aware signature).
- Policies: public read on mode_stats and season_stats.

SUPABASE_QUIZ_PROGRESS_V1.sql
- Table: quiz_progress.
- Policies: owner-only select/insert/update/delete.
- Indexes: quiz_progress_user_updated_idx.

SUPABASE_BETA_GATE_HARDENING.sql
- Columns: ensures attempt_id/activity_date on quiz_results.
- Data correction: backfill activity_date, deduplicate user_id+quiz_id rows.
- Indexes: reward and read-path indexes (same canonical names).
- Functions: canonical complete_quiz replacement with idempotent insert guard and conditional mode/season updates.

SUPABASE_BETA_GATE_RLS_PUBLIC_VIEWS.sql
- Policies: removes broad-read policies; enforces owner-only reads for profiles and quiz_results.
- Views: canonical public_leaderboard_profiles and public_leaderboard_quiz_results.
- Grants: select on both public views.

## Dependencies and overlap resolution

- SUPABASE_MASTER_SETUP.sql and FootballIQ_SUPABASE_COMPLETE_V6.sql overlap heavily. Use exactly one as baseline.
- FOOTBALLIQ_COMPETITIVE_PLATFORM.sql and SUPABASE_BETA_GATE_HARDENING.sql both define complete_quiz and some indexes/columns.
Resolution: run both in canonical order above; treat SUPABASE_BETA_GATE_HARDENING.sql as final authority for complete_quiz behavior.
- public_leaderboard_quiz_results appears in both competitive and RLS files. Recreate is intentional; last file enforces final public-surface policy posture.

## Verification queries (safe SELECT only)

Run after each step.

After step 1 baseline:
```sql
select to_regclass('public.profiles') as profiles,
       to_regclass('public.quiz_results') as quiz_results,
       to_regclass('public.predictions') as predictions;

select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('complete_quiz', 'set_updated_at', 'create_profile_for_new_user')
order by proname;
```

After step 2 competitive:
```sql
select to_regclass('public.mode_stats') as mode_stats,
       to_regclass('public.season_stats') as season_stats,
       to_regclass('public.public_leaderboard_quiz_results') as public_leaderboard_quiz_results;

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'quiz_results'
  and column_name in ('attempt_id', 'activity_date')
order by column_name;
```

After step 3 quiz progress:
```sql
select to_regclass('public.quiz_progress') as quiz_progress;

select policyname, permissive, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'quiz_progress'
order by policyname;
```

After step 4 hardening:
```sql
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'quiz_results'
  and indexname in (
    'quiz_results_first_completion',
    'quiz_results_attempt_once',
    'quiz_results_activity_date_idx',
    'quiz_results_completed_idx',
    'quiz_results_user_completed_idx'
  )
order by indexname;

select proname, oid::regprocedure::text as signature
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'complete_quiz'
order by signature;
```

After step 5 RLS + public views:
```sql
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'quiz_results')
order by tablename, policyname;

select to_regclass('public.public_leaderboard_profiles') as public_leaderboard_profiles,
       to_regclass('public.public_leaderboard_quiz_results') as public_leaderboard_quiz_results;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('public_leaderboard_profiles', 'public_leaderboard_quiz_results')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee;
```

## Rollback and recovery notes

- Recommended precondition: take a Supabase project backup/snapshot before step 4 and step 5.
- Most schema statements are additive/idempotent; practical rollback is usually restore-from-backup.
- If a policy change causes unexpected lockout, reapply step 1 baseline then step 5 to restore intended policy/view state.
- If complete_quiz behavior regresses, re-run step 4 to restore canonical function and reward-integrity indexes.

## Pre-migration app behavior impact

Before steps 4 and 5 are applied:
- App should still run.
- Expected degradation risk:
  - reward idempotency is weaker (double-credit risk under race conditions),
  - activity_date-based daily/period aggregation can be inconsistent,
  - privacy posture may still be broader than intended until RLS tightening and public view policy is applied.

After full order is applied:
- App behavior aligns with current beta-gate code assumptions for save/resume, duplicate-reward protection, and public leaderboard exposure.
