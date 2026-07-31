# FootballIQ Player Market — Next Action Audit

Audit date: 2026-07-31
Audited commit: `308ac13a21f83eb50b3962fdc78edf5cf0d97d2d`
Scope: repository-only inspection. No provider request, API quota use, Supabase connection, migration application, catalogue approval, deployment or market activation was performed.

> Completion note: this audit captured the pre-implementation state. Market Foundation Completion V1 subsequently adds repository migration `20260731_03_market_foundation_completion_v1.sql`, including `player_season_stats`, `market_public_leaderboard` and fingerprint-bound catalogue activation. Those objects still do not exist remotely unless that migration is separately reviewed and applied.

## Executive conclusion

FootballIQ has a sound local market foundation, deterministic valuation tests, transaction constraints, and a fail-closed catalogue validation/approval boundary. It is not production-ready yet. The public routes currently display a closed verification state, the repository does not prove that its market migrations have been applied to the live database, and no approved 2026/27 catalogue exists.

The safest next action is to obtain one licensed, human-reviewed JSON file containing approximately 50 real 2026/27 Premier League players in the existing provider-neutral schema. Run it through the offline validator, inspect the zero-error report, and approve its exact fingerprint locally. Do not reopen trading or write to Supabase until the schema and security migration have been separately reviewed and verified in a safe environment.

## 1. Database migrations and market tables

The audited commit contained two Player Market migrations; Foundation Completion V1 adds a third:

- `supabase/migrations/20260727_01_player_market_foundation.sql`
- `supabase/migrations/20260727_02_player_market_security_and_functions.sql`
- `supabase/migrations/20260731_03_market_foundation_completion_v1.sql`

The foundation migration defines these 12 tables:

1. `market_seasons`
2. `market_clubs`
3. `market_players`
4. `market_player_match_stats`
5. `market_valuation_events`
6. `market_portfolios`
7. `market_holdings`
8. `market_transactions`
9. `market_daily_limits`
10. `market_settings`
11. `market_processing_runs`
12. `market_import_logs`

The security migration enables RLS, defines public-read policies for seasons, clubs, players, settings and valuation events, owner-read policies for portfolio data, and SQL functions for portfolio creation, buying, selling, valuation processing and portfolio-value rebuilding.

“Defined in a migration” is not the same as “exists in the live database.” No remote database was contacted during this audit, and the repository contains no verified migration-application record. The generated Supabase TypeScript definition currently lists only `profiles`, so it also does not prove the market schema has been generated from or synchronized with a live database.

Security review remains necessary before application. In particular, the migration uses deprecated `auth.role()` policy predicates and several `SECURITY DEFINER` functions. The functions do revoke public execution and selectively grant execution, but their complete privilege and RLS behavior should be reviewed in a safe database before production.

## 2. Previously reported missing tables

At the audited commit, neither `market_public_leaderboard` nor `player_season_stats` was present. Market Foundation Completion V1 now adds both as service-maintained aggregate tables; this does not prove remote application.

- `market_public_leaderboard`: **now present in the additive local migration** as a de-identified, service-maintained projection. It is not proven to exist remotely.
- `player_season_stats`: **now present in the additive local migration** as a service-maintained factual aggregate separate from FootballIQ valuation events. It is not proven to exist remotely.

The completion implementation uses tables rather than ordinary views because anonymous public views over owner-protected portfolio rows can bypass or be blocked by underlying RLS depending on view security. Service-maintained projections keep private rows out of the public access path.

## 3. Cause of “Auth session missing!”

The error corresponds to calling Supabase Auth `getUser()` on a server request that has no valid auth session cookie. The earlier market pages and portfolio server actions called `supabase.auth.getUser()` even when the visitor was anonymous. Supabase returned no user and an auth error whose message was “Auth session missing!”. The market code destructured `data.user` and ignored the returned `error`, so this was an expected anonymous-session condition being surfaced as an alarming SDK error rather than evidence of a corrupt account.

The public market and player routes do not require a server-side auth lookup. Portfolio-changing actions first validate the catalogue, then convert a missing/invalid session into structured `AUTH_REQUIRED` before invoking any transaction RPC. While the catalogue is closed they return `CATALOGUE_VERIFICATION_PENDING` without an auth or mutation call.

Foundation Completion V1 implements that boundary; staging verification is still required after remote migration application.

## 4. Why the Buy action froze

