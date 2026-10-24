# AgreedLink

**Approve the work. Agree on the changes.**
Created by JNectar.

AgreedLink helps freelancers and small custom-service businesses record what a customer approved, track requested changes, and record updated prices and deadlines before extra work begins.

AgreedLink is **not** a bank, escrow service, payment processor, or law firm. It records details and decisions entered in the app. It does not verify identities and does not guarantee legal enforceability.

## What this first milestone contains

Working journey: sign up -> create agreement -> share customer link -> customer approves, declines, or asks a question -> creator proposes a change -> customer approves, rejects, or asks a question -> new version and history are saved.

Included: landing, about, privacy and terms pages (legal pages are starter drafts that need legal review); Supabase email/password sign up, sign in, sign out; dashboard with real counts, search and filters; create/list/view agreements; share links with copy, WhatsApp, email and device sharing; customer page with no account; change proposals with side-by-side comparison; immutable versions and append-only history; link-opened status; in-app notifications; settings (name, business, time zone, default currency); integer minor-unit money; UTC timestamps shown in the viewer's time zone.

Not included (see `docs/REMAINING.md`): payments (intentionally none), password-reset screen, PDF records, automatic emails or reminders, logo upload, multi-step form and drafts, additional languages, rate limiting.

## Verification status (honest report)

This project was generated in an environment with no internet access, so dependencies could not be installed.

- Ran and passed: 16 assertions from the money, token, and terms unit tests, executed with a small stand-in test runner (not the real Vitest).
- **Not run**: `npm install`, `npm run typecheck`, `npm run lint`, `npm run build`, the real Vitest suite (including the validation tests), the Playwright tests, the database integration tests, and the SQL migration against a real Postgres. Expect that you may need to fix small type or version issues on first run. Run the commands in section 6 and treat any failure as a real finding.
- Package versions in `package.json` were chosen from memory and not checked against the registry. If `npm install` complains, adjust the version it names.

## 1. Import the ZIP into GitHub Codespaces (Android friendly)

Tip: in Chrome on Android, open the menu and tick **Desktop site** for the GitHub pages below.

1. Open your repository on github.com. Tap **Code** -> **Codespaces** -> **Create codespace on main**. Wait for the editor to load.
2. In the Explorer panel (file list), long-press an empty area -> **Upload...** -> choose `agreedlink.zip`.
   - If Upload does not appear: leave the codespace, go to your repo, tap **Add file** -> **Upload files**, upload the ZIP, commit it, then reopen the codespace and run `git pull`.
3. Open the terminal (menu -> Terminal -> New Terminal) and run:

```bash
unzip -o agreedlink.zip
cp -a agreedlink/. .
rm -rf agreedlink agreedlink.zip
ls
```

   `cp -a` overwrites files with the same name (for example an existing `README.md`). If your repo already has files you care about, copy them somewhere first.
4. Install dependencies:

```bash
npm install
```

5. Save your work to GitHub:

```bash
git add -A
git commit -m "Add AgreedLink first milestone"
git push
```

## 2. Supabase setup

1. Create a free project at supabase.com. Save the database password somewhere safe.
2. Open **SQL Editor** -> **New query**. Paste the entire contents of `supabase/migrations/0001_init.sql` and tap **Run**. It must finish without errors.
3. Open **Project Settings** -> **API**. Copy the **Project URL**, the **anon public** key, and the **service_role** key. The service_role key is a secret: never commit it, never put it in a variable that starts with `NEXT_PUBLIC_`.
4. Open **Authentication** -> **URL Configuration**. Set **Site URL** to your app URL (see section 3) and add `YOUR_APP_URL/auth/callback` under **Redirect URLs**.
5. Open **Authentication** -> **Providers** -> **Email**. Leave "Confirm email" on for real use. For quick testing you may turn it off.

## 3. Environment configuration

```bash
cp .env.example .env.local
openssl rand -base64 48
```

Open `.env.local` in the editor and fill in the values:

| Variable | What to put |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from step 2.3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `SHARE_TOKEN_SECRET` | the random string printed by `openssl` (at least 32 characters) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, or your Codespaces forwarded URL such as `https://NAME-3000.app.github.dev`, or your production domain. No trailing slash |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional contact address for the About page |

`.env.local` is ignored by git. Restart `npm run dev` after any change.

## 4. Run the app

```bash
npm run dev
```

Codespaces shows a forwarded port 3000 notification: tap **Open in Browser**. To test a customer link from a different phone, open the **Ports** tab, right-click port 3000, and set **Port Visibility** to **Public**. A public port is reachable by anyone who has the URL, so set it back to Private when you finish.

## 5. Try the main journey

1. Sign up (confirm the email if confirmation is on), sign in.
2. Create an agreement. On the detail page copy the customer link.
3. Open the link in a private/incognito tab. Approve it using a name.
4. Back in the dashboard, open the agreement, tap **Propose a change**, save it.
5. Reload the customer link. Compare the terms, then approve or reject.
6. Check the History section: every step appears, with its source label.

## 6. Test commands

```bash
npm run typecheck          # TypeScript
npm run lint               # ESLint
npm test                   # Vitest unit tests (no network or database needed)
npm run build              # production build

npx playwright install --with-deps chromium
npm run test:e2e           # smoke tests on a phone-sized and desktop browser; no Supabase needed
```

Database integration tests (authorization, append-only history, conflicting decisions) run against a real Supabase project. Use a separate test project, never your real one:

1. Create a second Supabase project and run `0001_init.sql` in it.
2. In `.env.local` set `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` to that test project's values.
3. Run `npm run test:integration`. Without those variables the tests are skipped, not passed.

## 7. Deploy (Vercel)

1. Push the code to GitHub (section 1, step 5).
2. At vercel.com choose **Add New** -> **Project**, import the repo (framework: Next.js).
3. Add the environment variables from section 3 (leave the `TEST_*` ones out). Set `NEXT_PUBLIC_SITE_URL` to the production URL.
4. Deploy. Then update Supabase **Site URL** and **Redirect URLs** to the production URL.
5. Before sharing publicly: have the privacy and terms pages reviewed by a qualified professional, and read `docs/REMAINING.md`.

## Security notes

- Browsers can only read their own rows (Row Level Security). All writes go through database functions that check ownership and state.
- Customer actions run on the server with the service role key and receive only a SHA-256 hash of the link token. Tokens are 256-bit random values; the database also holds an AES-256-GCM encrypted copy so you can copy a link again.
- Anyone who holds a customer link can respond on it. Use **Revoke link** or **New link** if a link goes to the wrong person.
- Customer names are typed text and are recorded as "name entered by the customer", not as verified identity.
- A free plan limit of 3 new agreements per month is enforced in the database. Billing does not exist.

See `docs/FILES.md` for what each file does.
