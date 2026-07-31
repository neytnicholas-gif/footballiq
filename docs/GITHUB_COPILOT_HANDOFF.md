# GitHub Copilot handoff — FootballIQ

## Required starting state

- Repository: `C:\Users\neytn\Downloads\refdecision-v2-referee-rating`
- Branch: `safety/validated-local-2026-07-30`
- Previous verified baseline: `e67b1ba6ab6ab01998071582e251e73270d34c3c`
- Required starting HEAD: the local commit titled `Document FootballIQ current state and next development mission` whose full hash is reported in the originating Codex final report. Confirm that its parent is the baseline above and that `git status --short` is empty.

```powershell
(Get-Location).Path
git branch --show-current
git rev-parse HEAD
git log -2 --oneline
git status --short
node --version
npm --version
where.exe node
where.exe npm
node -e "console.log(require('os').userInfo())"
```

Verified environment at handoff: Node `v24.18.0`, npm `11.16.0`; `os.userInfo()` succeeds.

## Install and validation

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Do not run `npm audit fix`. The clean install reports seven known findings (two moderate, five high); dependency remediation is a separate approved mission.

## Architecture and current state

Next.js 16 App Router + React 19 + TypeScript + Tailwind UI; Supabase supplies auth, profiles, results, competitive data and Player Market persistence. Client game components use repository-owned static datasets and save authenticated results through `complete_quiz`. Six quiz modes, Daily Challenge, simulation predictions, profiles, progression and multi-board leaderboards exist. Inspect active code and tests before trusting older planning documents.

Player Market migrations are ordered through `20260731201710`. Staging-only validation proved RLS/owner isolation, narrow public projections, explicit RPC ACLs/search paths, atomic/idempotent/concurrent transactions, Brussels daily limits, availability behavior, service-admin value updates and append-only valuation history. Temporary fixtures were removed. The market remains fail-closed because no validated manual catalogue and exact fingerprint approval exist. Production state is unknown and was untouched.

Manual V1 legal/data controls prohibit scraping, systematic database copying, provider prices, photos and crests; require independently selected identities, original FootballIQ values, human review/declarations and exact fingerprint approval. Never infer licences or declarations.

## Exact next mission

Implement **Core gameplay, authentication and progression end-to-end reliability** as defined in `docs/NEXT_DEVELOPMENT_MISSION.md`. Prove one anonymous-to-authenticated representative game journey and protect the shared save/progression contract.

Acceptance requires signed-out play, settled auth/save feedback, no unintended duplicate reward, correct profile/progression/mode stats, recoverable leaderboard/profile behavior, explicit Brussels-versus-UTC daily semantics, no stuck loading state, automated coverage and a full manual browser pass. Nicholas must first decide whether Daily/streak reset uses Europe/Brussels midnight (recommended) or UTC.

## Working rules

1. Inspect active routes, components, `lib/quiz-save.ts`, auth provider, progression code and database contract before editing.
2. Preserve existing work; stop if branch/HEAD/status differs.
3. Stop on schema or product-rule ambiguity instead of inventing behavior.
4. Keep changes tightly within the selected mission and add focused tests first.
5. Review the full diff and rerun all validation before any local commit.

Without new explicit approval, **do not** contact/modify production; contact staging unnecessarily; apply/change remote migrations; call provider APIs; add real-player data; activate a catalogue; guess licences/declarations; upgrade dependencies; run `npm audit fix`; expose credentials; push; deploy; add unrelated features; or discard existing work.
