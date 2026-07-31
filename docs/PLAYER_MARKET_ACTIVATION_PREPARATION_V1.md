# Player Market Activation Preparation V1

Status: proposed policy and offline tooling only. It is not permission to retrieve data, approve a catalogue, apply migrations or activate players.

## Deterministic 50-player policy

Input is a supplied licensed local export. The selector:

1. Groups verified candidates by the fixed 2026/27 eligible-club boundary.
2. Sorts each club by 2025/26 Premier League minutes descending.
3. Breaks equal-minute ties by stable provider player ID ascending, using numeric-aware string ordering.
4. Takes exactly two from each of 20 clubs: 40 players.
5. Sorts all remaining candidates by the same rule and takes the first 10: 50 total.
6. Sorts the final validated catalogue canonically before calculating its SHA-256 fingerprint.

No replacement is selected when a ranked candidate has an unresolved identity, club, transfer, participation, provenance or eligibility issue. The run fails and requires human action. Approval freezes the exact final list through its catalogue fingerprint.

## Required provider-neutral export

The JSON root requires `permissionApproval` and `candidates`.

Each candidate requires:

| Field | Requirement |
|---|---|
| `seasonKey` | Exactly `2026/27` |
| `priorSeasonKey` | Exactly `2025/26` |
| `providerPlayerId` | Stable, non-empty source ID |
| `fullName` | Verified real-player name |
| `clubName` | Verified current eligible club |
| `position` | `GK`, `DEF`, `MID` or `FWD` |
| `priorSeasonPremierLeagueMinutes` | Non-negative integer factual total |
| `sourceType` | `approved-provider` or `licensed-local` |
| `sourceReference` | Auditable export/endpoint/licence-ledger reference |
| `verifiedAt` | ISO-8601 verification timestamp |
| `isActive` | `true` for an eligible selection candidate |
| `currentClubVerified` | Explicit boolean |
| `identityVerified` | Explicit boolean |
| `eligibilityVerified` | Explicit boolean |
| `leagueParticipationVerified` | Explicit boolean |
| `reviewFlags` | Array of unresolved human-review warnings; must be empty for approval |

Do not include photographs, crests, provider prices, ratings or descriptive text. Prior-season minutes and identity/eligibility facts remain separate from FootballIQ-calculated initial and weekly values.

## Offline commands

Store the licensed export under ignored `tmp/market-catalogue/raw/`, then run:

```powershell
npm run market:catalogue:select -- --input tmp/market-catalogue/raw/licensed-provider-export.json
```

Outputs:

- `tmp/market-catalogue/validated/catalogue.validated.json`
- `tmp/market-catalogue/reports/catalogue.selection-review.json`
- `tmp/market-catalogue/reports/catalogue.selection-review.md`
- `tmp/market-catalogue/reports/catalogue.approval-template.json`

The generic structural-import command writes `catalogue.unselected.json`; it cannot activate the market.

After human review, approval remains a separate explicit command:

```powershell
npm run market:catalogue:approve -- --reviewer "<reviewer-name>"
```

Approval is blocked unless there are exactly 50 records, zero errors/warnings, the selection policy stamp is correct, the written-permission fingerprint exists, final application validation passes and the approval fingerprint matches the canonical selected catalogue.

## Approved zero-minute rule

Verified zero prior-season Premier League minutes are valid and do not create a warning by themselves. A zero-minute candidate is eligible only when current club, identity, general eligibility and 2026/27 Premier League participation are all explicitly verified. Any uncertainty in those checks must be recorded and blocks the entire catalogue without automatic substitution.
