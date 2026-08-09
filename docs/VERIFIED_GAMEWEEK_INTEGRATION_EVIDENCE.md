# Verified gameweek integration evidence

On 2026-08-09 the connected Supabase project was tested inside a single
`BEGIN … ROLLBACK` transaction against the real
`market_apply_verified_gameweek(text,text,integer,timestamptz,timestamptz,jsonb)`
function.

The test selected an available player, submitted a 90-minute 9.1 rating, and
asserted that the player price changed, exactly one valuation event was written,
holdings were refreshed, and a Reveal was created for the existing portfolio.
It then submitted a late 90-minute 8.8 rating for the same gameweek and asserted
that every Reveal retained its original `previous_portfolio_value_minor`.

Observed before rollback:

- first run: `ok=true`, `processed_players=1`, `fixture_count=1`
- two distinct valuation events after the late fixture
- one portfolio Reveal verified
- original weekly baseline preserved

The transaction was rolled back, so no audit fixture, gameweek, price movement,
or Reveal remains in user data. This is an integration proof, not a replacement
for running the same assertions automatically against an isolated Supabase test
project in CI.
