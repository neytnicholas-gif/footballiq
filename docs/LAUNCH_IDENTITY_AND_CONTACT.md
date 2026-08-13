# Launch identity and contact gate

Early Shout must not enter a wider public or paid launch until all four public values below are real and monitored:

1. `NEXT_PUBLIC_LEGAL_OPERATOR_NAME` — the founder's full legal name or the registered business name.
2. `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS` — an appropriate service/business address that can lawfully be published.
3. `NEXT_PUBLIC_SUPPORT_EMAIL` — a working inbox that is checked regularly.
4. `NEXT_PUBLIC_SITE_URL` — the real public HTTPS origin.

These values are intentionally not guessed in source control. Add them to **Production, Preview and Development** in Vercel, then redeploy. Confirm the rendered `/privacy` and `/terms` pages show the intended details.

## Current domain finding (2026-08-13)

`earlyshout.com` returned DNS `NXDOMAIN`: it is not currently configured as a working website or mail domain. Consequently, the source-code fallback `hello@earlyshout.com` must not be advertised as a monitored address yet.

Before inviting external testers, either:

- register/configure the domain and create the inbox, including MX/SPF/DKIM/DMARC records; or
- set `NEXT_PUBLIC_SUPPORT_EMAIL` to another real, monitored address and `NEXT_PUBLIC_SITE_URL` to the actual Vercel/public URL.

Send a message to the configured inbox from an unrelated email account and reply to it. That is the acceptance test; the presence of text on the website is not proof that mail works.
