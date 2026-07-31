# Player Market Foundation V1

## Status

The repository contains a complete fail-closed market foundation. It contains no active real-player catalogue and no migration in this repository has been applied remotely by this work.

## Schema and source separation

- `market_catalogues` stores the validated/approved/active fingerprint boundary and source ledger.
- `market_players` stores season-specific identities and catalogue provenance.
- `market_player_match_stats` stores factual provider match records.
- `player_season_stats` stores service-maintained factual season aggregates.
- `market_valuation_events` stores FootballIQ calculations separately from provider facts.
- `market_portfolios`, `market_holdings`, `market_transactions` and `market_daily_limits` store private user economy state.
- `market_public_leaderboard` is a de-identified public projection, not a public view over private portfolios.

All monetary/value fields use integer minor units. Ratings and performance banks use integer thousandths. V1 has one ownership position per player and database-enforced `quantity = 1`; trying to buy an already-owned player is rejected and is not another successful buy.

## Access boundary

- Anonymous visitors may read only an explicitly active catalogue, its players, player value history, public aggregates and leaderboard rows.
- Personal portfolios, balances, holdings and transaction history remain owner-only.
- Buy/sell RPCs are granted only to authenticated users and verify `auth.uid()` internally.
- Imports, catalogue activation, factual aggregate refresh and leaderboard projection writes remain service-only.
- A missing session returns `AUTH_REQUIRED` before a transaction RPC is invoked.

## Transaction enforcement

Buying uses the server-authoritative current value and rejects a mismatched expected value as `STALE_PRICE`. SQL row locks, unique constraints and request IDs protect against double-clicks and concurrent requests. Every successful transaction is atomic. Limits are five distinct holdings, three successful buys and three successful sales per Europe/Brussels calendar day. A player who leaves the league becomes unavailable for new purchases; existing holders may sell at the last confirmed value.

## Valuation V1

- Baseline rating: 7.0.
- A full +1.0/-1.0 accumulated delta moves value +0.1/-0.1 FIQ.
- Fractional deltas remain in the integer performance bank.
- 6.5 followed by 7.5 nets to zero.
- No appearance or an unused/unrated substitute: no rating and no movement.
- A rated substitute is treated normally.
- Multiple rated matches in one market week use their arithmetic mean, rounded to the nearest rating thousandth with halves away from zero.
- Postponed matches belong to the market week actually played.
- Transfers inside the eligible league retain identity and history.
- Leaving the league blocks purchases but preserves history and sale rights.
- Missing ratings are never inferred.
- Source-stat/request-derived idempotency keys prevent repeated application.

The value delta is represented in integer minor units, which is already exact to two decimal places in the displayed FIQ value. No floating-point database arithmetic is used for balances, holdings, transactions or valuation events.

## Catalogue activation

1. Supply a licensed local JSON file using the fields documented in `PLAYER_MARKET_DATA_IMPORT.md`.
2. Run the offline importer and require zero rejections.
3. Human-review the accepted report and provenance.
4. Create explicit local approval for the exact validated fingerprint.
5. In a separately authorized database operation, persist the catalogue and its players with matching provenance.
6. Call the service-only activation function with the catalogue ID and exact approved fingerprint.
7. Verify anonymous reads, owner isolation and mutations in staging before production release.

Empty, stale, incomplete, rejected, mismatched or unapproved catalogues remain closed. Test and development fixtures are not activation inputs.

## Intentionally unperformed remote work

- No Supabase project was contacted.
- No migrations were applied.
- No provider request was made.
- No catalogue was approved or activated.
- No deployment or push occurred.

The remaining data requirement is one licensed, human-reviewed JSON catalogue of approximately 50 real 2026/27 Premier League players, with written permission for storage and public display and either an exact stable-ID list or an approved deterministic selection rule.
