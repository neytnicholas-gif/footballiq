# FootballIQ Player Market Specification

Last updated: July 27, 2026

## Purpose

Build a football player valuation and portfolio game using virtual FIQ funds. The system is designed to be locally playable with development-season import artifacts while preparing for licensed real-world 2026/27 season data imports.

## Current status summary

- Implemented: Market browse route, player detail route, portfolio route, dedicated market leaderboard, deterministic valuation module, server-side local transaction authority, admin import dashboard route, provider-backed competition discovery, and provider-backed dry-run club and squad import validation.
- Public catalogue available: No. Public browsing fails closed until a licensed, current and provenance-backed 2026/27 catalogue is approved.
- Developer-only data: Cached dry-run and fictional seed records remain isolated for automated tests and import-development work; they are not public catalogue inputs.
- Awaiting database migration: Yes. Supabase migration files are prepared but not applied.
- Awaiting API credentials: Yes. Provider adapter requires server-side API_FOOTBALL_KEY and endpoint configuration.
- Awaiting real squad import write mode: Yes. Real provider retrieval and normalization are implemented in dry-run mode, but staging/production writes remain disabled in Sprint 7A.
- Awaiting provider-rights verification: Yes. Human verification required for licensing scope and permitted data fields.
- Awaiting deployment: Yes.
- Awaiting production verification: Yes.

## Sprint 6 implemented features

- Search and filter: player name, club, position, alphabetical, highest value, lowest value, biggest risers, biggest fallers, available-only, owned-only.
- Player profile: abstract club icon, valuation visualisation, price graph, season stats section, recent matches section, valuation history table, transaction history section, buy/sell controls, last updated.
- Portfolio summary: cash remaining, total value, weekly change, all-time profit, holdings list, average purchase price, current value, P/L, percentage return, remaining buys and sales.
- Dedicated leaderboard dimensions: portfolio value, weekly gain, all-time gain, return percent, most profitable trader.
- Import dashboard: provider, last import, last valuation, last fixture processed, queued fixtures, processing log, dry-run and manual controls.

## Awaiting API, migration, and production gates

- Awaiting API verification: fixture and per-match statistics mappings are implemented for
  dry-run processing but still require credentialed provider validation.
- Awaiting migrations: schema and RLS SQL prepared in supabase/migrations but not applied in this sprint.
- Awaiting production: scheduler wiring, database migration apply/verify, legal sign-off, provider rights sign-off.

## Sprint 7A status classification

- API adapter implemented: Yes, for Premier League discovery and squad retrieval.
- Dry-run club import implemented: Yes.
- Dry-run player import implemented: Yes.
- Live provider test complete: Pending environment credentials.
- Provider rights verified: No, still pending documented legal confirmation.
- Migrations applied: No.
- Database write mode enabled: No, explicitly blocked.
- Public live market data enabled: No.
- Weekly statistics import: Sprint 7B dry-run and validation workflow implemented.
- Valuation processing on real weekly stats: Deferred to Sprint 7C.

## Core game rules implemented in local server authority

- Configurable virtual starting balance.
- Maximum five owned players.
- Maximum three daily purchases.
- Maximum three daily sales.
- No overspending.
- No duplicate ownership of same player.
- No selling unowned player.
- Server-authoritative execution price.
- Idempotent transaction handling.
- Portfolio totals: cash + holdings value.
- Holding and total P/L tracking.
- Transaction history retained in local in-memory state for development.
- Anonymous browsing enabled.
- Auth required for portfolio actions.

## Architecture overview

- Domain layer: lib/market/types.ts, settings.ts, decimal.ts, valuation-engine.ts.
- Local playable authority: lib/market/demo-store.ts.
- Server actions for account-gated operations: app/market/actions.ts.
- UI routes:
  - /market
  - /market/portfolio
  - /market/player/[slug]
  - /market/admin (administrator only)
- Market UI components under components/market.
- Provider abstraction and API-Football adapter skeleton under lib/market/provider.
- Admin job endpoints:
  - POST /api/market/admin/import
  - POST /api/market/admin/weekly-run

## Data model targets

Prepared in migration SQL:

- market_seasons
- market_clubs
- market_players
- market_player_match_stats
- market_valuation_events
- market_portfolios
- market_holdings
- market_transactions
- market_daily_limits
- market_settings
- market_processing_runs
- market_import_logs

Currency values use integer minor units for deterministic arithmetic.

## Valuation engine rules

Current rule set in code:

- Baseline rating: 7.0
- Rating delta: rating - baseline
- Price step: 0.1 FIQ
- Performance bank persists across matches
- Each +1.0 bank -> +0.1 FIQ
- Each -1.0 bank -> -0.1 FIQ
- Remainders remain in bank
- Minutes thresholds gate valuation movement
- Minimum price floor enforced
- Maximum price ceiling enforced
- Weekly movement cap enforced
- Duplicate stat id processing blocked
- Calculation version included in results for auditability

## Development-only initial FootballIQ values

- Initial local player values are computed deterministically from development import data.
- Inputs include position group, optional age band, data completeness flags, confidence level, and stable provider id spread.
- Output is bounded between configured min/max values for safe local gameplay.
- These values are development-only placeholders and are not production claims about real 2026/27 market values.

## Security model (current and target)

Current local foundation:

- Portfolio actions require authenticated user via server-side auth lookup.
- Transaction execution and constraint checks occur server-side.
- Idempotency keys prevent accidental duplicate transactions.
- Local lock queue prevents same-user concurrent overspend races in development mode.

Prepared SQL target:

- RLS public read on market reference entities.
- Owner-only reads for portfolios, holdings, transactions, limits.
- Direct write restrictions to service-role only.
- Security-definer RPC functions for buy/sell/create/recalculate operations.

## Important constraints and disclaimers

- FIQ currency has no real-world monetary value.
- Public market routes do not display development-season, fictional, stale-season or unverified player records.
- The local `tmp/market-playable-dataset.json` artifact is developer-only and must never be treated as a public catalogue.
- No live provider claims should be made until import mapping, rights verification, and production validation complete.
- No logos, crests, photographs, or official kit reproductions are used.
