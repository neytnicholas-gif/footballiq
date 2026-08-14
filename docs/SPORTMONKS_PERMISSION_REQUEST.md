# Sportmonks written-permission request

**Status:** Fully clarified in writing by Sportmonks Support on 13–14 August 2026 (support reference `107405:1217471`). The replies expressly permit the requested factual player/participation/rating use, derived fictional prices, caching for game logic and audits, and free or paid game access without raw-data resale. Sportmonks also confirmed that private Vercel Preview URLs need no additional domain licence when they make no Sportmonks requests and the integration is restricted to Production on `earlyshout.com`. The Football Starter allowance is 2,000 calls per entity per hour. The original replies belong in the private compliance records, not this public repository.

No Sportmonks licensing or rate-limit clarification remains open for the documented Early Shout use. Full terms still apply and must be reviewed for future product changes.

## Follow-up sent after approval

> Hi Drake,
>
> Thank you for the clear written confirmation. We will use **earlyshout.com** as Early Shout's single public licensed domain.
>
> Vercel also creates temporary Preview URLs for private deployment testing. If `SPORTMONKS_API_TOKEN` is configured only for Production on earlyshout.com, and those Preview deployments do not call Sportmonks, can you confirm that the private temporary Preview URLs do not require a second domain licence?
>
> Please also confirm the exact calls-per-entity-per-hour allowance on my current Football Starter plan, or where that number is shown in MySportmonks, so I can configure the weekly importer below the limit.
>
> Many thanks,
> Nicholas

**Reply received 14 August 2026:** Sportmonks confirmed that these non-requesting Preview URLs do not require another domain licence, confirmed the Starter limit of 2,000 API calls per entity per hour, and directed the operator to the response `rate_limit` metadata and MySportmonks usage dashboard.

## Original request

This was sent from the account that owns the Sportmonks subscription. The approved request is retained here as the product's public compliance specification.

**To:** support@sportmonks.com

**Subject:** Written confirmation of permitted data use for Early Shout

Hello Sportmonks team,

I am building **Early Shout**, a football knowledge and fantasy-style player-value game operated from Belgium. The planned public domain is **https://earlyshout.com**. The current private beta uses a Vercel preview URL. Before opening it to public users, I would like written confirmation that my current **Football Starter (€29/month)** subscription permits the following use:

- import player names, competition/club associations, match participation, minutes and Sportmonks player ratings for the Premier League, La Liga and Ligue 1;
- display player names, selected factual match information and ratings to logged-in and logged-out users;
- calculate and display an original, fictional in-game player price derived from ratings and match participation;
- cache the minimum data needed in our database for catalogue performance, audit history, corrections and weekly game calculations;
- make the game available initially to beta testers and later to a public audience, potentially including paid access to the game itself;
- show historical in-game price movements and the reason for each movement.

The product does **not** use Sportmonks club logos or player photographs, does not claim endorsement, and does not resell or provide a downloadable copy of the Sportmonks dataset. In-game credits are fictional, non-purchasable, non-transferable and non-withdrawable.

Please confirm:

1. whether the uses above are permitted on my current plan;
2. whether the plan should be assigned to earlyshout.com and how the current Vercel preview domain should be handled;
3. whether there are user-volume, request, caching, retention, attribution or public-display limits;
4. whether a different licence is required if the game charges a small access fee;
5. the exact attribution wording and link, if any, that you require;
6. whether player names, match ratings and derived in-game prices can be shown publicly without separate image/logo rights;
7. whether the Premier League, La Liga or Ligue 1 carries additional restrictions.

I can provide screenshots, routes and a more detailed data-flow description if useful. Please include the applicable plan/licence name in your reply.

Kind regards,

[FULL LEGAL NAME]

Early Shout

[SPORTMONKS ACCOUNT EMAIL]

[WORKING SUPPORT EMAIL]
