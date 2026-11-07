import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const middleware = read('middleware.ts');
const header = read('components/SiteHeader.tsx');

describe('plans navigation', () => {
  it('View plans on the dashboard opens the billing page inside the dashboard', () => {
    const page = read('app/dashboard/page.tsx');
    expect(page).toMatch(/href="\/dashboard\/billing"[^>]*>View plans</);
    expect(page).not.toMatch(/href="\/pricing"[^>]*>View plans</);
  });
  it('/billing exists and redirects to the real billing page, keeping only a valid plan', () => {
    expect(existsSync(join(process.cwd(), 'app/billing/page.tsx'))).toBe(true);
    const r = read('app/billing/page.tsx');
    expect(r).toContain("redirect(`/dashboard/billing${query}`)");
    expect(r).toContain("plan === 'pro' || plan === 'premium'");
  });
  it('every link to billing points at a page that exists', () => {
    for (const f of ['components/DashboardNav.tsx', 'components/PricingPlans.tsx', 'components/PricingCards.tsx']) {
      expect(read(f)).not.toMatch(/href=\{?[`"']\/billing/);
    }
  });
});

describe('the session is never lost on public pages', () => {
  it('there is no way to sign out with a plain link (sign-out is a form action only)', () => {
    expect(existsSync(join(process.cwd(), 'app/auth/signout'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'app/api/auth/signout'))).toBe(false);
    expect(read('app/auth/actions.ts')).toContain('export async function signOutAction');
  });
  it('middleware only redirects the guarded areas', () => {
    expect(middleware).toContain("const GUARDED = ['/dashboard', '/portal']");
    expect(middleware).toMatch(/if \(!url \|\| !key\) return guarded \? toSignIn\(\) : NextResponse\.next\(\)/);
    expect(middleware).toMatch(/if \(!guarded\) \{[\s\S]*?return response;[\s\S]*?\}/);
    expect(middleware).toContain('if (!user) return toSignIn()');
  });
  it('middleware never calls signOut', () => {
    expect(middleware).not.toContain('signOut');
  });
  it('middleware refreshes the session on the home and marketing pages and still guards the app', () => {
    for (const path of ["'/'", "'/pricing'", "'/dashboard/:path*'", "'/portal/:path*'"]) expect(middleware).toContain(path);
  });
  it('public approval links and the open-tracking endpoint are not touched by middleware', () => {
    expect(middleware).not.toContain("'/a/");
    expect(middleware).not.toContain('/api/');
  });
  it('the public header shows a Dashboard button when signed in and Log in / Get started when not', () => {
    expect(header).toContain('isSignedIn');
    expect(header).toContain('Go to Dashboard');
    expect(header).toContain('Log in');
    expect(header).toContain('Get started');
    expect(read('lib/viewer.ts')).toContain('auth.getUser()');
    expect(read('lib/viewer.ts')).not.toContain('signOut');
  });
  it('the home page keeps signed-out visitors on the sign-up path and sends signed-in ones to the dashboard', () => {
    const home = read('app/page.tsx');
    expect(home).toContain("const startHref = signedIn ? '/dashboard/agreements/new' : '/signup'");
    expect(home).toContain('<SiteHeader signedIn={signedIn} />');
    expect(home.match(/href=\{startHref\}/g)?.length).toBe(2);
  });
});

describe('phone layout (375px)', () => {
  const hero = read('components/HeroPreview.tsx');
  it('hero preview has no cramped sidebar or overlapping phone on phones', () => {
    expect(hero).toContain('grid grid-cols-1 sm:grid-cols-[132px_1fr]');
    expect(hero).toMatch(/hidden bg-navy p-3 text-white sm:block/);
    expect(hero).toMatch(/absolute -bottom-1 -left-1 hidden w-28[^"]*sm:block/);
    expect(hero).not.toContain('grid-cols-[88px_1fr]');
  });
  it('the footer disclaimer has room above the floating button, and the button is smaller on phones', () => {
    expect(read('components/SiteFooter.tsx')).toContain('px-4 pb-24 pt-5');
    const w = read('components/WhatsAppWidget.tsx');
    expect(w).toContain('h-12 w-12');
    expect(w).toContain('max-h-[70vh]');
  });
  it('the pricing and disclaimer copy was not changed', () => {
    const home = read('app/page.tsx');
    expect(home).toContain('<PricingCards />');
    expect(home).toContain('<Faq />');
    expect(read('components/SiteFooter.tsx')).toContain('is not a bank, escrow service, payment processor, or law firm');
  });
});
