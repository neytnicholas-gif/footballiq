# Supabase non-production Manual Player Market V1 runbook

Do not execute this runbook without explicit authorization and positive proof of
a separate non-production project. Never infer safety from an environment name.

## Required evidence before contact

- Authorized non-production project reference recorded without credentials.
- Local project metadata and configured URL independently match that reference.
- Authorized operator and exact test-user identities.
- Restorable pre-migration checkpoint, proven restore identifier, schema version,
  migration list, and relevant table row counts.
- Reviewed migrations in order: `20260727_01`, `20260727_02`, `20260731_03`,
  `20260731_04`, then `20260731_05`.
- No real catalogue, approval, provider data, credentials, or production data in
  the test fixtures.

## Manual V1 catalogue boundary

Manual catalogues contain 1–50 independently curated names and original
FootballIQ values. Activation requires schema version 1, zero errors, zero
warnings, exact canonical fingerprint agreement, reviewer identity and timestamp,
and all five human declarations. Provider permissions, provider fingerprints,
provider selection reports, club quotas, and the 40+10 system are not applicable.

## Procedure

1. Record the non-production reference, checkpoint, restore identifier, schema
   version, migration history, relevant row counts, and existing grants/policies.
2. Review every statement, constraint, index, RLS policy, grant, and privileged
   function in migrations 01–05. Stop on any unexplained drift.
3. Apply migrations to the verified non-production project in order, stopping on
   the first error. Never rewrite historical migrations to match remote drift.
4. Generate TypeScript types from that exact schema. Add them only after checking
   that the diff contains no secret or environment value.
5. Confirm Data API exposure separately from RLS. Public clients must execute only
   `market_public_players_v1`, `market_public_value_history_v1`, and
   `market_public_leaderboard_v1`; direct legacy-table reads must be denied.
6. Test anonymous, authenticated owner, authenticated non-owner, ordinary user,
   authorized service-role, and unauthorized administrative access.
7. Prove public projections exclude provider, club, position, rating, bank,
   provenance, private justification, and deprecated columns.
8. Test missing, false, stale, and mismatched activation evidence; every case must
   remain closed. Test both 1-player and 50-player boundaries with unmistakably
   non-activatable fixtures.
9. Test `available` buying/selling, `sell_only` sale-only behavior, and `inactive`
   exclusion from browsing while an existing holding remains visible and sellable
   at its last authoritative FootballIQ value.
10. Test club-independent portfolio snapshots, cash, wealth, profit/loss, returns,
    transaction history, value history, and leaderboard projections.
11. Confirm ordinary users cannot execute `market_admin_update_player_value`, the
    service-role path still requires an acting UUID in `market_admins`, private
    justifications remain inaccessible, and legacy automatic valuation always
    raises `LEGACY_AUTOMATIC_VALUATION_DISABLED`.
12. Test atomic buys/sales, stale expected prices, five holdings, three buys and
    three sales per Europe/Brussels day, DST boundaries, duplicate requests,
    conflicting request reuse, concurrent requests, stale expected values,
    immutable events, and correction events without deletion.
13. Run current database, security, and performance advisors. Resolve or formally
    disposition every finding.
14. Run local lint, TypeScript, all tests, production build, secret scans, provider
    scans, and browser checks against the non-production environment.

## Rollback

Stop all test traffic and preserve sanitized evidence. Restore the recorded
pre-migration checkpoint using the approved platform restore procedure; do not
improvise destructive down migrations. Confirm the restored migration version,
row counts, RLS policies, function grants, and anonymous/owner/non-owner isolation
match the checkpoint before any retry.

## Evidence required before production consideration

- Proven backup and restore evidence.
- Migration application log and generated-types diff.
- Full role/RLS/public-projection test evidence.
- Activation fingerprint/declaration rejection evidence.
- Transaction, concurrency, idempotency, availability, portfolio, and Brussels
  boundary results.
- Advisor results and dispositions.
- Independent human catalogue declaration and legal/product/security approval.
- Separate explicit production change authorization.