The previous Buy flow entered a React transition, optimistically marked the player owned and then awaited a server action. That server action first performed the session-dependent `getUser()` call. When the auth/server-action request did not settle promptly, the transition remained pending and the button stayed disabled, which appeared as a freeze. The underlying transaction had not reached the buy logic.

The UI now wraps buy, sell and portfolio creation calls in a 12-second timeout, catches failures, restores optimistic state and displays a retry message. Request IDs are retained across timeout retries to preserve idempotency. In the current fail-closed state, buy and sell return a clear `CATALOGUE_VERIFICATION_PENDING` result immediately. Tests also confirm failed buy/sell attempts do not mutate holdings or balances.

Repository history proves the current protection, but it does not contain runtime logs from the original incident. Therefore the missing-session request is the code-supported cause of the observed pending state; exact network timing from that incident cannot be reconstructed.

## 5. Anonymous catalogue and page access

Anonymous visitors can open:

- `/market`
- `/market/player/[slug]`
- `/market/portfolio`

However, they cannot currently browse player records because all three routes deliberately render the catalogue-verification state. Direct player URLs do not bypass the boundary. The activation files are absent, so the current runtime remains closed.

The database migration is designed to permit public reads of market seasons, clubs, players, settings and valuation events. That intended access still requires migration verification, Data API grants and RLS testing before production use.

## 6. Authentication boundary

The intended permanent boundary is correct:

- Anonymous: browse the approved catalogue, player pages, values, public history and public leaderboard.
- Authenticated: create/read a personal portfolio and buy or sell.
- Authorized administrator/service process: imports, review decisions and weekly valuation processing.

The current closed-market routes are stricter than the final experience: portfolio pages show verification status rather than an authenticated portfolio. Authentication is not currently required for the public page shell, but mutations are disabled for everyone until catalogue release is explicitly approved.

## 7. Fictional, generated, stale or unverified players

No player is active in the public market.

Ignored developer artifacts still exist under `tmp/`, including a 977-player `season-2024` playable dataset and weekly test/preview artifacts. Fictional/demo seed records also remain in `lib/market/demo-seed.ts` for local development and tests. These records are not accepted by the public catalogue loader and are not displayed by public market routes.

The validator rejects stale seasons, unsupported/generated sources, missing source references, invalid verification dates, inactive players, duplicate provider IDs, ambiguous identities and ineligible clubs. The validated activation and approval files are both absent. Consequently the system contains development data, but **zero fictional, stale or unverified players are publicly activated**.

## 8. Required validated-catalogue input

The offline importer expects a JSON object with a `records` array. Every record requires exactly these meaningful fields:

| Field | Requirement |
|---|---|
| `seasonKey` | Must equal `2026/27` |
| `providerPlayerId` | Non-empty stable source identifier |
| `fullName` | Non-empty real player name |
| `clubName` | Must match an approved 2026/27 Premier League club name |
| `position` | One of `GK`, `DEF`, `MID`, `FWD` |
| `sourceType` | `approved-provider` or `licensed-local` |
| `sourceReference` | Non-empty auditable source reference |
| `verifiedAt` | Valid timestamp |
| `isActive` | Must be `true` |

Example shape:

