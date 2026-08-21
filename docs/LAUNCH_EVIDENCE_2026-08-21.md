# Production gameweek launch evidence — 21 August 2026

## Verdict

**Pass for the automatic Player Market gameweek chain.** Production imported real completed-fixture ratings and minutes, created price events, updated the current player prices consistently, created a portfolio Reveal, and retained exact-once event keys without exposing provider secrets.

This record proves the chain that existed at the capture time. It does not replace the recurring checks in [PRODUCTION_GAMEWEEK_RUNBOOK.md](./PRODUCTION_GAMEWEEK_RUNBOOK.md).

## Capture context

- Captured from the production Supabase project on **2026-08-21 at 13:56 UTC**.
- Application release at the time of the final verification: **`b00be4130c03672cb5e0885810c47865d3a1cf9d`**.
- Latest settled gameweek: **`sportmonks-2026-34`** (`Results - 2026-34`).
- Gameweek processed at **2026-08-21 05:09:50 UTC**.
- Processing run: **`verified-gameweek-heartbeat:2026-08-21`**, status `completed`.
- Provider use in that heartbeat: **9 requests**. The lowest recorded remaining allowance was **1,994 of 2,000** for the Fixture entity.
- The processing report stored only safe telemetry and summaries; no API token or raw provider response was captured in this evidence.

## Fixture settlement

| Provider fixture | Fixture time (UTC) | Imported | Rated | With minutes | Processed |
| --- | --- | ---: | ---: | ---: | ---: |
| `19732739` | 2026-08-17 19:00 | 22 | 22 | 22 | 22 |
| `19732741` | 2026-08-19 19:00 | 23 | 23 | 23 | 23 |
| `19732724` | 2026-08-20 19:00 | 30 | 30 | 30 | 30 |
| **Total** |  | **75** | **75** | **75** | **75** |

The database gameweek record reports three source fixtures and 75 processed players, matching the fixture-level evidence above.

## Valuation and Reveal checks

| Check | Result |
| --- | ---: |
| Valuation events attached to the latest gameweek | 104 |
| Price rises | 18 |
| Prices unchanged | 56 |
| Price falls | 30 |
| Duplicate idempotency keys | 0 |
| Events where `new price != previous price + change` | 0 |
| Latest event price differing from the live player price | 0 |
| Portfolio Reveals created for this gameweek | 1 |
| Reveal total arithmetic errors | 0 |

There are more valuation events than imported players because the correction pass can add a separately keyed correction event when newly available evidence changes an earlier result. Those correction events are intentional, versioned and included in the final-price consistency check.

## Wider production totals at capture

- 124 imported and rated match-performance rows across five provider fixtures.
- 153 valuation events: 28 rises, 75 unchanged and 50 falls.
- 79 players with a current price different from their opening price.
- 17 recorded processing runs: 12 completed and five failed historical attempts.
- Two gameweek Reveals.
- No orphan valuation-event player references.
- No orphan valuation-event match-stat references.
- No duplicate valuation idempotency keys.
- No event-level price arithmetic errors.

The five failed historical runs are retained rather than hidden. The recent daily heartbeats are completed, and the recorded failures were followed by successful recovery runs.

## Historical recalibration note

The earlier `sportmonks-2026-33` evidence predates the opening-price v3 pre-beta rebase performed on 16 August 2026. That rebase deliberately changed opening/current prices after the first events had been written, so 24 old player rows no longer equal their pre-rebase event's recorded final price. This is historical calibration evidence, not a mismatch in the current gameweek. The latest gameweek has zero such mismatches.

The proposed file `docs/proposed-migrations/20260816211000_reset_prebeta_valuation_state.sql` was **not applied**: migration version `20260816211000` is absent from production migration history. It is a destructive pre-beta reset proposal and must not be applied to the active beta without a fresh backup, an impact review and explicit operator approval. The successful current gameweek evidence does not depend on that proposal.

## Queries used

The evidence was captured with read-only aggregate queries covering:

1. `market_gameweeks` for the latest revealed gameweek and its fixture/player counts;
2. `market_player_match_stats` for fixture, rating, minutes and processing coverage;
3. `market_valuation_events` for outcome counts, arithmetic and idempotency;
4. `market_players` for final live-price consistency;
5. `market_gameweek_reveals` for Reveal creation and arithmetic;
6. `market_processing_runs` for run status and provider rate-limit telemetry;
7. `supabase_migrations.schema_migrations` to verify the proposed reset was not applied.

No write query, provider import, migration or manual price edit was performed to produce this record.
