# Back Your Eye value-game audit — 12 August 2026

## Verdict

The valuation engine is implemented coherently and its full database path passes automated tests, including an exact-once gameweek run and reconciliation of 10,000 portfolios / 110,000 holdings. The connected beta database is **not yet live-proven**: it currently contains 0 imported match appearances, 0 valuation events, 0 changed prices, and 0 processing-run records. The first real completed-fixture run remains a launch gate.

## Where ratings come from

- The server reads completed Premier League, La Liga and Ligue 1 fixtures from Sportmonks Football API v3.
- For each fixture it requests `lineups.details.type` and reads Sportmonks's `RATING` and `MINUTES_PLAYED` details.
- A row is eligible only when the fixture is finished, the player maps to an available catalogue player, minutes are an integer from 1–130, and rating is numeric from 0–10.
- Missing ratings are skipped. The product does not invent a replacement rating.
- The API token remains server-only.

## How a price moves

1. Take up to the player's latest five eligible appearances.
2. Weight newer appearances more heavily: `1.00, 0.82, 0.67, 0.55, 0.45`.
3. Multiply each weight by a minutes factor from `0.25` to `1.00`.
4. Compare the weighted rating with the positional baseline:
   - GK: 6.75
   - DEF: 6.70
   - MID: 6.80
   - FWD: 6.85
5. Convert each complete 0.22 rating-point signal into a 0.1m price step.
6. Keep any incomplete signal in `performance_bank_milli` and combine it with the next verified appearance.
7. Limit movement to 0.3m per processed appearance, 0.6m per results week, and a total price range of 4.0m–15.0m.

This means a player can stay flat after one modest performance while still retaining that evidence for later. It is not discarded.

## Safety and integrity controls verified

- Fixture/player uniqueness prevents the same appearance from repricing twice.
- An advisory transaction lock prevents two gameweek processors from racing.
- The database function, not the browser, is the pricing authority.
- Holdings, cash, total portfolio value, profit and Reveal records are recalculated together.
- Invalid or unmapped rows are skipped and counted.
- Failed jobs are recorded as failed; partial database changes roll back.
- Focused result: 39 valuation, provider and PostgreSQL pipeline tests passed.
- Production build and lint passed.

## Connected beta data snapshot

- Catalogue: 1,201 available players across 58 clubs.
- Premier League: 444 players / 20 clubs.
- La Liga: 430 players / 20 clubs.
- Ligue 1: 327 players / 18 clubs.
- Imported match appearances: 0.
- Valuation events: 0.
- Players with a changed live value: 0.
- Recorded processing runs: 0.

## Remaining launch gate

The current shared beta URL is a Vercel **Preview** deployment. Vercel cron jobs run only on Production deployments, so the daily `/api/market/process-gameweek` job will not run automatically on that preview URL. Before claiming automatic live repricing:

1. Promote a verified build to Production with `CRON_SECRET`, `SPORTMONKS_API_TOKEN`, Supabase URL and service-role key configured for Production.
2. Trigger one controlled completed-fixture run.
3. Confirm a completed processing run, match-stat rows, valuation events, changed player values, updated holdings and a user Reveal.
4. Retry the same batch and confirm it processes 0 duplicate appearances.
5. Confirm the following day's automatic cron heartbeat completes.

Until those five checks pass, the honest user-facing state is “opening prices” rather than “prices already update automatically after matches.”
