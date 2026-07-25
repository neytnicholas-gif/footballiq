# Player Market Operations

Scope: safe operation of FootballIQ Player Market under the flagship model revision.

## Manual SQL execution order

1. Existing FootballIQ baseline and beta-gate SQL (already documented in docs/SUPABASE_BETA_GATE_RUNBOOK.md).
2. SUPABASE_PLAYER_MARKET_MVP.sql
3. SUPABASE_PLAYER_MARKET_MODEL_REVISION_V1.sql
4. SUPABASE_PLAYER_MARKET_SEED_DEMO.sql (demo/dev environments only)

Production caution:
- Do not apply SUPABASE_PLAYER_MARKET_SEED_DEMO.sql to production unless owner-approved demonstration data is explicitly desired.
- Production player/stat data and rating events must be imported through verified/licensed provenance paths.

## Core runtime controls

`market_settings.market_status`:
- `open`: trading allowed.
- `updating`: trading blocked.
- `paused`: trading blocked.

`market_settings.max_portfolio_size`:
- default `8`.

`market_settings.sell_spread_bps`:
- default `200` (2%).

`market_settings.season_state`:
- `setup`, `open`, `paused`, `archived`.

## Trading lock operations

Per-player lock fields on `market_players`:
- `is_trade_locked`
- `trade_lock_reason`
- `trade_lock_started_at`
- `trade_lock_ends_at`

When lock is active, both Back and Sell are blocked server-side.

Operational pattern:
1. Set lock fields for impacted players.
2. Add short reason text for user-facing transparency.
3. Clear lock only after data/valuation correction and owner verification.

## Standard manual update cycle

1. Set `market_status` to `updating`.
2. Import/correct player and stats rows with provenance fields.
3. Import verified rows into `market_rating_events`.
4. Process events via `market_process_rating_event(external_event_id, methodology_version, true)`.
5. Verify capped movement behavior and `market_value_history` entries.
6. Refresh selected portfolios if needed using `market_refresh_my_portfolio()`.
7. Set `market_status` back to `open`.

## Valuation processor notes

Function:
- `market_process_rating_event(p_external_event_id, p_methodology_version, p_apply)`

Rules enforced:
- idempotent by `external_event_id`.
- only owner-verified events are processable.
- accumulator decay over time.
- minutes-weighted movement.
- per-match and rolling-week caps.
- visible value moves in `0.1m` steps.
- hidden accumulator remainder retained server-side only.

## Friends leagues beta operations

Core RPCs:
- `market_create_friend_league(p_name)`
- `market_join_friend_league(p_league_code)`
- `market_leave_friend_league(p_league_id)`

Operational guidance:
- keep leagues invite-only via code sharing.
- if abuse occurs, owner can deactivate league via `market_friend_leagues.is_active = false`.

## Season policy operations

Season config tables:
- `market_settings` (active season pointers)
- `market_seasons` (manual lifecycle records)

No automatic season reset is enabled.
All season transitions are manual and require owner sign-off.

## Rollback and recovery

Practical rollback path:
1. Set `market_status` to `paused`.
2. Optionally lock impacted players.
3. Restore player value from last trusted `market_value_history` point.
4. Re-run portfolio refresh where needed.
5. Resume market only after owner verification.

## Scheduling note

No scheduler is enabled by default.
If background jobs are introduced later, document cadence, owner, and rollback procedure before activation.
