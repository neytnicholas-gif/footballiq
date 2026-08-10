# FootballIQ unattended launch runbook

## What now fails safely

- The verified catalogue is cached for five minutes and may be served stale for up to 24 hours during a temporary origin outage. No fictional replacement data is used.
- Authenticated buy, sell, watchlist, portfolio and gameweek RPCs have short database timeouts. A timeout rolls back the complete transaction.
- Setting `market_settings.market_status` to `updating` or `paused` blocks authenticated holding inserts and deletes at the database boundary.
- Repeated gameweek processing is idempotent by fixture/player and valuation-event keys.

## Before leaving a live period unattended

1. Confirm the latest production deployment is healthy and the catalogue endpoint returns HTTP 200.
2. Confirm `market_settings.market_status = 'open'` and the current gameweek is `open` or `revealed`.
3. Confirm Vercel runtime errors are zero and Supabase database connections are below 70% of the plan limit.
4. Keep the previous known-good Vercel deployment available for instant rollback.
5. Give a trusted backup operator access to this runbook, Vercel logs, and the Supabase dashboard. Do not share API tokens in chat or screenshots.

## When to pause trading

Pause if any one of these persists for five minutes:

- trade error rate above 2%;
- database connections above 80%;
- repeated lock/statement timeouts;
- a failed or partially verified gameweek run;
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
