# FootballIQ Player Market: real-data launch readiness

> **Historical design memo — superseded.** This document records the provider-selection and proposed-ingestion design as it stood on 6 August 2026. It must not be used as the current launch status. Sportmonks subsequently gave Early Shout product-specific written approval on 13 August 2026, the real catalogue and gameweek engine were implemented, and current operational gates are maintained in `docs/PRODUCTION_PROMOTION_CHECKLIST.md` and `docs/PRODUCTION_GAMEWEEK_RUNBOOK.md`.

Status as of 2026-08-06: pipeline contract implemented; production provider and verified Premier League catalogue not configured.

## Provider decision: permission first, trial second

FootballIQ needs one current Premier League season, roughly 300 usable players, stable identities, completed fixtures, appearances, minutes and a documented per-match rating. Photos, official badges and kit artwork are out of scope. Updates can run the following morning, allowing provider corrections to settle.

The current leading candidate is Sportmonks Starter, advertised at EUR 29/month when paid monthly (VAT may be additional), with five selected leagues, full data access and 2,000 calls per entity per hour. Its official documentation identifies lineup-detail fields for `RATING` and `MINUTES_PLAYED`. Its general terms permit building apps, websites and games and derived commercial creations while forbidding direct data resale. This is encouraging, but it is not FootballIQ-specific written permission.

No subscription is approved here. The 14-day trial requires a payment method and automatically bills unless cancelled. Before starting it, obtain written confirmation that the plan permits displaying player/club names, storing performance history, using ratings in derived FootballIQ game values, a free public launch with possible later paid features, and retaining the audit/value history. Confirm attribution, domain, retention and cancellation rules and 300-player Premier League coverage.

Use Sportmonks' official contact form and retain the reply:

> Subject: Written permission check for a Premier League game using Sportmonks data
>
> Hello Sportmonks team, I am building FootballIQ, a football knowledge and squad-building web game. The initial public launch will be free, with possible optional paid features later. I am considering the monthly Starter plan for the current English Premier League only.
>
> The Market would display approximately 300 current player names and club names. We will not use player photos, club badges, provider logos or official kit artwork. The morning after completed matches, our private server would retrieve stable fixture/player IDs, dates/gameweeks, appearances, minutes and your match-rating field. We would store source history for auditing and use recent ratings/minutes to calculate our own clearly labelled “FootballIQ gameplay values”. We would not sell or expose your raw API feed or describe our values as real transfer values or Sportmonks valuations.
>
> Please confirm in writing whether this use is permitted on the monthly Starter plan for one public website/domain, both while free and if it later has paid features. Please confirm required attribution; storage/retention limits including after cancellation; whether derived value history may remain visible; whether player/club names may be displayed; and whether the current Premier League season includes stable IDs plus lineup-detail RATING and MINUTES_PLAYED for enough players to support roughly 300 players.
>
> I will not use the data publicly until permission and a technical trial have both passed. Thank you.

`lib/market/providers/sportmonks.ts` is a disabled pure normalisation boundary. It makes no network request and accepts no credential. Ratings remain `pending`; the adapter cannot self-verify them. `auditProviderTrial` checks catalogue coverage, finished fixtures, rating availability, duplicates and orphan IDs before import consideration.

### Read-only trial workflow

`lib/market/server/sportmonks-provider.ts` adapts an injected server-only trial source to the provider-independent contract. The source—not the adapter—owns HTTP authentication, so no key name or browser-visible environment variable is introduced. Production runtime selection remains permanently wired to the disabled provider; merely adding a credential cannot activate ingestion.

`runProviderDryRun` is intentionally unable to receive a repository or Supabase client. It loads the catalogue and fixture sample, waits until 07:00 UTC on the calendar day after kickoff, then retrieves appearances and returns only an in-memory report. It quarantines fixtures that are unfinished or too early, duplicate fixture/player events, unknown players, unused substitutes and played appearances with missing ratings. Missing ratings are never filled. Its result states `writesPerformed: 0` and `valuesChanged: 0`, while every parsed rating remains pending owner verification.

When a licensed trial becomes available, the operator must inject an approved HTTPS transport and run this sequence:

1. Fetch the current season's 20 teams and team/season squads with player, team and position includes.
2. Fetch a representative completed-fixture window with state and participant metadata.
3. After the next-morning cutoff, fetch lineup details containing documented `RATING` and `MINUTES_PLAYED` types.
4. Save the dry-run report—not credentials or raw licensed payloads—to an approved private review location.
5. Reject the trial if the 280-320 catalogue band, 11-per-club floor, formation coverage, stable identity, complete played-player ratings, uniqueness or orphan checks fail.
6. Obtain explicit owner approval of the provider reply, price, attribution, retention terms and sample report before implementing credential storage or enabling any import.

