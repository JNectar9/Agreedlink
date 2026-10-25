# Upgrade plan

Status of each phase. Nothing marked "not started" exists in the code yet.

## Audit of the existing app (before this upgrade)
Working and tested by hand: sign up and sign in, create agreement, share link, customer approve/decline/question, change proposals with comparison, versions, append-only history, notifications, link-opened status, settings. 26 unit tests passed in Vitest; the production build passed.

Gaps and risks found: no password reset, no contact channel, no rate limiting on customer endpoints, no file attachments, no drafts or editing before approval, no billing, a free-plan limit of 3 agreements per month that is the same for every account, banners that show text taken from the page address, and no end-to-end test of the full journey.

## Phase 1: design, contact, business profile (this upgrade)
Done in code: new palette and components, landing page, dashboard layout and navigation, pricing section (Pro shown as not yet available), Contact page and saved contact form with spam signals and database rate limits, footer with company details, business profile fields shown on the customer page, password reset, Lagos default time zone, migration 0002, unit tests for contact, site and greeting logic.
Needs your action: run migration 0002 in Supabase, redeploy, and test on your phone (see the update page).

## Phase 2: Paystack subscriptions in test mode (not started)
Needs from you first: a Paystack account, the test public and secret keys, and a plan created in the Paystack dashboard. Work: server-side checkout creation, server-side transaction verification, webhook signature check with idempotent processing, subscriptions table, billing page, plan limits enforced in the database, cancellation, failed-payment handling, tests. Live mode only after Paystack approves your business.

## Phase 3: drafts, editing, and multi-step flow (not started)
Save drafts, edit before sending, guided four-step form, cancelled status, new version when an approved agreement changes.

## Phase 4: attachments (not started)
Private Supabase Storage bucket, upload limits and type checks on the server, signed download links, access rules for creator and invited client.

## Phase 5: PDF records, rate limiting, hardening (not started)
Printable PDF record, rate limits on customer endpoints, stricter security headers, full end-to-end tests.
