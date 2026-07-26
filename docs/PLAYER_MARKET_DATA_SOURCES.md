# Player Market Data Sources

This document distinguishes approved sources from pending integrations and prohibited methods.

## Current MVP source state

Approved for MVP demonstration:
- Owner-supplied seed dataset in SUPABASE_PLAYER_MARKET_SEED_DEMO.sql.
- Source label: Owner seed dataset.
- Source reference: internal-seed-v1.
- Provenance status: owner_seed_demo.
- Owner verification: required before production sign-off.

Flagship revision additions:
- Rating-event ingestion uses public.market_rating_events.
- Events must be owner-verified before valuation processing is allowed.
- Unverified events remain non-processable and must not influence prices.

## Production-ready verification requirements

Before any dataset is treated as verified production input:
- provenance_status must be set to verified,
- owner_verified must be true,
- source reference and retrieval date must be present,
- licence/legal review outcome must be recorded.

For rating events specifically:
- external_event_id must be globally unique,
- player_id must map to an active market player,
- minutes_played and rating_delta must be present,
- source_label and source_reference must be present,
- owner_verified must be true before processing.

## Provider abstraction implemented

Internal provider interface includes:
- fetchPlayers
- fetchSeasonStats
- fetchFixtures (placeholder)
- normalisePlayer
- normaliseStats
- validateProvenance

Current adapters:
- Seed provider: enabled for MVP demonstration only.
- Licensed provider placeholder: intentionally disabled until legal/licensing approval.

Valuation processing layer:
- market_process_rating_event(...) applies verified events with caps and 0.1m visible movement.
- Hidden accumulator state is server-only and not exposed to public client payloads.

## Pending integration (not active)

- Licensed third-party provider adapter is scaffolded only.
- It does not fetch live data and throws if used.
- Activation requires legal approval plus technical verification.

## Prohibited sources/methods

Do not use:
- Website scraping from SofaScore, PremierLeague.com, FPL, or similar sites.
- Undocumented or hidden APIs.
- Copied FPL prices, scoring models, terminology or interface cloning.

## Provenance fields required per row

Each imported player/stat row must include:
- provider/source label,
- source reference URL or source tag,
- retrieval timestamp,
- provenance/licence status,
- owner verification status.
