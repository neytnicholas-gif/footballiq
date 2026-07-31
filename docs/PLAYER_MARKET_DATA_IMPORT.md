# Player Market Data Import Guide

Last updated: July 27, 2026

## Chosen adapter

- Adapter abstraction: lib/market/provider/types.ts
- Active adapter selector: lib/market/provider/index.ts
- API-Football skeleton adapter: lib/market/provider/api-football.ts

Current state:

- Provider request framework, retry/backoff, pagination shape, and dry-run plumbing are implemented.
- Competition discovery and 2026 season verification are implemented server-side.
- Club import and squad import retrieval are implemented in dry-run mode with validation and preview reporting.
- Local playable dataset generation from cached dry-run artifacts is implemented.
- Database write mode remains disabled in Sprint 7A.
- Administrator dashboard is implemented at /market/admin with dry-run and manual controls backed by server actions.

## Required server credentials

Expected environment variables (server-side only):

- API_FOOTBALL_KEY
- API_FOOTBALL_BASE_URL
- MARKET_DATA_PROVIDER
- MARKET_TARGET_LEAGUE_ID
- MARKET_TARGET_SEASON
- MARKET_ADMIN_SECRET

No credentials are committed in this repository.

Default behavior for non-secret settings:

- API_FOOTBALL_BASE_URL defaults to https://v3.football.api-sports.io
- MARKET_DATA_PROVIDER defaults to api-football
- MARKET_TARGET_SEASON defaults to 2026

Development-only fallback:

- When free-plan access does not include 2026, set MARKET_TARGET_SEASON=2024 in `.env.local` for local dry-run development.
- Artifacts created from this fallback are developer-only validation inputs and must never appear in the public Player Market catalogue.
- Intended production target remains 2026 (2026/27) and should stay documented but inactive until provider access exists.

League ID note:

- MARKET_TARGET_LEAGUE_ID is optional. When omitted, discovery validates by provider league name/country and rejects ambiguous results.

Secret handling rule:

- API_FOOTBALL_KEY has no default and must be configured explicitly.
- Validation reports all missing required variables in a single BLOCKED message.
- CLI scripts load `.env.local` before validation and provider discovery/import checks.

Example:

BLOCKED: API_FOOTBALL_KEY is not configured in .env.local.
Add the key locally, then run:
npm run market:discover
npm run market:import-squads:dry

## Provider terms requiring human verification

Before production import, verify contract rights for:

- competition and club naming display scope;
- player identity fields (nationality, DOB, shirt number);
- fixture and ratings usage;
- update frequency and caching restrictions;
- retention terms for raw payload metadata;
- redistribution constraints for public UI exposure.

## Import sequence (target)

1. Validate provider credentials and select adapter.
2. Import competition metadata for 2026/27 target scope.
3. Import season metadata and set active market season.
4. Import all participating clubs.
5. Import each club squad.
6. Normalize player positions and availability statuses.
7. Upsert entities with provider ids and data timestamps.
8. Record unresolved or duplicate player mappings.
9. Produce import report and review issues before release.

## Dry-run procedure

Use one of the following dry-run entry points:

- Administrator UI: /market/admin
- Server action: runMarketImportAction({ dryRun: true, ... })
- Admin API route with dryRun true:

- POST /api/market/admin/import
- Body:
  - adminSecret
  - competitionKey
  - seasonKey
  - dryRun

Dry-run behavior:

- Collects provider fetch/report diagnostics.
- Must not silently invent missing clubs/players/stats.
- Intended to produce an actionable issue list before write mode.

## Sprint 7A commands

- npm run market:discover
- npm run market:import-squads:dry
- npm run market:validate-squads
- npm run market:build-dev-dataset

These commands run server-side and must never expose API keys in output.

## Normalized preview output

- Dry-run reports are generated to tmp/market-import-preview.json (git-ignored).
- Report includes:
  - competition, season, provider and access time;
  - total clubs, total players, players per club, position counts;
  - duplicate warnings and unresolved records;
  - missing required fields;
  - prospective inserts, updates, deactivations, and skipped records.

## Development dataset artifacts

- Playable market dataset is generated from cached dry-run artifacts and written to tmp/market-playable-dataset.json.
- Unresolved review exclusions are written to tmp/market-excluded-review.json.
- Unresolved duplicate memberships remain blocked from write eligibility until admin review decisions are recorded.

## Offline approved-catalogue workflow

This is the safe path to use after provider access and storage rights are explicitly approved. These commands do not call API-Football.

### 1. Keep the raw response outside Git

Save the approved JSON input beneath:

`tmp/market-catalogue/raw/`

The complete `tmp/` directory is ignored by Git. Do not copy a provider response into a tracked folder unless the provider contract explicitly permits redistribution.

The provider-neutral input must be a JSON object with a `records` array. Every record requires:

```json
{
  "seasonKey": "2026/27",
  "providerPlayerId": "<stable provider player ID>",
  "fullName": "<real player name from the approved source>",
  "clubName": "<verified current 2026/27 club>",
  "position": "GK | DEF | MID | FWD",
  "sourceType": "approved-provider",
  "sourceReference": "<provider endpoint or licensed source reference>",
  "verifiedAt": "<ISO-8601 timestamp>",
  "isActive": true
}
```

