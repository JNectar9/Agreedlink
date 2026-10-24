# Remaining work

This is the honest list of what the first milestone does not do. Nothing here is faked in the app.

## From the specification, not built yet
- Multi-step create flow, Save Draft, and editing an agreement before approval (the "draft" status exists in the database but is never used).
- Password reset screen and flow.
- Manual "Remind Customer" action with limits (reminders are deferred).
- Downloadable PDF or printable records.
- Business logo upload and custom branding.
- Dedicated Change Requests, Activity, and Help pages (changes and history are shown on each agreement).
- Account export and deletion workflow. Note: append-only triggers allow deletes only when the parent agreement is already gone; verify this cascade with a real test before relying on it.
- Email notifications and customer email verification (no email provider is configured; the app sends no email).
- Full translation layer. Shared strings are in `messages/en.ts`; most page copy is still inline.
- Currencies beyond USD, NGN, GBP, EUR (add to `lib/money.ts` with the correct minor-unit exponent and tests).
- Default revision count and default terms in Settings.

## Hardening before a public launch
- Error and success banners show text taken from the page address (`?error=`). Replace with fixed message codes so a crafted link cannot display misleading text, especially on the customer page.
- Rate limiting for the customer decision and link-open endpoints.
- Content-Security-Policy header (basic security headers are set in `next.config.mjs`).
- Automated accessibility checks and a manual screen-reader pass.
- A full Playwright journey test (create -> approve -> change -> approve) against a test Supabase project.
- Verify the migration on a fresh database and add a rollback script.
- Legal review of the privacy policy and terms (both are marked as starter drafts).

## Payments
No payment provider is connected and no checkout exists. Pro and Early Access are shown as "not yet available". The prices and the Early Access terms in `lib/pricing.ts` are proposals to be validated.
