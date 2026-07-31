# Deprecated Player Market paths

The provider import, provider identity, prior-minutes selection, club quota,
match-statistics, rating, and automatic weekly valuation paths are not part of
the active simplified V1 architecture. Their public routes, package commands,
provider adapters, and executable scripts were removed so they cannot be run
accidentally.

Historical migrations and documents remain unchanged for auditability and
rollback context. Legacy demo/valuation modules that support isolated historical
tests are not an activation source: the strict manual loader rejects fixture
markers and unknown fields and never reads those modules.

Only these commands form the active catalogue/value workflow:

- `npm run market:catalogue:validate -- --input <manual-json>`
- `npm run market:catalogue:approve -- <all declaration flags>`
- `npm run market:value:update -- <server-only update arguments>`
