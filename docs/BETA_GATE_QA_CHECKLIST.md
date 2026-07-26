# Beta Gate QA Checklist

Scope: persisted XP/ratings/streaks, save/resume behavior, Daily correctness, leaderboard correctness, RLS isolation, and release-branding cleanup.

Prerequisites:
- Apply SQL using docs/SUPABASE_BETA_GATE_RUNBOOK.md in the exact canonical order.
- Prepare two test accounts: User A and User B.
- Have desktop browser + mobile viewport/device available.

Pass/Fail notation for every case:
- [ ] PASS
- [ ] FAIL

## M-01 Anonymous gameplay baseline (desktop)
- Starting state: logged out, clean browser tab, desktop viewport.
- Actor: logged out.
- Actions: open /quizzes, play one full run in Referee Arena and one full run in Scout Vision, reach final save action.
- Expected result: gameplay works; save CTA asks user to sign in/create account; no crash and no raw DB error text.
- Verify row/value: no new row for anonymous user can exist in public.quiz_results; visible confirmation is save-disabled or sign-in prompt copy.
- Evidence to retain: screenshot of final screen save messaging for both modes.
- [ ] PASS
- [ ] FAIL

## M-02 Account prompt dismissal behavior
- Starting state: logged out, new sessionStorage context, homepage loaded.
- Actor: logged out.
- Actions: wait for prompt appearance, dismiss with close button, navigate to /quizzes and back to /.
- Expected result: prompt appears only after delay, dismisses instantly, stays dismissed for current session.
- Verify row/value: visible value only (no DB write expected).
- Evidence to retain: screenshot before dismiss + screenshot after return navigation showing prompt remains hidden.
- [ ] PASS
- [ ] FAIL

## M-03 Account creation and first identity setup
- Starting state: logged out, no active auth session.
- Actor: logged out then User A.
- Actions: create account from /signup, complete auth, set username on /username if prompted, open /profile.
- Expected result: user reaches authenticated state without loop; username saved; profile loads with default stats.
- Verify row/value: public.profiles contains one row for User A id with non-null username after save.
- Evidence to retain: screenshot of /profile header with username and xp/rating values.
- [ ] PASS
- [ ] FAIL

## M-04 Signed-in save/resume (Referee Arena)
- Starting state: User A logged in, no existing in-progress row for referee-decisions-1.
- Actor: User A.
- Actions: answer at least 2 scenarios, refresh page, click resume banner continue.
- Expected result: session resumes at same scenario index with preserved score/selection state.
- Verify row/value: public.quiz_progress has row for User A + quiz_id referee-decisions-1 with status in_progress before completion.
- Evidence to retain: screenshot of resume banner and resumed scenario index.
- [ ] PASS
- [ ] FAIL

## M-05 Start again clears in-progress state
- Starting state: User A has in-progress state for one mode (Referee Arena or Scout Vision).
- Actor: User A.
- Actions: trigger resume banner, choose Start again.
- Expected result: attempt resets to beginning and previous in-progress state is cleared/replaced.
- Verify row/value: public.quiz_progress row index resets to 0 path or row removed/recreated with fresh state.
- Evidence to retain: screenshot of Start again action and first question/scenario.
- [ ] PASS
- [ ] FAIL

## M-06 Resumed completion reward write
- Starting state: User A mid-run in Scout Vision with in-progress state present.
- Actor: User A.
- Actions: resume, finish run, click final save action once.
- Expected result: result saves, completion message shows credited or already-credited status, and in-progress banner no longer appears on reload.
- Verify row/value: public.quiz_results contains one row for quiz_id would-you-scout-1; public.quiz_progress status for that quiz no longer in_progress.
- Evidence to retain: screenshot of final status message + post-refresh no-resume state.
- [ ] PASS
- [ ] FAIL

## M-07 Duplicate reward protection single-tab
- Starting state: User A already completed a specific quiz id once.
- Actor: User A.
- Actions: replay same mode and finish again in same tab; press save.
- Expected result: UI reports already credited (or equivalent); XP/rating/streak do not increment a second time.
- Verify row/value: public.quiz_results remains single row for (User A, quiz_id); public.profiles xp/rating unchanged after second save.
- Evidence to retain: screenshot of already-credited message and before/after profile stats.
- [ ] PASS
- [ ] FAIL

