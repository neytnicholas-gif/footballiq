# Simplified manually managed Player Market V1

This document supersedes the provider catalogue, deterministic 40+10 selection,
and automatic match-rating valuation plans for the active V1 market path. Older
documents and migrations remain as historical records only.

## Public catalogue contract

An approved catalogue contains 1–50 independently selected players. Public
records contain only an immutable FootballIQ internal ID, display name, original
FootballIQ value in integer minor units, availability, and timestamped value
history. Supported availability states are `available`, `sell_only`, and
`inactive`.

The current economy remains unchanged: one holding per player, five holdings per
portfolio, three buys and three sales per Europe/Brussels calendar day, and the
existing starting balance and value scale.

## Activation gate

Activation requires strict schema validation, no errors or unresolved review
warnings, deterministic canonicalisation, a SHA-256 catalogue fingerprint, a
separate human declaration, and explicit approval tied to that exact fingerprint.
Any change to an ID, name, value, availability, or history invalidates approval.
Fixtures and examples are permanently ineligible for activation.

## Human declaration

The reviewer must confirm that names were independently selected, no third-party
list was systematically copied, every starting value was created originally for
FootballIQ, the catalogue was manually reviewed, and confusing identities were
resolved. This process reduces but does not eliminate legal risk.

## Manual values

Value changes are optional and manually initiated through a controlled local
server-side command. Each request uses the immutable player ID, expected current
value, new value, effective timestamp, private justification, event type, and a
unique request ID. Corrections append events; history is never edited or deleted.

FootballIQ values are fictional play-money values. They are not financial assets,
professional advice, FPL prices, Transfermarkt values, or provider prices.

## Prohibited inputs

Do not scrape, import provider exports, copy complete squad/database lists, copy
FPL branding or prices, copy Transfermarkt values, use API-Football data, use
player photographs, use club or league crests, or imply endorsement.
