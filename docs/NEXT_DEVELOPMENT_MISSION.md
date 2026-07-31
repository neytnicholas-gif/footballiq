# Next development mission

## Core gameplay, authentication and progression end-to-end reliability

### Why this mission

Repository evidence shows six playable quiz modes, Daily Challenge, authentication, profiles, progression and leaderboards, but all 45 automated tests cover only Player Market behavior. The core acquisition/retention loop—play anonymously, sign up, choose a username, save a result, receive XP/streak/rating changes and appear correctly on profile/leaderboard—has no automated end-to-end protection and remains manually unverified. This outranks new content, redesign, predictions expansion and market activation because it makes the existing product safely usable before expanding it.

### Goal and user-visible outcome

Prove and repair one representative anonymous-to-authenticated gameplay journey, then protect the shared result-saving/progression contract used by all modes. A visitor can complete useful gameplay without signing in; after authentication they can save exactly one intended result, see clear success/error feedback, and observe consistent profile and leaderboard updates without stuck loading states or duplicate rewards.

### Likely scope

- Routes: `/`, `/quizzes/football-duels`, `/daily`, `/signup`, `/auth/callback`, `/login`, `/username`, `/profile`, `/leaderboard`, `/player/[username]`.
- Systems/files: `components/auth-provider.tsx`, representative game components, `lib/quiz-save.ts`, progression/competitive utilities, active profile/quiz database RPC and policies, and new focused tests.
- Inspect other game components to ensure the shared contract is used consistently; change them only when an evidenced common defect requires it.

### Non-goals

No visual redesign, new game mode/content pack, prediction settlement, Player Market catalogue, provider/API work, dependency upgrade, production migration, broad schema rewrite or deployment.

### Acceptance criteria

1. Anonymous visitor can start and finish the representative game and receives an explicit sign-in/save explanation.
2. Signup/login/callback/username/logout states always settle with accessible success or error feedback.
3. Authenticated completion calls the server-authoritative save contract once; retries/duplicate completion cannot unintentionally double-award progress.
4. XP, rating, accuracy, totals, perfect count, current/longest streak and mode stats update according to the active database contract and refresh in profile UI.
5. Profile and relevant leaderboard views reflect the saved result or show a clear recoverable error.
6. UTC versus Europe/Brussels daily/streak behavior is explicitly decided, implemented consistently and boundary-tested.
7. Loading buttons cannot remain permanently disabled after auth/network/database failure.
8. Existing Player Market tests and full repository validation remain green.

### Tests

- Automated: auth-state component behavior; quiz-save success/failure/duplicate paths; progression calculations; daily/streak timezone boundaries; representative anonymous and authenticated journey; profile refresh; leaderboard aggregation/error states.
- Manual browser: signed-out play; new signup/confirmation variant; login; username collision; save success; save failure/retry; profile and public profile; daily completion near Brussels boundary; leaderboard tabs; logout; mobile/keyboard/accessibility pass.

### Constraints, rollback and risks

- Never expose service-role credentials or weaken RLS/RPC authorization. Use only synthetic test users/content in non-production.
- Preserve legal wording and avoid adding unverified player/stat content.
- Rollback point: `e67b1ba6ab6ab01998071582e251e73270d34c3c` plus the documentation commit that follows it.
- Risks: deployed legacy schema may differ from repository SQL; email confirmation configuration varies; daily timezone semantics require an explicit choice; broad tests could accidentally depend on live services.

### Nicholas decision

Before implementation Nicholas must decide one product rule: should Daily Challenge/streak dates reset at **Europe/Brussels midnight** (recommended for consistency with Player Market limits) or at UTC midnight?

### Bounded implementation sequence

1. Verify repository/environment and inspect the deployed/non-production auth + `complete_quiz` contract without touching production.
2. Write failing unit/component tests for shared save/loading/error and progression behavior.
3. Add a synthetic non-production integration test for one representative quiz completion and duplicate retry.
4. Implement only evidenced fixes in shared auth/save/progression code.
5. Apply the approved daily timezone decision and boundary tests.
6. Manually test the routes above, then run lint, typecheck, all tests, build, diff and secret scans.
7. Review the complete diff and stop before push/deploy.