Do not manually fill missing values or guess transfers.

### 2. Validate and create the review artifacts

```powershell
npm run market:catalogue:import -- --input tmp/market-catalogue/raw/provider-response.json
```

Outputs are separated:

- Validated output: `tmp/market-catalogue/validated/catalogue.validated.json`
- Review report: `tmp/market-catalogue/reports/catalogue.review.json`
- Raw input remains in: `tmp/market-catalogue/raw/`

The command exits with an error and keeps the public catalogue closed if any record is rejected or if zero records are accepted.

### 3. Review every result

Open `tmp/market-catalogue/reports/catalogue.review.json` and confirm:

- accepted and rejected counts;
- rejected record reasons;
- provider IDs and names;
- club associations;
- positions;
- duplicate identities;
- source references;
- verification timestamps.

Any rejection is blocking. Correct it at the approved source or normalization stage, then rerun the import. Never edit a rejected record into a guess.

### 4. Record explicit local approval

Only after the review report has zero blocking errors:

```powershell
npm run market:catalogue:approve -- --reviewer "Nicholas"
```

This writes a fingerprint-bound approval manifest to:

`tmp/market-catalogue/approval/catalogue.approval.json`

The application revalidates the catalogue and requires this exact matching approval. Merely placing a file in `tmp/` never activates it.

### 5. Roll back to the closed state

Remove only the local approval manifest:

```powershell
Remove-Item -LiteralPath "tmp/market-catalogue/approval/catalogue.approval.json"
```

The public market immediately returns to the closed “2026/27 player catalogue being verified” state. No database rollback is involved because this workflow does not apply migrations or write to Supabase.

### Activation boundary

- Missing, malformed, empty, stale or partially rejected catalogues fail closed.
- Duplicate provider IDs and ambiguous duplicate names fail closed.
- Direct player URLs do not bypass catalogue validation.
- Local approval does not mean the market is “live” or approved for deployment.
- Deployment, database import and public trading require separate explicit approval.

## Admin review workflow for unresolved memberships

- Admin route: /market/admin/review
- Access: market admins only.
- Source input: tmp/market-import-preview.json normalization.duplicateMemberships where requiresReview=true.
- Decisions are stored locally in tmp/market-import-review-decisions.json for staging workflow continuity.

## Provider-rights checklist (verification required)

Do not treat any item below as confirmed unless legal/commercial evidence is documented:

- storing player names and provider player IDs;
- storing full season squads;
- displaying normalized statistics publicly;
- retaining historical match statistics;
- caching provider responses;
- displaying derived FootballIQ valuations from provider-sourced data;
- using provider data in a commercial product;
- retention rights after subscription termination;
- attribution requirements;
- request-volume and rate-limit constraints.

Status: Unverified pending provider terms review and legal sign-off.

## Weekly process pipeline (callable services)

Pipeline order:

1. Import fixtures
2. Import player stats
3. Validate ratings/minutes and suspicious records
4. Update performance bank
5. Update player values
6. Portfolio recalculation
7. Leaderboard rebuild
8. Market report

Callable services currently wired:

- Import orchestration: lib/market/import-workflow.ts -> runMarketSeasonImport
- Weekly dry-run pipeline: lib/market/weekly-pipeline.ts -> runWeeklyImportDry
- Weekly valuation preview: lib/market/weekly-pipeline.ts -> buildWeeklyValuationPreview
- Weekly persistent valuation runner: lib/market/weekly-job.ts -> runWeeklyMarketProcessing
  (execution remains disabled pending Sprint 7C approval)
- Admin server actions: app/market/actions.ts -> runMarketImportAction, runMarketWeeklyAction
- Admin API routes: /api/market/admin/import and /api/market/admin/weekly-run

## Season refresh procedure

1. Re-run import in dry-run mode and inspect diffs/issues.
2. Confirm rights and mapping changes with product/legal owner.
3. Run non-dry import in approved environment.
4. Rebuild valuation and leaderboard values.
5. Run route-level and data-quality checks.

## Transfer update procedure

- Run squad import per club or league scope.
- Mark unavailable/transferred players explicitly.
- Keep provider ids stable and audit transfer transitions.
- Never delete historical holdings/transactions to hide movement history.

## Weekly fixture/stat import procedure

1. Import completed fixtures.
2. Import player match stats and ratings.
3. Validate minutes and rating ranges.
4. Flag suspicious or incomplete rows.
5. Process valuations exactly once per eligible stat record.

## Data correction handling

- Corrections should re-ingest affected records with idempotency keys.
- Duplicate/corrected stat records must not double-apply valuation movement.
- Keep correction logs in import reporting output.

## Rollback procedure

- Stop weekly processing trigger.
- Restore prior data snapshot in database backup environment.
- Re-run valuation rebuild after restore.
- Validate portfolio totals and transaction integrity.
- Resume processing only after issue root cause is fixed.

## Scheduler readiness note

A callable weekly-run route exists:

- POST /api/market/admin/weekly-run

This sprint does not deploy scheduler infrastructure. The route remains intentionally blocked
until persistent processing is approved. Sprint 7B dry-run fixture/stat import and valuation
preview are implemented through the offline commands; persistent valuation processing remains
deferred to Sprint 7C.
