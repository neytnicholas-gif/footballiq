# FootballIQ Release 14-Day Plan

Plan date: July 27, 2026  
Scope: Legal, trust, Player Market foundation and public-beta readiness

## Completed in Sprint 4

- Implemented legal routes: Privacy, Terms, Copyright/Data Notice.
- Added centralized legal effective date and shared legal link management.
- Added footer legal navigation and about access.
- Completed trust-claim wording review pass.

## Completed in Sprint 5

- Implemented locally playable Player Market routes:
  - /market
  - /market/portfolio
  - /market/player/[slug]
- Added deterministic valuation engine with banking, caps, floor and duplicate-protection logic.
- Added server-side local market transaction authority (buy/sell/create portfolio) with daily limits, ownership limits and idempotency.
- Added market-specific leaderboard separated from quiz XP leaderboard.
- Prepared Supabase migration SQL for market schema, constraints, indexes, RLS and secure RPC functions.
- Added provider abstraction and API-Football adapter skeleton with retry/backoff/pagination framework.
- Added admin callable import and weekly-run endpoints with dry-run support.
- Added Player Market spec and import workflow documentation.

## Completed in Sprint 6

- Implemented polished market search and filtering including available-only and owned-only states.
- Expanded player profile with price graph, season stats section, recent matches section, valuation history, and transaction history.
- Expanded portfolio summary with weekly change, all-time profit, return percentage, and daily buy/sell remaining metrics.
- Implemented dedicated market leaderboard dimensions: portfolio value, weekly gain, all-time gain, return percent, and most profitable trader.
- Implemented administrator-only import dashboard route with dry-run/manual import and valuation controls.
- Connected import and weekly callable services to dashboard status and processing logs.
- Expanded market test suite for filters, leaderboard bundle, dashboard logs, and portfolio summary fields.

## Completed in Sprint 7A

- Implemented server-side Premier League competition discovery with explicit ambiguity blocking.
- Implemented provider-backed dry-run club import validation for the target 2026 season.
- Implemented provider-backed dry-run squad retrieval with pagination, retry, and rate-limit handling.
- Implemented normalized dry-run preview reporting with duplicates, unresolved records, and prospective changes.
- Added market import commands:
  - npm run market:discover
  - npm run market:import-squads:dry
  - npm run market:validate-squads
- Added mocked automated tests for discovery/import validation pathways.
- Kept database write mode disabled and migrations unapplied.

## Completed in Sprint 7B

- Implemented provider-backed fixture and player-stat retrieval for weekly dry runs.
- Added normalized weekly artifacts, validation, confidence checks, and unresolved-membership review handling.
- Added deterministic valuation preview generation without persistent database writes.
- Added administrator-only staged preview reporting.
- Added weekly import, resume, and validation commands plus mocked automated coverage.
- Kept persistent valuation execution, scheduler activation, and database writes disabled.

## Founder decisions still required

- Confirm governing law and jurisdiction for Terms.
- Confirm legal-owner process for privacy and rights requests.
- Approve final data retention windows.
- Confirm analytics/cookie consent by launch regions.
- Confirm Player Market launch policy and communications stance for demo-vs-live status.

## Items requiring legal review

- Competition naming and trademark reference format.
- Provider licensing scope for real player identity/stat usage.
- Source provenance for all quiz and market data.
- Public-facing market copy around virtual value and non-financial nature.
- Any future plan involving logos, crests, photos or broadcast footage.

## Production verification pending

- Apply and validate Supabase market migrations in a controlled environment.
- Configure provider credentials securely (server-side only).
- Complete provider mapping and 2026/27 verified squad import.
- End-to-end legal and licensing sign-off.
- Weekly scheduler deployment and runbook rehearsal.

## Remaining work by category

- Remaining API work: provider endpoint mapping completion for clubs, squads, fixtures, and player match stats.
- Remaining migration work: apply and verify 20260727_01 and 20260727_02 market migrations in non-production then production.
- Remaining legal work: provider rights confirmation, trademark usage review, and market launch wording sign-off.
- Remaining production work: scheduler hookup, credential rollout, observability checks, and go/no-go dry run.

## Phase status

- API adapter implemented: Yes
- Dry-run club import implemented: Yes
- Dry-run player import implemented: Yes
- Live provider test: Pending credentials in target environment
- Provider rights verification: Pending
- Database write mode: Disabled
- Public market live provider mode: Not enabled
- Weekly fixture/stat dry-run import: Implemented
- Weekly provider mapping verification: Pending credentials
- Valuation processing from weekly stats: Deferred to Sprint 7C

## Day-by-day execution outline (next 14 days)

1. Day 1-2: Review migration SQL with engineering and legal constraints checklist.
2. Day 3-4: Validate provider licensing terms and finalize allowed fields.
3. Day 5-6: Configure secure credentials in non-production environment.
4. Day 7-8: Run dry-run imports and resolve duplicate/unmapped players.
5. Day 9-10: Complete valuation and portfolio reconciliation checks on imported data.
6. Day 11-12: Execute legal sign-off on market-facing copy and risk register updates.
7. Day 13: Validate build, tests, route behavior, and market authorization boundaries.
8. Day 14: Go/no-go review with documented production blockers.

## Current release status

- Public-beta legal foundation: Implemented
- Player Market local demo foundation: Implemented
- Real squad import readiness: Partially implemented (awaiting credentials and rights verification)
- Production verification: Pending
- External legal certification: Not claimed
