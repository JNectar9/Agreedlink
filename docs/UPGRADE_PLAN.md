# Upgrade plan

Status of each phase. Nothing marked "not started" exists in the code yet.

## Audit of the existing app (before this upgrade)
Working and tested by hand: sign up and sign in, create agreement, share link, customer approve/decline/question, change proposals with comparison, versions, append-only history, notifications, link-opened status, settings. 26 unit tests passed in Vitest; the production build passed.

Gaps and risks found: no password reset, no contact channel, no rate limiting on customer endpoints, no file attachments, no drafts or editing before approval, no billing, a free-plan limit of 3 agreements per month that is the same for every account, banners that show text taken from the page address, and no end-to-end test of the full journey.

## Phase 1: design, contact, business profile (this upgrade)
Done in code: new palette and components, landing page, dashboard layout and navigation, pricing section (Pro shown as not yet available), Contact page and saved contact form with spam signals and database rate limits, footer with company details, business profile fields shown on the customer page, password reset, Lagos default time zone, migration 0002, unit tests for contact, site and greeting logic.
Needs your action: run migration 0002 in Supabase, redeploy, and test on your phone (see the update page).

## Upgrade 2: design correction (this update)
Done in code: brand loading screen and dashboard skeleton, landing page rebuilt to the reference layout (headline, hero with laptop, phone and WhatsApp previews, feature icons, how it works, features, pricing, FAQ, call to action), separate Pricing page, auth pages in one shared two-panel layout, dashboard rebuilt (navy sidebar, header search, bottom navigation on phones, stat cards, agreements chart, recent agreements, quick actions, plan card, recent activity, notifications), new Agreements, Templates, Clients, Notifications and Billing pages, floating WhatsApp helper with prefilled messages, mobile fixes (search row, filter chips, stat cards, badges), Playwright layout tests at 320, 360, 390 and 1280 pixels.
Real data only: the landing preview is the only sample data and is labelled. Platform statistics (total users, paid subscribers, all-user agreements, signups chart) come from the database and show only for emails in ADMIN_EMAILS. Paid subscribers is a real 0 until billing exists. The home page shows real counts only after PUBLIC_STATS_MIN_USERS users.
Not changed: no payments, no attachments, no drafts.
Not verified: the pages were not viewed in a browser (none available here). Run the layout tests and check on your phone.

## Upgrade 3: accounts, plans, profile photo (this update)
Done in code: sign-up and log-in rebuilt to the navy wave reference (logo, tagline, icon fields, show/hide password, terms checkbox linking to the real Terms and Privacy pages, "Creating account..." state, Google and GitHub buttons that stay hidden until configured), full name saved as user metadata `full_name` and the profile created by the database trigger (no duplicates), optional phone saved only when given, duplicate-email and unconfirmed-email messages, profile photo upload to a private Supabase Storage bucket with per-user rules, searchable time zone with Africa/Lagos and UTC suggestions, business information fields (JNectar details pre-filled only for the owner, address never filled), sticky Save button on phones, official plans in one config and one database table, active-agreement limit enforced by the database (draft, awaiting approval and approved count; completed, declined, expired and cancelled do not), cancel agreement, pricing and billing pages for the three plans with approximate naira labels and "coming soon" markers, footer and contact page showing each contact detail once.
Needs your action: run migrations 0003 then 0004, redeploy, and confirm the phone number (see the update page).
Plan features marked coming soon are NOT built: saved templates, attachments, PDF export, email invitations, advanced reporting, storage quotas, team workspace.

## Phase 2: Paystack subscriptions in test mode (not started)
Needs from you first: the Paystack test public and secret keys, a decision between charging in naira (fixed prices) or dollars (needs USD enabled on your Paystack account), and the plans created in the Paystack dashboard. The `subscriptions` table and plan limits already exist (migration 0004); this phase fills them from verified payments. Work: server-side checkout creation, server-side transaction verification, webhook signature check with idempotent processing, subscriptions table, billing page, plan limits enforced in the database, cancellation, failed-payment handling, tests. Live mode only after Paystack approves your business.

## Phase 3: drafts, editing, and multi-step flow (not started)
Save drafts, edit before sending, guided four-step form, cancelled status, new version when an approved agreement changes.

## Phase 4: attachments (not started)
Private Supabase Storage bucket, upload limits and type checks on the server, signed download links, access rules for creator and invited client.

## Phase 5: PDF records, rate limiting, hardening (not started)
Printable PDF record, rate limits on customer endpoints, stricter security headers, full end-to-end tests.
