# FootballIQ Schema Consolidation — Phase 1

Status: repository inventory only. No SQL in this document has been applied to any database.

## Decision

`supabase/migrations/` is the canonical location for all future FootballIQ schema history.

The root-level SQL files remain preserved as legacy inputs until the deployed database has been inspected and reconciled. They are not migrations and must not be run in an arbitrary order.

## Current schema sources

| Source | Intended scope | Status |
| --- | --- | --- |
| `SUPABASE_SQL_TO_RUN.sql` | Early `profiles` setup | Legacy and incomplete |
| `FootballIQ_SUPABASE_COMPLETE_V6.sql` | Profiles, quiz results, predictions, triggers and quiz RPC | Legacy consolidation input |
| `SUPABASE_MASTER_SETUP.sql` | Same as the V6 file | Exact duplicate of `FootballIQ_SUPABASE_COMPLETE_V6.sql` |
| `FOOTBALLIQ_COMPETITIVE_PLATFORM.sql` | Mode and season statistics plus replacement quiz RPC | Legacy consolidation input; depends on the V6 objects |
| `supabase/migrations/20260727000100_player_market_foundation.sql` | Player Market tables, indexes and triggers | Prepared migration; documented as not applied |
| `supabase/migrations/20260727000200_player_market_security_and_functions.sql` | Player Market RLS, policies and RPC functions | Prepared migration; documented as not applied |

## Intended database object inventory

### Core

- Tables: `profiles`, `quiz_results`, `predictions`
- Functions: `set_updated_at`, `create_profile_for_new_user`, `complete_quiz`
- Triggers: profile/prediction update timestamps and new-auth-user profile creation
- Access model: public profile reads; owner writes; owner quiz/prediction access in the V6 source

### Competitive progression

- Tables: `mode_stats`, `season_stats`
- Functions: `competitive_mode_from_quiz`, `current_footballiq_season`
- Replaces `complete_quiz` with a version that also updates mode and season statistics
- Changes `quiz_results` from owner-only reads to public reads

### Player Market

- Tables: `market_seasons`, `market_clubs`, `market_players`,
  `market_player_match_stats`, `market_valuation_events`,
  `market_portfolios`, `market_holdings`, `market_transactions`,
  `market_daily_limits`, `market_settings`, `market_processing_runs`,
  and `market_import_logs`
- Functions: `market_create_or_get_portfolio`,
  `market_recalculate_portfolio_totals`, `market_buy_player`,
  `market_sell_player`, `market_process_valuation_event`, and
  `market_rebuild_leaderboard_values`
- RLS is enabled in the second migration
- Public read, owner read, authenticated RPC, and service-role write paths are separated

## Confirmed overlaps and drift

1. `FootballIQ_SUPABASE_COMPLETE_V6.sql` and `SUPABASE_MASTER_SETUP.sql`
   are byte-for-byte identical.
2. `SUPABASE_SQL_TO_RUN.sql` describes only an older six-column profile and
   overlaps with the fuller V6 profile definition.
3. `complete_quiz` is defined in both the V6 and competitive scripts; the
   competitive version is intended to replace the V6 version.
4. `set_updated_at` is defined in both the V6 source and Player Market
   foundation migration.
5. The handwritten `lib/supabase/types.ts` describes only part of `profiles`.
   It omits later profile fields and every other table, function and
   relationship.
6. The browser application uses both `lib/supabase.ts` and
   `lib/supabase/client.ts`, while server-side Market code uses
   `lib/supabase/server.ts`. The client strategy is not yet consolidated.
7. Mode identifiers and quiz-to-mode mapping are repeated in
   `lib/competitive.ts`, `components/mode-page.tsx`,
   individual quiz save calls, and `competitive_mode_from_quiz`.

## Security review gates

Before any migration is applied:

1. Inspect the deployed schema and migration history. Repository SQL alone is
   not proof of production state.
2. Confirm whether `quiz_results` should be private or publicly readable.
   Current scripts disagree.
3. Review every `security definer` function. Core functions currently lack
   explicit `REVOKE ... FROM PUBLIC`; Player Market functions include explicit
   revokes and narrower grants.
4. Confirm each owner-update policy has both `USING` and `WITH CHECK`.
5. Confirm every public/exposed table has RLS and the minimum required grants.
6. Account for Supabase's 2026 Data API exposure change: new tables may require
   explicit Data API grants in addition to RLS policies.
7. Run database advisors in a non-production environment before production.

## Safe consolidation sequence

1. Preserve all existing SQL files.
2. Connect read-only to the intended Supabase project and export:
   - migration history;
   - tables, columns, constraints and indexes;
   - functions and function privileges;
   - triggers;
   - RLS state, policies and grants.
3. Compare the deployed export with the object inventory above.
4. Use the Supabase CLI to create ordered baseline migrations; do not invent
   migration filenames manually.
5. Convert the V6 core schema into the first reconciled migration.
6. Convert competitive additions into a later migration that explicitly
   replaces the core `complete_quiz`.
7. Review and retain the two ordered Player Market migrations after resolving
   shared-function and privilege overlap.
8. Rebuild a clean local database from zero using only `supabase/migrations/`.
9. Generate `Database` types from that verified schema and wire one typed
   browser/server client strategy.
10. Run type-checking, tests, RLS tests and database advisors.
11. Only then prepare a staged non-production apply plan.

## Deliberately deferred

- No legacy SQL deletion or renaming
- No live or local migration execution
- No generated database types
- No Football Journey, Passport, qualifications or reputation schema
- No production grants, policies or function changes
