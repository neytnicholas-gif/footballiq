# Player Market QA Checklist

Scope: regression and fairness checks for flagship model revision.

## A. Schema and migration checks

1. Apply SUPABASE_PLAYER_MARKET_MVP.sql successfully in a clean environment.
2. Apply SUPABASE_PLAYER_MARKET_MODEL_REVISION_V1.sql successfully.
3. Confirm market_settings has max_portfolio_size = 8 and sell_spread_bps = 200.
4. Confirm market_players includes lock fields (is_trade_locked, reason, start, end).

## B. Trading rule checks

5. User can back players up to exactly 8 holdings.
6. Ninth back attempt fails with portfolio-full error.
7. Daily buy limit blocks fourth buy on same UTC day.
8. Daily sell limit blocks fourth sell on same UTC day.
9. Selling applies spread (execution value lower than gross current value).
10. Duplicate idempotency key does not create duplicate transaction.

## C. Lock behavior checks

11. Locked player blocks Back server-side.
12. Locked player blocks Sell server-side.
13. Player detail UI shows lock reason and lock status text.
14. Unlocking player restores normal Back/Sell behavior.

## D. Valuation event processor checks

15. Unverified rating event is rejected by processor.
16. Verified rating event marks processed = true with processed_at.
17. Reprocessing same external_event_id returns duplicate-safe response.
18. Value movement occurs only in 0.1m steps.
19. Per-match cap prevents extreme one-event jump.
20. Rolling-week cap bounds value movement window.

## E. Friends leagues beta checks

21. Authenticated user can create league and receives code.
22. Second user can join by code and appears in league leaderboard.
23. Non-owner can leave league successfully.
24. Owner leave attempt is blocked with explicit message.

## F. Route smoke tests

- /market
- /market/players
- /market/player/[slug]
- /market/portfolio
- /market/leaderboard
- /market/leagues

## G. Documentation consistency

- PLAYER_MARKET_OPERATIONS.md references revision SQL order.
- PLAYER_MARKET_DATA_SOURCES.md includes rating-event verification rules.
- PLAYER_MARKET_SEASON_POLICY.md exists and matches manual-season behavior.
- LEGAL_RISK_REGISTER.md includes rating-events, lock transparency, and leagues risks.