## M-08 Duplicate reward protection race (two tabs)
- Starting state: User A logged in on two tabs at same quiz final step.
- Actor: User A.
- Actions: submit save in both tabs nearly simultaneously.
- Expected result: only one credited completion; second tab resolves to already-credited/no-op.
- Verify row/value: one row only for (user_id, quiz_id) in public.quiz_results and no double increment in public.profiles.
- Evidence to retain: screenshot from both tabs with outcome messages and DB query result screenshot.
- [ ] PASS
- [ ] FAIL

## M-09 Sign-out/sign-in persistence
- Starting state: User A has saved profile stats and optionally one in-progress quiz.
- Actor: User A.
- Actions: sign out, close tab, sign in again, return to /profile and affected mode.
- Expected result: profile stats persist; any in-progress eligible state is restored; completed runs do not show stale resume banner.
- Verify row/value: public.profiles stats match pre-signout snapshot; public.quiz_progress reflects actual unfinished state only.
- Evidence to retain: screenshot pre-signout and post-signin of profile + mode entry screen.
- [ ] PASS
- [ ] FAIL

## M-10 Daily Challenge date and streak behavior
- Starting state: User A logged in; Brussels date key known for current day.
- Actor: User A.
- Actions: complete /daily and save reward; attempt second save same Brussels day.
- Expected result: first save credited, second save blocked/already-credited; streak behavior updates once per valid completion day.
- Verify row/value: one public.quiz_results row for quiz_id daily-<key>; public.profiles.last_activity_date and streak/current_streak change once.
- Evidence to retain: screenshot of daily completion message and profile streak section.
- [ ] PASS
- [ ] FAIL

## M-11 Leaderboard update visibility (desktop)
- Starting state: User A has just earned new credited XP, signed out state also available.
- Actor: User A then logged out viewer.
- Actions: open /leaderboard signed in, then signed out; open /player/<username>.
- Expected result: updated public stats visible on leaderboard/profile view; only public fields shown.
- Verify row/value: public view rows exist in public.public_leaderboard_profiles and public.public_leaderboard_quiz_results; rendered XP/rating align.
- Evidence to retain: screenshot of leaderboard entry and public player page.
- [ ] PASS
- [ ] FAIL

## M-12 Two-user RLS and data isolation
- Starting state: User A and User B both have accounts and some gameplay data.
- Actor: User A and User B.
- Actions: while signed in as User B, attempt to access User A private data paths/features; repeat vice versa.
- Expected result: private rows are isolated by RLS; only public leaderboard views are shared.
- Verify row/value: direct selects by non-owner on profiles/quiz_results/quiz_progress/predictions are denied by policy; public views remain readable.
- Evidence to retain: screenshot or SQL output showing denied private access and successful public view read.
- [ ] PASS
- [ ] FAIL

## M-13 Mobile QA sweep
- Starting state: User A logged in on mobile viewport/device.
- Actor: User A.
- Actions: run /daily, /quizzes/referee-decisions, /quizzes/football-duels, /leaderboard; perform one resume flow and one save flow.
- Expected result: no clipped controls, no blocked CTA, no impossible tap targets, save/resume/messages remain readable.
- Verify row/value: visible values (scores/xp/status copy) match desktop behavior; optional check that same quiz_results rows are written.
- Evidence to retain: one screenshot per route listed above from mobile.
- [ ] PASS
- [ ] FAIL

## M-14 Legacy RefDecision branding search
- Starting state: repository at current branch, desktop browser and code search available.
- Actor: maintainer.
- Actions: search UI and repository for legacy naming variants: RefDecision, Ref Decision, referee-decisions old branding strings.
- Expected result: no outdated legacy product branding appears in routed UI; only current naming is visible.
- Verify row/value: visible value check in UI; code search result count for legacy strings recorded.
- Evidence to retain: screenshot of search results and screenshot of current Referee Arena page title.
- [ ] PASS
- [ ] FAIL
