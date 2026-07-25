# Player Market Valuation Method

Methodology version: v2.rating-events

This document defines the flagship valuation model for FootballIQ Player Market. Values are FootballIQ gameplay values, not official transfer fees and not endorsements by leagues, clubs, or data providers.

## Purpose

- Use verified match-rating events to drive controlled value movement.
- Smooth volatility with a hidden server-side accumulator.
- Keep visible movement understandable in 0.1m steps.
- Enforce fairness caps so one extreme event cannot break the market.

## Core model

Valuation is processed event-by-event through `market_process_rating_event(...)`.

Each verified event contributes movement based on:
- rating_delta,
- minutes_played weighting,
- confidence_score,
- decay of prior accumulator remainder.

Formula shape (simplified):
- decayed_accumulator = previous_accumulator * decay(hours_since_last_event)
- raw_movement = rating_delta * movement_multiplier * minutes_factor * confidence
- capped_movement = clamp(raw_movement, per_match_cap)
- proposed_accumulator = decayed_accumulator + capped_movement
- visible_step_move = floor(abs(proposed_accumulator) / 100000) * 100000 * sign

Visible values move only in `100,000` increments (`0.1m FIQ`).
Remaining fractional pressure stays in the hidden accumulator.

## Fairness controls

- Per-match cap: limits maximum effect of one event.
- Rolling-week cap: limits total movement against a weekly anchor value.
- Idempotency: each external_event_id can be processed once.
- Verification gate: non-verified events are rejected.

## Verification gate

An event must satisfy all of:
- owner_verified = true,
- valid player mapping,
- required event fields present,
- acceptable provenance state.

Otherwise it is not processable.

## Value history and auditability

- Every applied visible move writes to `market_value_history`.
- Reason category for this pipeline: `rating_event`.
- `market_rating_events` tracks processed flags and timestamps.
- `market_player_accumulators` stores hidden remainder state (not publicly exposed).

## Display and communication

- Display format remains compact (for example 8.4m FIQ).
- UI may show trend using current versus previous visible value.
- No public claim of real-time or automated live repricing unless separately approved.

## Operational mode

- Processing is owner-controlled and service-role restricted.
- No automatic scheduler is assumed by default.
- Any future automation requires documented cadence, monitoring, and rollback controls.

## Limitations

- Values remain game balancing signals, not transfer-market truth.
- Event quality depends on source provenance and verification discipline.
- Hidden accumulator tuning may require periodic review to keep movement intuitive.
