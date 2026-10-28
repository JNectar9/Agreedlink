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
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Make Agreements');
  await expect(page.getByRole('link', { name: /Create an Agreement/ }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();
});

test('the WhatsApp helper opens and offers prefilled options', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Chat on WhatsApp' }).click();
  await expect(page.getByRole('link', { name: 'Talk to a human' })).toHaveAttribute('href', /wa\.me\/2348029864569/);
});
