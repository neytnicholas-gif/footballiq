# Production promotion checklist

The current Early Shout beta branch is newer than the Vercel Production deployment. Vercel cron jobs run against Production, so the ratings pipeline cannot be witnessed until the current build is promoted with complete Production environment variables.

## Before promotion

- Retain Sportmonks' 13 August 2026 written approval with the private compliance records. It expressly permits player names, participation and ratings, Early Shout's derived fictional prices, caching for game logic/auditing, and free or paid game access without raw-data resale.
- Use `earlyshout.com` as the single licensed public domain. Keep `SPORTMONKS_API_TOKEN` out of Preview after the Production cutover unless Sportmonks confirms that private temporary Vercel previews do not require another domain licence.
- Ask Sportmonks to confirm the exact calls-per-entity-per-hour allowance for the active Football Starter plan and record the answer in the gameweek runbook.
- Create a fresh private backup with `npm run backup:supabase`.
- Confirm the Production values exist for:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SPORTMONKS_API_TOKEN`
  - `CRON_SECRET`
  - `MARKET_ADMIN_SECRET`
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPPORT_EMAIL`
  - `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`
  - `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS`
- Confirm `SPORTMONKS_API_TOKEN` is scoped to Production only after the final-domain cutover. The protected Preview coverage-trial route is expected to return a configuration error without a Preview token.
- Set Supabase's minimum password length to 10.
- Add the final domain and current preview hostname to the Turnstile widget.
- Deploy the public Turnstile site key before enabling CAPTCHA in Supabase.
- Verify the support inbox receives mail.

## Promote

Promote the verified Early Shout deployment only after the Production secrets are complete. Confirm the resulting deployment target is `production` and its commit matches the intended beta commit.

## Witness the first real gameweek

1. Confirm a supported fixture is finished and Sportmonks exposes minutes and player ratings.
2. Run the protected gameweek endpoint once or wait for the Production cron.
3. Confirm `market_processing_runs`, `market_player_match_stats`, and `market_valuation_events` gained records.
4. Confirm the gameweek shows fixture and processed-player counts without an error.
5. Confirm the affected player prices changed at most once.
6. Confirm a holding's value and Reveal match the valuation event.
7. Rerun the same job and confirm it is idempotent rather than applying a second movement.
8. Capture the processing-run identifier and counts in the launch evidence record.

Do not describe the live automatic ratings loop as proven until this witnessed run succeeds.
