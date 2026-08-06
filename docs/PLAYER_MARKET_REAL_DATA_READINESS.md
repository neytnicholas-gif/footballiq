# FootballIQ Player Market: real-data launch readiness

Status as of 2026-08-06: pipeline contract implemented; production provider and verified Premier League catalogue not configured.

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

Before live ingestion, add and review a Supabase migration (do not run it implicitly) that persists import batches, provider fixtures, appearances, player-provider identities/status history, and valuation events. Enforce a unique constraint on `(provider, provider_fixture_id, provider_player_id)`, transactional event processing, immutable raw provenance, correction versioning, and server/service-role-only writes. Public reads should expose only verified records through explicit views/RLS. The existing `market_rating_events` and simulated-matchweek RPC do not yet satisfy the complete real-performance contract.