## Current implementation audit

The repository fallback contains 50 fictional players across 9 fictional clubs: 9 GK, 17 DEF, 14 MID and 11 FWD. Its source is `lib/market/sample-data.ts`, labelled `FootballIQ simulated dataset` / `fiq-sim-v1`. `lib/market/providers/seed-provider.ts` contains a smaller 8-player owner seed. The manual SQL seed file is also demo data. None is evidence of current Premier League coverage, and none may be described as live or complete.

The former production-facing loop imported `seedMatchweekProvider`, generated ratings and performance shocks, and called `market_apply_simulated_matchweek`. The browser also generated synthetic sparklines. These UI paths have been removed. Development utilities remain for regression work, but `applySimulatedMatchweek` rejects every production call before authentication or RPC access. The legacy SQL function is not executed or changed by this work and must not be exposed by a production service role or client workflow.

## Catalogue selection and coverage gate

The launch input must be a licensed, provider-supplied current Premier League squad export with stable player and club IDs. Selection is deterministic:

1. Resolve the 20 competition clubs for the configured provider season.
2. Include at least 11 usable players per club (`first_team`, `rotation`, or temporarily `injured`).
3. Exclude `departed`, `inactive`, and `loaned_out` players from usable coverage while retaining their identity/status history.
4. Add roughly 80 provider-verified first-team, rotation, and high-interest records after the 220-player club floor, targeting about 300 total (accepted launch band: 280-320).
5. Require unique provider player IDs and provider club IDs, with effective-from/effective-to dates for affiliation changes.
6. Require aggregate formation availability of at least 1 GK, 4 DEF, 3 MID, and 3 FWD. Operational balancing should target per-club depth rather than merely passing that aggregate floor: at least 2 GK, 4 DEF, 3 MID, and 2 FWD where the verified squad permits.

`auditMarketCoverage` enforces the hard launch gates. It deliberately does not contain club or player names: those must come from the licensed, season-specific source, not be invented in code.

## Provider-independent ingestion contract

The adapter must supply:

- Player: external player ID, external club ID, name, club, normalized position, squad status, affiliation effective dates.
- Fixture: external fixture ID, competition ID, season ID, gameweek (nullable), UTC kickoff, fixture status, home and away club IDs.
- Appearance: external appearance ID, fixture ID, player ID, appeared flag, minutes (0-130), rating on a documented 0-10 scale or null, verification status, source name/reference, and retrieval timestamp.

Only a finished fixture, positive minutes, a present verified rating, matching fixture ID, and a new `(source, fixture, player)` idempotency key produce an eligible event. Postponed/cancelled fixtures, unused substitutes, missing ratings, unverified records, invalid minutes, and duplicates freeze that player's value. No imputation is allowed.

The production adapter remains disabled. Activation requires: provider account and licence approval for display/derived-game use; server-side API base URL and credential; competition and season IDs; rating scale/method documentation; pagination and rate-limit rules; fixture-status mapping; player/club/fixture/appearance stable-ID guarantees; correction/deletion semantics; attribution requirements; and an owner-approved verification rule. Credentials must be server-only and are not added to `.env` by this change.

## Gameplay valuation methodology (`fiq-real-performance-v2.0.0`)

Each update uses the five most recent eligible appearances. Recency weights are `1.00, 0.82, 0.67, 0.55, 0.45`; each is multiplied by a minutes factor clamped from 0.25 to 1.00 (`minutes / 90`). Position baselines are GK 6.75, DEF 6.70, MID 6.80, and FWD 6.85. A 0.22 rating difference equals one 0.1m FIQ step.

Movement is rounded to 0.1m FIQ, capped at 0.3m per processed match and 0.6m net in either direction per rolling gameweek, with a 4.0m floor and 15.0m ceiling. A player who does not play, lacks a rating, or lacks verification receives no update. Every resulting history entry must retain event identity, prior/new values, calculation inputs, source provenance, verification time, and methodology version.

Opening values are independent FootballIQ game prices, not copied external prices. The model combines established verified performance (42%), recent minutes (25%), squad role (20%), availability (10%), and age/potential (3%), then maps the normalized result from a position base (GK 5.0m, DEF 5.2m, MID 5.4m, FWD 5.6m) to the 15.0m ceiling and rounds to 0.1m. Before launch, distribution controls should review club concentration, positional medians, star/budget depth, and whether a 100m budget permits multiple viable 1-4-3-3 strategies. Opening inputs are unavailable today, so no 300-player prices were fabricated.

## Persistence boundary still required

The proposed, unapplied migration is `docs/proposed-migrations/20260806125316_market_real_performance_persistence.sql`. It creates a non-exposed `market_ingestion` schema containing:

- provider configuration with disabled-by-default and licence-verification constraints;
- immutable methodology versions and checksums;
- uniquely identified import batches and payload checksums;
- effective-dated provider player identities linked to `market_players` only after review;
- provider fixtures with season, gameweek, kickoff and lifecycle status;
- versioned appearances with one current `(provider, fixture, player)` record;
- quarantined raw records and resolution metadata;
- explicit original/corrected appearance relationships;
- auditable value updates, calculation generations and supersession links;
- revaluation requests anchored to the earliest corrected fixture.

The migration deliberately makes no provider active and inserts no players, fixtures, performances or values.

## Import lifecycle and transaction boundary

1. A trusted server process loads the disabled/enabled provider adapter; browser code has no import path to this runtime.
2. The adapter normalizes a vendor payload into the provider-independent contract.
3. The complete batch is validated before a write transaction starts. A single missing/unverified rating, invalid appearance, postponed fixture or unresolved quarantine rejects the batch.
4. The repository opens one database transaction and locks/creates the unique provider batch. Concurrent workers converge on the same batch row.
5. New performances are stored using the durable `(provider, provider_fixture_id, provider_player_id)` current-record index. The value-update table independently permits only one current update per appearance.
6. Rolling inputs and new values are calculated in chronological order while the affected player rows are locked. Floors, ceilings, 0.1m increments, per-match caps and rolling-week caps must be checked both in application code and database constraints.
7. Only after all appearances and value histories succeed is the batch marked `applied`. Any exception rolls back the entire transaction.

The application service models this unit of work in `lib/market/server/ingestion-service.ts`. Its repository implementation remains intentionally absent until the migration has been applied to a disposable Supabase branch and generated database types are available. Public trading must not depend on this unapplied schema.

## Correction workflow

A correction inserts a new appearance version that references the original. The original is retained and changed only from current to superseded; it is never overwritten or deleted. A correction records its reason, source batch and timestamp, then queues a player revaluation beginning at the corrected fixture.

Revaluation must replay current verified appearances chronologically from the last unaffected value checkpoint. Prior value-update rows are retained and marked superseded; a new calculation generation records recalculated rolling inputs and values. The final current player value and holding snapshots change only if the entire replay succeeds. Reprocessing an identical correction checksum is a no-op.

## Security model and threat review

- `market_ingestion` is not an exposed Data API schema. `public`, `anon` and `authenticated` receive no schema, table, sequence or function privileges.
- RLS is enabled as defense in depth with no end-user policies. The trusted server/service role is the only intended ingestion writer.
- Provider credentials are server-only and must never use a `NEXT_PUBLIC_` name. No credential name or value is added by this batch.
- Portfolio reads, watchlists and buy/sell RPCs remain separate. An authenticated player cannot turn portfolio permission into provider-ingestion permission.
- Internal functions use a fixed `search_path`, are not granted to `PUBLIC`, and are not exposed as ordinary authenticated RPCs.
- Raw payloads may contain licensed data and operational metadata; they remain private and should have an approved retention period before production.

Primary threats are forged performances, replay/concurrency duplication, partial batch writes, malicious corrections, service-key disclosure, unsafe public grants, and history tampering. Controls are provenance checks, composite uniqueness, transactional locking, immutable versions, least-privilege grants, non-exposed schema placement and audit checksums.

## Migration application, verification and rollback plan

Do not apply directly to production. After independent review:

1. Back up the target and capture the current migration list and database advisors.
2. Apply to a disposable Supabase branch/local stack first.
3. Confirm the project Data API exposed-schema configuration does not include `market_ingestion`.
4. Inspect grants for `anon`, `authenticated`, `PUBLIC` and `service_role`; verify end users cannot select, insert, update, delete or execute anything in the schema.
5. Run duplicate/concurrent batch, forced-error rollback, quarantine, correction/replay and cap-boundary integration tests.
6. Compare player values, value history and holding snapshots before/after a controlled verified fixture.
7. Run database security/performance advisors and regenerate `lib/supabase/types.ts` only after schema approval.
8. Obtain explicit approval before repeating the migration in production.

Rollback is `drop schema market_ingestion cascade` only while no live ingestion has occurred. After any real import, rollback must preserve/export audit history and use a reviewed forward migration; destructive schema removal is no longer acceptable.

## Manual verification still required

Supabase integration tests cannot be completed in this repository alone. They require an isolated project/branch, an applied migration, generated types, a trusted server worker, and non-production service credentials. Provider activation additionally requires the licensed base URL and server credential, competition/season identifiers, stable ID guarantees, rating methodology/scale, rate limits, correction semantics, attribution rules, retention terms and owner-approved verification criteria.
