# FootballIQ current project state — 2026-08-01

## Verified baseline

- **CONFIRMED IN CODE/GIT:** repository `C:\Users\neytn\Downloads\refdecision-v2-referee-rating`, branch `safety/validated-local-2026-07-30`, baseline HEAD `e67b1ba6ab6ab01998071582e251e73270d34c3c`; working tree was clean before this documentation audit.
- **CONFIRMED BY VALIDATION:** Node 24.18.0, npm 11.16.0, `npm ci`, ESLint, standalone TypeScript, 45/45 automated tests, production build, `git diff --check`, secret scan, provider-request scan and real-catalogue scan passed at the baseline.
- **CONFIRMED:** `npm ci` reported seven existing audit findings (two moderate, five high). No `npm audit fix`, dependency upgrade or automatic repair was performed.

## Stack and architecture

- **CONFIRMED IN CODE:** Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS 4, Supabase Auth/Postgres via `@supabase/supabase-js` and `@supabase/ssr`, and Vercel Analytics. Pages live under `app/`; reusable client UI under `components/`; rules/data access under `lib/`; SQL migrations and non-production database harnesses under `supabase/`.
- **CONFIRMED IN CODE:** most games are client components backed by static, repository-owned datasets. Authenticated quiz results call the `complete_quiz` RPC. The Player Market uses server actions/public projection RPCs plus a local catalogue validation and approval boundary.
- **RISK:** `next.config.mjs` sets `typescript.ignoreBuildErrors: true`; the separate `npm run typecheck` gate is therefore essential.

## Routes, navigation and experiences

**CONFIRMED IN CODE:** public routes include `/`, `/about`, `/quizzes`, six quiz routes (`football-duels`, `referee-decisions`, `would-you-scout-him`, `higher-or-lower`, `who-am-i`, `career-path`), `/daily`, `/predictions`, `/leaderboard`, `/player/[username]`, `/market`, `/market/player/[slug]`, `/market/portfolio`, authentication/profile routes, and legal pages. Header/footer and homepage link into the main experiences.

### Games

- **CONFIRMED IN CODE:** Football Duels has ten stat packs, timed/relaxed play, scoring, combo feedback, sharing and authenticated result saving.
- **CONFIRMED IN CODE:** Referee Decisions, Scout Vision, Higher or Lower, Who Am I and Career Path are playable client games with feedback and authenticated XP saving paths.
- **CONFIRMED IN CODE:** Daily Challenge deterministically chooses five questions from the referee set and permits signed-out play; saving/progression requires authentication.
- **CONFIRMED IN CODE:** Predictions uses a five-fixture simulation card, authenticated Supabase upsert and local history. It is not a live fixture feed; outcome settlement is not implemented in this component.
- **REQUIRES MANUAL VERIFICATION:** keyboard/mobile behavior, every completion/save button, duplicate-completion behavior, error messages and profile refresh across all modes.

### Anonymous and authenticated behavior

- **CONFIRMED IN CODE:** anonymous visitors can browse pages and play quiz/daily/prediction selections; final persistence controls explain that sign-in is required. Public profiles and leaderboards are readable through client queries.
- **CONFIRMED IN CODE:** email/password signup and login exist; callback exchanges the auth code; logout redirects home. New users are directed to `/username`; usernames are normalized, length-checked and protected from duplicates by the database error path. `/profile` redirects signed-out users to login.
- **CONFIRMED IN CODE:** authenticated quiz saves call `complete_quiz`, refresh the profile, and surface XP, overall/mode ratings, accuracy, quiz totals, perfect quizzes, current/longest streaks and rank progress.
- **CONFIRMED IN CODE:** nine rank titles are computed from XP. Five “achievement” badges are computed for display from profile totals; there is no separate persisted badge award system in active UI code.
- **REQUIRES MANUAL VERIFICATION:** real signup email configuration, callback redirects, profile-row creation, username RLS, logout/session expiry, and multi-user leaderboard/profile privacy against the intended environment.
- **INCONSISTENCY:** daily identity and completion use UTC `YYYY-MM-DD` in client code, while market daily limits explicitly use Europe/Brussels. Daily streak behavior around Brussels midnight requires a product decision and test.

### Leaderboards and progression

- **CONFIRMED IN CODE:** leaderboard tabs include overall, today, weekly, monthly, season and mode-specific boards. Overall reads profiles; time boards aggregate `quiz_results`; mode/season boards read `mode_stats`/`season_stats` and join usernames.
- **REQUIRES MANUAL VERIFICATION:** query permissions, empty/error states, ranking ties, timezone boundaries, pagination beyond current limits and accuracy of deployed legacy competitive tables/RPCs.

## Player Market

