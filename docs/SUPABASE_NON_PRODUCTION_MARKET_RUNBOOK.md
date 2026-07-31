# Supabase Non-Production Player Market Runbook

Do not execute this runbook without explicit authorization and a designated non-production project. Recheck current Supabase documentation and CLI behavior at execution time.

## Required inputs

- Approved non-production project reference and authorized operator.
- Reviewed migrations through `20260731_03_market_foundation_completion_v1.sql`.
- Exact tested rollback/checkpoint plan.
- Validated, human-approved 50-player catalogue and matching fingerprints.
- Test identities for owner and non-owner cases; service credential handled outside logs.

## Procedure

1. **Checkpoint:** record project reference, migration list, schema version, row counts and configuration; create a restorable database backup/checkpoint and prove its identifier without exposing credentials.
2. **Migration review:** review every statement, lock, constraint, index, grant, RLS policy and `SECURITY DEFINER` function. Confirm functions revoke `PUBLIC` execution and perform internal identity checks.
3. **Apply non-production only:** apply migrations in order to the authorized staging project. Capture migration output and stop on the first error.
4. **Generate types:** regenerate Supabase TypeScript types from that exact schema, inspect the diff and run TypeScript before using them.
5. **Data API exposure:** verify exposed schemas and explicit table/function grants independently of RLS.
6. **Anonymous tests:** confirm active public catalogue/player/history/leaderboard reads work; private portfolios, balances, holdings, limits and transactions return no rows; transaction RPC execution is denied.
7. **Authenticated owner tests:** confirm an owner can read only their portfolio data and can invoke valid buy/sell RPCs.
8. **Authenticated non-owner tests:** confirm another user cannot read or mutate the owner's portfolio, holdings, balances, limits or transaction history.
9. **Service tests:** confirm only the service role can persist/activate catalogues, refresh factual aggregates and update public leaderboard projections.
10. **Atomic transaction tests:** verify buy/sell success, rollback after each failure class, authoritative prices, insufficient cash, unowned sale, five holdings and three buy/sale limits.
11. **Concurrency/idempotency:** submit simultaneous buys and repeated request IDs; require one position/charge and stable repeat results. Reuse of one request ID for a different action must fail.
12. **Brussels boundary:** test dates immediately before/after midnight in winter and summer time, including DST transitions. Counts reset only on the Europe/Brussels calendar day.
13. **Catalogue gates:** verify empty, rejected, stale, unapproved, wrong-policy, wrong-permission-fingerprint and wrong-catalogue-fingerprint inputs remain closed.
14. **Advisors:** run current database/security/performance advisors; resolve or formally disposition every finding.
15. **Application checks:** run ESLint, TypeScript, all tests, production build and browser checks against staging.

## Rollback

1. Stop import, valuation and mutation traffic.
2. Record the failure and preserve logs without secrets or raw licensed data.
3. Restore the pre-migration checkpoint using the approved platform procedure.
4. Verify migration version, table/function presence, row counts and auth access match the checkpoint.
5. Re-run anonymous/owner/non-owner isolation smoke tests.
6. Do not retry until the migration or runbook defect has been reviewed.

Do not improvise a destructive down migration against production data.

## Evidence required before production approval

- Backup/checkpoint and successful restore evidence.
- Reviewed migration diff and migration-application log.
- Generated-types diff.
- Anonymous, owner, non-owner and service-role test results.
- Atomicity, concurrency, idempotency and Brussels-boundary results.
- Database advisor results and dispositions.
- Licensed-data permission evidence.
- Human catalogue review, exact 50-player list, selection report and matching fingerprints.
- Legal/product/security approvals and a separate production change authorization.
