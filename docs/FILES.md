# File listing

Every file in the project and what it does.

| File | Purpose |
|---|---|
| `.env.example` | Placeholder variable names only (Supabase, secrets, site URL). Copy to .env.local. |
| `.eslintrc.json` | ESLint config (Next.js core web vitals). |
| `.gitignore` | Keeps node_modules, build output and .env files out of git. |
| `README.md` | Setup, Codespaces import, Supabase, env, tests, deploy, honest verification status. |
| `app/a/[token]/actions.ts` | Server actions for customer decisions (call database functions with the token hash). |
| `app/a/[token]/page.tsx` | Public customer page: review terms, approve/decline/ask, decide on changes. |
| `app/about/page.tsx` | About page with the JNectar credit, limits statement, and contact. |
| `app/api/open/route.ts` | Records a link-open timestamp after the page renders (no IP stored). |
| `app/auth/actions.ts` | Sign up, log in, OAuth, sign out, forgot and reset password actions. |
| `app/auth/callback/route.ts` | Email confirmation callback that creates the session. |
| `app/contact/actions.ts` | Validates and saves contact messages; optional email alert when configured. |
| `app/contact/page.tsx` | Contact page with company details and the message form. |
| `app/dashboard/actions.ts` | Server actions for creators: create agreement, propose/withdraw change, link rotate/revoke, complete, settings, notifications. |
| `app/dashboard/agreements/[id]/page.tsx` | Agreement detail: terms, share tools, link status, changes, messages, history. |
| `app/dashboard/agreements/new/page.tsx` | Create-agreement form (single page in this milestone). |
| `app/dashboard/agreements/page.tsx` | Full agreement list with search and status filters. |
| `app/dashboard/billing/page.tsx` | Current plan, usage, downgrade explanation, and the three plans. |
| `app/dashboard/clients/page.tsx` | Clients built from agreements, totals kept per currency. |
| `app/dashboard/layout.tsx` | Authenticated shell: navy sidebar, header search, bottom navigation on phones. |
| `app/dashboard/loading.tsx` | Dashboard skeleton shown while data loads. |
| `app/dashboard/notifications/page.tsx` | All notifications with mark-all-read. |
| `app/dashboard/page.tsx` | Dashboard: greeting, stats, owner statistics, chart, recent agreements, quick actions, activity. |
| `app/dashboard/settings/page.tsx` | Settings: photo, account, business information, searchable time zone, sticky save. |
| `app/dashboard/templates/page.tsx` | Starter templates that prefill a new agreement. |
| `app/forgot-password/page.tsx` | Request a password reset email. |
| `app/globals.css` | Tailwind layers and shared component classes (btn, input, card). |
| `app/icon.svg` | Favicon using the logo mark. |
| `app/layout.tsx` | Root layout, Inter font, site metadata. |
| `app/loading.tsx` | Brand loading screen (navy, logo, tagline, progress bar). |
| `app/not-found.tsx` | 404 page. |
| `app/page.tsx` | Home page: hero with previews, features, how it works, pricing, FAQ, call to action. |
| `app/pricing/page.tsx` | Pricing page with plans and questions. |
| `app/privacy/page.tsx` | Starter privacy policy (flagged for legal review). |
| `app/reset-password/page.tsx` | Choose a new password from the emailed link. |
| `app/signin/page.tsx` | Sign-in form with setup notice when Supabase is not configured. |
| `app/signup/page.tsx` | Sign-up form. |
| `app/terms/page.tsx` | Starter terms of service (flagged for legal review). |
| `components/ActivityChart.tsx` | Area chart drawn from real counts with an honest empty state. |
| `components/AgreementRow.tsx` | Agreement list row, table-like on desktop and a card on phones. |
| `components/AuthField.tsx` | Dark icon form field with show/hide password. |
| `components/AuthShell.tsx` | Navy screen with logo, tagline and waves for sign up, log in and password pages. |
| `components/Avatar.tsx` | Profile picture or initials. |
| `components/AvatarUploader.tsx` | Pick, preview, upload, replace and remove a profile photo. |
| `components/ComparisonTable.tsx` | Side-by-side current versus proposed terms with Changed labels. |
| `components/DashboardNav.tsx` | Sidebar and phone bottom navigation with active state and unread badge. |
| `components/Faq.tsx` | Accessible FAQ list. |
| `components/HeroPreview.tsx` | Decorative laptop, phone and WhatsApp preview built from labelled sample data. |
| `components/LegalPage.tsx` | Layout for legal pages with a review warning. |
| `components/LocalTime.tsx` | Shows a UTC timestamp in the visitor local time zone. |
| `components/Logo.tsx` | Original SVG logo mark and wordmark, with a light variant for dark backgrounds. |
| `components/Notice.tsx` | Error, success and info banners. |
| `components/OAuthButtons.tsx` | Google and GitHub buttons, shown only when configured. |
| `components/OpenBeacon.tsx` | Reports a link open from the browser after render. |
| `components/PricingCards.tsx` | The three official plans with approximate naira labels and coming-soon markers. |
| `components/SetupNotice.tsx` | Clear message shown when Supabase is not configured. |
| `components/ShareButtons.tsx` | Copy, WhatsApp, email and native share with an editable message. |
| `components/SiteFooter.tsx` | Footer with company, contact, legal links and the Created by JNectar credit. |
| `components/SiteHeader.tsx` | Public header with collapsible mobile menu. |
| `components/StatCard.tsx` | Dashboard statistic card. |
| `components/StatusBadge.tsx` | Status label with icon (never colour alone). |
| `components/SubmitButton.tsx` | Submit button with loading state that blocks double submission. |
| `components/TimezoneField.tsx` | Searchable time zone field with Africa/Lagos and UTC suggestions. |
| `components/Waves.tsx` | Decorative flowing waves for the navy auth screens. |
| `components/WhatsAppWidget.tsx` | Floating WhatsApp helper with prefilled message options. |
| `docs/FILES.md` | This file. |
| `docs/REMAINING.md` | What is not built yet and what to do before launch. |
| `docs/UPGRADE_PLAN.md` | Audit summary and the phased upgrade plan with honest status. |
| `lib/admin.ts` | Owner check using the server-only ADMIN_EMAILS list. |
| `lib/auth-validation.ts` | Sign-up validation and phone number normalisation. |
| `lib/avatar.ts` | Avatar rules and signed photo links. |
| `lib/contact.ts` | Contact form validation and spam checks. |
| `lib/data.ts` | Session guard, shared row types, display-status helper. |
| `lib/env.ts` | Reads configuration and reports whether setup is complete. |
| `lib/faq.ts` | FAQ questions and honest answers. |
| `lib/links.ts` | Builds the customer URL from the encrypted token (not a server action). |
| `lib/money.ts` | Currency list, integer minor-unit parsing, formatting, no floating-point math. |
| `lib/plans.ts` | Official Free, Pro and Premium plan definitions, approximate naira helper. |
| `lib/platform.ts` | Real platform counts from the database (owner dashboard, public strip). |
| `lib/site.ts` | Company name, contact details (defaults from JNectar) and WhatsApp link helper. |
| `lib/stats.ts` | Counts timestamps per day in a time zone (for charts). |
| `lib/supabase/admin.ts` | Server-only service-role client used for customer functions. |
| `lib/supabase/browser.ts` | Browser Supabase client used for photo uploads (RLS and storage rules apply). |
| `lib/supabase/server.ts` | Supabase client bound to the signed-in user (RLS applies). |
| `lib/templates.ts` | Starter agreement templates. |
| `lib/terms.ts` | Terms type, side-by-side comparison, price difference. |
| `lib/time.ts` | Time zone aware date and plain-date formatting. |
| `lib/tokens.ts` | Share token generation, SHA-256 hashing, AES-256-GCM encryption. |
| `lib/validation.ts` | Zod schemas and parsers for agreements, changes, and customer decisions. |
| `messages/en.ts` | Shared English strings: statuses, event labels, error copy, share message. |
| `middleware.ts` | Refreshes the Supabase session and redirects signed-out visitors away from /dashboard. |
| `next.config.mjs` | Next.js config with basic security headers. |
| `package.json` | Dependencies, pinned versions, and npm scripts. |
| `playwright.config.ts` | Playwright projects: Android phone size and desktop. |
| `postcss.config.js` | Tailwind and autoprefixer plugins. |
| `public/.gitkeep` | Keeps the public folder in git. |
| `supabase/migrations/0001_init.sql` | Tables, immutability triggers, database functions, privileges, Row Level Security. |
| `supabase/migrations/0002_contact_business_profile.sql` | Business profile fields, contact messages with rate limits, Lagos default time zone, updated customer_get. |
| `supabase/migrations/0003_cancelled_status.sql` | Adds the cancelled agreement status. Run alone, before 0004. |
| `supabase/migrations/0004_accounts_plans_avatars.sql` | Profile phone, avatar and terms fields, new-user trigger, plans and subscriptions tables, active-agreement limit, cancel_agreement, private avatars bucket. |
| `tailwind.config.ts` | AgreedLink colour tokens (navy, blue, status colours) and font. |
| `tests/e2e/auth.spec.ts` | Playwright checks for sign-up fields, show/hide password, terms checkbox, footer contacts. |
| `tests/e2e/layout.spec.ts` | Playwright checks for no sideways scrolling at 320, 360, 390 and 1280 pixels. |
| `tests/e2e/smoke.spec.ts` | Playwright smoke tests for phone and desktop widths. |
| `tests/integration/database.test.ts` | Authorization, append-only history, and conflicting decision tests (need a test Supabase project). |
| `tests/unit/admin.test.ts` | Unit tests for the owner check. |
| `tests/unit/auth-validation.test.ts` | Unit tests for sign-up validation and phone numbers. |
| `tests/unit/contact.test.ts` | Unit tests for contact validation and spam checks. |
| `tests/unit/money.test.ts` | Unit tests for money parsing and formatting. |
| `tests/unit/plans.test.ts` | Unit tests for plans, naira ranges, and sync with the database limits. |
| `tests/unit/site.test.ts` | Unit tests for contact details and WhatsApp link. |
| `tests/unit/stats.test.ts` | Unit tests for day bucketing. |
| `tests/unit/templates.test.ts` | Checks every template produces a valid agreement. |
| `tests/unit/terms.test.ts` | Unit tests for comparison logic. |
| `tests/unit/time.test.ts` | Unit tests for date, time zone and greeting formatting. |
| `tests/unit/tokens.test.ts` | Unit tests for token hashing and encryption. |
| `tests/unit/validation.test.ts` | Unit tests for form validation. |
| `tsconfig.json` | TypeScript settings and the @/ import alias. |
| `vitest.config.ts` | Vitest settings and @/ alias. |
