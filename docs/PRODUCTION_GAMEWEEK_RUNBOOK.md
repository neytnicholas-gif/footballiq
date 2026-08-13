# Production gameweek proof and recovery runbook

The valuation engine is implemented, but zero imported performances and zero valuation events means it has **not yet been proven against a real completed fixture**. Preview deployments do not execute Vercel Cron jobs. The proof must be run from a Production deployment.

## Required production configuration

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `SPORTMONKS_API_TOKEN` (server only)
- `CRON_SECRET` (server only, long random value)
- production deployment built from the reviewed release commit
- `vercel.json` cron path `/api/market/process-gameweek`

Never put service-role, Sportmonks or cron secrets in a `NEXT_PUBLIC_` variable.

## First proof

1. Confirm the production variables point to the Supabase project containing the current market migrations and player catalogue.
2. Deploy the reviewed commit to Production.
3. After at least one supported league fixture is final and ratings are available, call `POST /api/market/process-gameweek` with `Authorization: Bearer <CRON_SECRET>` once.
4. Confirm the response is HTTP 200 and records a completed heartbeat/run.
5. Query the evidence counts below.
6. Open the Reveal and portfolio pages as a test account holding affected players. Confirm the same price movement and explanation appear in the UI.
7. Invoke the endpoint again. Exact-once processing must produce no duplicate performance or valuation event.

```sql
select count(*) as imported_performances from public.market_player_match_stats;
select count(*) as valuation_events from public.market_valuation_events;
select count(*) as automatically_changed_prices
from public.market_players
where current_price_minor <> initial_price_minor;
select run_key, status, started_at, finished_at, report, error_message
from public.market_processing_runs
order by started_at desc
limit 20;
```

## Pass criteria

- at least one supported, completed match imports eligible player performances;
- exactly one valuation event exists per processed player/gameweek update;
- the current player price equals the event's recorded new price;
- a retry does not duplicate price movement;
- incomplete, unrated or ineligible performances freeze honestly rather than moving a price;
- the processing run is completed with a useful report and no raw provider secret in logs;
- the UI shows affected holdings, gain/loss and Reveal consistently.

## Failure handling

- A failed heartbeat/run is a launch alert, not a silent condition.
- Fix configuration/provider/schema errors, then safely retry the same gameweek key; database idempotency is the authority.
- Do not manually edit player prices to hide a failed run.
- Keep the market's “data pending / price frozen” state visible until a verified run succeeds.
