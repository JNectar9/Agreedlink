import { expect, test } from '@playwright/test';

// Checks that public pages never scroll sideways at common Android and desktop widths.
const widths = [320, 360, 390, 1280];
const pages = ['/', '/pricing', '/contact', '/about', '/privacy', '/terms', '/signin', '/signup', '/forgot-password'];

for (const width of widths) {
  for (const path of pages) {
    test(`no horizontal scroll on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('landing page shows the reference headline and calls to action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('I never said that.');
  await expect(page.getByRole('link', { name: /Get Started Free/ }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /See How It Works/ })).toBeVisible();
  await expect(page.getByText(/join thousands/i)).toHaveCount(0);
  await expect(page.getByText(/in US dollars/i)).toHaveCount(0);
  await expect(page.getByText(/coming soon/i)).toHaveCount(0);
  await expect(page.getByText(/bank transfer in Naira/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
});

test('the WhatsApp helper opens and offers prefilled options', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Chat on WhatsApp' }).click();
  await expect(page.getByRole('link', { name: 'Talk to a human' })).toHaveAttribute('href', /wa\.me\/2348029864569/);
});

test('the pricing page shows US dollar prices only and ignores other currencies', async ({ page }) => {
  await page.goto('/pricing?currency=NGN');
  await expect(page.getByText(/\$9\/month/).first()).toBeVisible();
  await expect(page.getByText(/\$24\/month/).first()).toBeVisible();
  await expect(page.getByText('₦')).toHaveCount(0);
  await expect(page.getByText(/approximate/i)).toHaveCount(0);
});
