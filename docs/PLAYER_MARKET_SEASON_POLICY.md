# Player Market Season Policy

Scope: manual season governance for FootballIQ Player Market.

## Principles

- No automatic season reset is enabled.
- Every season transition requires explicit owner sign-off.
- Historical transactions and value history are retained for auditability.
- Season transitions must not silently alter user balances.

## Season entities

- market_settings:
  - season_id
  - season_label
  - season_state
- market_seasons:
  - season_id (primary key)
  - season_label
  - season_state (setup/open/paused/archived)
  - starts_at
  - ends_at
  - notes

## Allowed season states

- setup: season configuration in progress; market may remain paused.
- open: normal trading and valuation event processing.
- paused: temporary freeze for corrections.
- archived: season closed and immutable except admin corrections.

## Manual rollover checklist

1. Set market_status to paused.
2. Verify final value snapshots and outstanding correction queue.
3. Insert next season row in market_seasons with setup state.
4. Set market_settings.season_id and season_label to new season.
5. Decide opening_season_value strategy and apply only with owner approval.
6. Confirm methodology version for the new season.
7. Move season_state to open and market_status to open.
8. Publish season changelog summary.

## Prohibited actions

- No implicit reset of portfolio holdings.
- No deletion of historical transactions to hide corrections.
- No season switch while unresolved lock/correction incidents remain.

## Incident handling

If a season transition is found to be incorrect:

1. Set market_status to paused.
2. Record incident in operations log.
3. Revert season pointer fields in market_settings.
4. Re-validate portfolio totals for affected users.
5. Resume only after owner verification.
