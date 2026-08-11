# FootballIQ sponsorship launch plan

## Decision

Launch direct, contextual sponsorship before an automated ad network. No sponsor unit renders unless an approved campaign is present in `lib/sponsorship.ts`.

## Safe placements

- Home page between content sections.
- Quiz landing and result pages, never between a question and its answer.
- Daily Challenge landing or completion page.
- Player Market summary pages, never beside Buy, Sell or trade-confirmation controls.

## Required campaign record

- Legal advertiser name and invoicing details.
- Campaign start/end date, placement list and agreed fee.
- Approved destination URL, copy, logo and image-rights confirmation.
- Confirmation that claims are accurate and the landing page suits FootballIQ's audience.
- Disclosure label: use `Advertisement` by default. Do not rely on vague wording such as `Partner` alone.
- Measurement agreed in advance: impressions and outbound clicks only unless separately reviewed.

## Categories not accepted

- Betting, gambling, tips or odds.
- Cash investments, crypto, player shares or get-rich-quick claims.
- Tobacco, vaping, adult content, weapons or illegal products.
- Misleading health, body-image or performance claims.
- Unlicensed club, competition or player merchandising.
- Products unsuitable for a broad football audience.

## Automated advertising gate

Do not add AdSense, Google Ad Manager or another behavioural network until all are complete:

1. A provider account and publisher approval exist.
2. A Google-certified CMP supporting the current IAB Europe TCF is configured for EEA/UK/Swiss visitors where required.
3. Privacy and cookie notices name the actual vendors and purposes.
4. Refuse, accept and manage choices are equally understandable and consent can be withdrawn.
5. Ads are excluded from transaction controls, account pages and sensitive/error states.
6. Child-audience and prohibited-category controls are reviewed.
7. Core Web Vitals, layout shift and mobile usability are re-tested with real ad scripts.

## Reporting

Never invent audience numbers. Use a dated report with unique visitors, sessions, geography where lawfully available, placement impressions, outbound clicks and campaign period. Mark beta or sample data clearly.