- **CONFIRMED IN CODE:** routes cover catalogue browsing, player details and authenticated portfolio access. The runtime currently has no validated catalogue and no fingerprint-linked approval artifact, so it returns a closed state with zero records.
- **CONFIRMED IN CODE/SQL:** anonymous roles may execute only the three minimal public projection RPCs (players, value history, leaderboard). Authenticated users additionally receive create/get portfolio, buy, sell, snapshot and Brussels-date RPC access. Catalogue activation, manual value changes and internal maintenance remain service-role only; admin value changes also require membership in `market_admins`.
- **CONFIRMED IN CODE/SQL:** maximum five holdings; maximum three buys and three sales per Europe/Brussels calendar day; virtual cash, holdings value, total wealth, realised/unrealised profit, returns, transactions, value history and leaderboard data are represented.
- **CONFIRMED IN SQL/TESTS:** expected-price checks, row locks, idempotency keys, uniqueness constraints and atomic RPCs protect transactions. The non-production harness tested same-key concurrency and cleanup.
- **CONFIRMED IN CODE/SQL:** `available` players may be bought; `sell_only` players cannot be bought but remain public; `inactive` players are hidden from general browsing, remain visible in affected portfolios and may be sold at the last authoritative FootballIQ value.
- **CONFIRMED IN SQL:** valuation events are append-only after Migration 07; corrections are new events. Manual value changes are chronological, bounds-checked, expected-value checked, idempotent and service-role/admin guarded. The older automatic rating valuation engine remains in the repository for legacy/reference tests but its database execution path is revoked/disabled for Manual V1.
- **CONFIRMED IN CODE:** a manual catalogue accepts 1–50 independently selected records with FootballIQ IDs, names, original values, availability and history. Validation rejects unknown fields, fixtures, duplicate/confusing identity and invalid histories. Activation requires zero blocking issues/warnings plus exact fingerprint approval, named reviewer, timestamp and five true human declarations.
- **WHY FAIL-CLOSED:** the validated artefact and approval manifest under ignored `tmp/market-catalogue/` are absent; no real-player data or activation record exists. Some closed-state UI still mentions a “licensed source” and “stable player IDs,” wording left from the deprecated provider plan and inconsistent with Manual V1.

### Migration sequence and security

1. `20260727000100_player_market_foundation.sql`
2. `20260727000200_player_market_security_and_functions.sql`
3. `20260731000300_market_foundation_completion_v1.sql`
4. `20260731000400_manual_market_v1.sql`
5. `20260731000500_manual_market_database_hardening_v1.sql`
6. `20260731194719_harden_market_function_acl.sql`
7. `20260731201710_enforce_market_transaction_integrity.sql`

**CONFIRMED:** RLS is enabled on market tables; owner policies isolate portfolios/holdings/transactions/daily limits; public reads use narrow RPC projections; direct grants are revoked; function search paths and per-role execute ACLs are explicit. Migration 07 removes the admin-update variable ambiguity and prevents update/delete of valuation history.

**CONFIRMED STAGING EVIDENCE:** all seven migrations were applied only to FootballIQ Staging; schema checkpoint/restore evidence was created; anonymous, owner, non-owner, service-role, atomic buy/sell, idempotency, concurrency, Brussels-day, availability, admin and append-only tests passed using unmistakable non-production fixtures; fixtures were removed and the market was left fail-closed. **REQUIRES MANUAL VERIFICATION:** production has not been inspected or migrated and repository SQL is not proof of production state.

## Coverage, gaps and risks

- **CONFIRMED:** all 45 automated tests target Player Market rules, catalogue validation and migration contracts. There are no automated tests for authentication, quiz completion, progression, daily challenge, predictions, profiles or leaderboards.
- **KNOWN/LIKELY GAPS:** prediction outcomes/points are not implemented; content facts and referee-law wording need provenance/update review; legacy provider/automatic-market documents contradict the superseding Manual V1 documents; legacy root SQL files are not an ordered migration chain; several older docs still claim provider adapters/imports exist although active provider code was removed.
- **LEGAL SAFEGUARDS:** legal pages and `LEGAL_RISK_REGISTER.md` cover trademark, copyright, database rights, player-name/stat provenance, analytics/cookies and image rights. Market code excludes photos/crests/provider prices and requires independent selection/original values/human declarations. **REQUIRES MANUAL VERIFICATION:** legal review, content provenance, competition-name usage, player/stat database rights, privacy/analytics consent and any future commercial use.
- **DEPLOYMENT:** a GitHub remote and production build configuration exist, but the repository does not prove what is publicly deployed or which production schema/version is live. Nothing in the staging-hardening mission was pushed or deployed.
- **TOP BLOCKERS:** untested core auth/progression journey; unknown production database alignment; seven dependency audit findings; TypeScript build bypass; stale documentation; daily timezone ambiguity; legal/content provenance; and the intentionally absent defensible market catalogue/approval.