```json
{
  "records": [
    {
      "seasonKey": "2026/27",
      "providerPlayerId": "licensed-source:123",
      "fullName": "Example Real Player",
      "clubName": "Example Eligible Club",
      "position": "MID",
      "sourceType": "licensed-local",
      "sourceReference": "internal-licence-ledger:2026-27:123",
      "verifiedAt": "2026-07-31T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

The example is schema-only and must not be imported as a player record.

## 9. Safest route to approximately 50 real players

1. Confirm a source licence permits player names, stable IDs, squad membership, positions, caching, public display and commercial use.
2. Produce a local provider-neutral JSON file with approximately 50 recognisable players distributed sensibly across positions and clubs.
3. Human-review current 2026/27 club membership, transfers/loans, identity collisions and active status.
4. Run `npm run market:catalogue:import -- --input <licensed-json-path>` offline.
5. Require exactly 50 accepted records, zero rejected records and zero blocking errors; do not partially activate.
6. Review the generated report and its source references.
7. Run `npm run market:catalogue:approve -- --reviewer "<reviewer>"` to create explicit fingerprint-linked local approval.
8. Verify the app recognizes that exact catalogue while public trading remains closed.
9. Separately approve database/schema integration, transaction restoration and public release.

This route reuses the implemented pipeline and avoids broad redesigns. The selector for the final 50 should be a documented product choice, not an automated “recognisability” guess.

## 10. Existing provider configuration

Without exposing values, `.env.local` defines names for:

- `API_FOOTBALL_KEY`
- `API_FOOTBALL_BASE_URL`
- `MARKET_DATA_PROVIDER`
- `MARKET_TARGET_LEAGUE_ID`
- `MARKET_TARGET_SEASON`

The implementation supports the `api-football` adapter, a configurable base URL, target league ID and starting season year. The expected season value is `2026` for 2026/27. Supabase URL/anonymous-key names and market-admin settings also exist, but their values were not inspected or displayed in this audit.

## 11. Provider key status

`API_FOOTBALL_KEY` is not configured with a non-empty value. No provider request was attempted and no API quota was consumed.

## 12. Required input or decision from the product owner

Before activating the first real catalogue, provide **one licensed local JSON file containing the chosen approximately 50 players in the schema above**, plus written confirmation that its source permits the intended storage and public display.

If the source data contains more than 50 eligible players, also provide or approve a deterministic selection rule, for example a reviewed list of stable player IDs. “Most recognisable” must not be inferred by code without an approved selection method.

No API credential is needed for the safest next step if the licensed JSON is supplied locally. If provider retrieval is preferred later, separately approve the provider, licence basis, quota budget and exact request sequence before any request is made.

## 13. Proposed implementation sequence

1. **Data decision:** approve the licensed source and exact 50-player selection/list.
2. **Offline catalogue:** normalize, validate, review and fingerprint-approve the local input.
3. **Schema review:** decide whether existing match/portfolio tables suffice; do not create the two previously reported tables without a concrete query need.
4. **Security review:** update deprecated policies, audit `SECURITY DEFINER` functions, verify explicit Data API grants and regenerate typed database definitions in a safe environment.
5. **Catalogue persistence:** add record-level source provenance required by the validator to the database model before writing catalogue data.
6. **Read path:** expose only the approved catalogue to anonymous visitors; retain direct-route fail-closed checks.
7. **Auth mutations:** restore buy/sell/portfolio server actions with explicit `AUTH_REQUIRED`, bounded client pending states, typed outcomes and idempotency.
8. **Portfolio/leaderboard verification:** test cash, holdings, wealth, P/L, player returns, weekly history and leaderboard queries against the verified schema.
9. **Valuation policy:** formally approve rounding, missed matches, substitutes, transfers, postponements and league departures before automatic weekly jobs.
10. **Staged validation:** apply migrations only in an authorized non-production environment; test RLS as anonymous, authenticated owner, authenticated non-owner and service process.
11. **Release gate:** obtain legal/data sign-off and explicit product approval before reopening the public market or scheduling provider/valuation jobs.

## Permanent rules confirmed

- Five holdings maximum.
- Three buys and three sales per user per day.
- Virtual/play money only.
- No player photographs or protected club crests.
- Valuation baseline remains 7.0; each full +1.0/-1.0 accumulated rating delta moves value +0.1/-0.1, with banked carryover.
- Valuation calculations remain deterministic, auditable and idempotent.
- Public catalogue remains fail-closed until validation and matching explicit approval.

## Legal and data-risk register update

| Risk | Current status | Required control |
|---|---|---|
| Player identity and squad rights | Blocked | Written licence confirmation for storage, display, caching and commercial use |
| 2026/27 membership accuracy | Blocked | Human review of clubs, transfers, loans and active status |
| Provider ratings | Not activated | Keep separate provenance from identity data and FootballIQ valuation events |
| Development/stale data leakage | Mitigated locally | Preserve fail-closed loader and direct-route tests |
| Protected visual assets | Blocked by policy | Continue original kit-colour icons; no photographs, crests or league logos |
| Database security | Unverified | Review policies/functions and test RLS/Data API access before applying migrations |
| Weekly edge cases | Undecided | Approve formal deterministic rules before scheduling valuations |

## One clear recommendation

Supply and approve a licensed, human-reviewed JSON file for the exact approximately 50 real 2026/27 Premier League players. The only information needed from you now is: **the licensed source, written permission scope, and either the exact stable player-ID list or an approved deterministic selection rule**.
