# Early Shout unattended launch runbook

## What now fails safely

- The verified catalogue and player lock state refresh within about one minute. No fictional replacement data is used.
- Authenticated buy, sell, watchlist, portfolio and gameweek RPCs have short database timeouts. A timeout rolls back the complete transaction.
- Setting `market_settings.market_status` to `updating` or `paused` blocks authenticated holding inserts and deletes at the database boundary.
- Repeated gameweek processing is idempotent by fixture/player and valuation-event keys.
- A player locks at their club's real kickoff and stays locked until that fixture has a durable settlement record. A stale browser cannot bypass the server lock.
- Fixtures before `2026-08-17 00:00 UTC` are rejected by both the importer and a database trigger, so pre-beta results cannot move launch prices.
- A partially failed provider batch is marked failed and remains trade-locked for a safe retry; it is never reported as fully completed.

## Beta opening plan

- **17-18 August:** invite a small trusted group. Test sign-up, roster building, buy/sell, refresh/retry, mobile layout, feedback and private leagues. Describe values as opening prices; no launch-eligible match has been processed yet.
- **19 August:** reconcile tester accounts, review feedback and runtime logs, then freeze non-essential feature work.
- **20 August:** widen the free beta only if the launch gates below remain green.
- **21 August:** first live Premier League and Ligue 1 game day. Players in a started match will remain locked until the daily verified run completes.
- **After at least two witnessed valuation cycles:** decide whether to widen access. Do not start paid access until the real rating-to-price-to-Reveal loop has passed twice without manual repair.

On the current Vercel schedule, the verified run starts daily at **04:15 UTC (06:15 Brussels summer time)**. That means a Friday-night player can remain locked overnight. This is intentional on the current plan and must be explained in the beta rules; never unlock on an estimated score.

## Before leaving a live period unattended

1. Run `SMOKE_TEST_BASE_URL=https://your-domain SMOKE_TEST_REMOTE_APPROVED=true npm run smoke-test:public` and retain the JSON result. Every route must pass and the catalogue must contain all three launch leagues and at least 500 players.
2. Run a staged read-only capacity check with `LOAD_TEST_BASE_URL=https://your-domain LOAD_TEST_REMOTE_APPROVED=true npm run load-test:market`. The default gate requires an error rate at or below 0.5%, valid catalogue data in every successful response, and p95 latency at or below 2 seconds. Increase concurrency gradually; do not treat a small test as proof of 10,000 simultaneous users.
3. Confirm `market_settings.market_status = 'open'` and the current gameweek is `open` or `revealed`.
4. Confirm `market_settings.valuation_eligible_from = '2026-08-17 00:00:00+00'`.
5. Confirm every fixture at or after kickoff has either an active player lock or a row in `market_fixture_settlements`; a fixture must never be silently in neither state.
6. Confirm Vercel runtime errors are zero and Supabase database connections are below 70% of the plan limit.
7. Keep the previous known-good Vercel deployment available for instant rollback.
8. Give a trusted backup operator access to this runbook, Vercel logs, and the Supabase dashboard. Do not share API tokens in chat or screenshots.

## When to pause trading

Pause if any one of these persists for five minutes:

- trade error rate above 2%;
- database connections above 80%;
- repeated lock/statement timeouts;
- a failed or partially verified gameweek run;
- a completed fixture that remains unsettled after the next scheduled processor run;
- evidence of incorrect prices, balances, duplicate trades, or provider-data corruption.

Use the Supabase SQL editor:

```sql
update public.market_settings
set market_status = 'paused', updated_at = now()
where id = 1;
```

This is reversible and does not alter balances or holdings. Users may still browse the cached catalogue, while attempted trades fail without committing a change.

## Recovery sequence

1. Leave trading paused; never repair balances while writes remain open.
2. Identify whether the fault is the deployment, Supabase, Sportmonks, or the gameweek processor.
3. For an application regression, roll back to the previous verified Vercel deployment.
4. Reconcile the transaction ledger, holdings, portfolio totals, processed fixtures, and valuation-event idempotency keys.
5. Run the focused automated tests and one authenticated buy/sell canary account.
6. Reopen only after the canary ledger and displayed balance agree:

```sql
update public.market_settings
set market_status = 'open', updated_at = now()
where id = 1;
```

7. Record the incident time, cause, affected accounts, evidence, and corrective action.

## Never do during an incident

- Do not rerun arbitrary SQL against user balances without a reviewed reconciliation query.
- Do not delete transactions to make totals appear correct.
- Do not expose service-role, Sportmonks, cron, or admin secrets in browser code or support messages.
- Do not promise a trade succeeded unless it exists in the authoritative database ledger.
- Do not reopen trading solely because the website loads; verify the full canary trade path.

## Remaining external launch controls

These require dashboard or plan configuration and cannot be guaranteed by application code alone: CAPTCHA on sign-up, leaked-password protection, Vercel WAF/rate limits, alert destinations, a production-domain deployment, and enough Supabase/Vercel capacity for the intended concurrency.
