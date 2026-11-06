import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('the home page has no sideways scroll at 375px and nothing is cut off', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  for (const section of await page.locator('main > section').all()) {
    const box = await section.boundingBox();
    expect(box && box.x >= -1 && box.x + box.width <= 376).toBe(true);
  }
});

test('the hero preview fits and shows no overlapping phone mock on a phone', async ({ page }) => {
  await page.goto('/');
  const preview = page.locator('main section').first().locator('[aria-hidden="true"]').filter({ hasText: 'Good morning' }).first();
  await expect(preview).toBeVisible();
  const box = await preview.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 376).toBe(true);
  await expect(preview.getByText('Create agreement', { exact: true })).toBeHidden();
});

test('pricing buttons and the footer disclaimer stay visible, and the floating button never covers the disclaimer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Choose Pro/ }).first().scrollIntoViewIfNeeded();
  await expect(page.getByRole('link', { name: /Choose Pro/ }).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const disclaimer = page.getByText(/is not a bank, escrow service/);
  await expect(disclaimer).toBeVisible();
  const chat = page.getByRole('button', { name: /WhatsApp/ });
  if (await chat.count()) {
    const a = await disclaimer.boundingBox();
    const b = await chat.boundingBox();
    expect(a && b && (a.y + a.height <= b.y || b.y + b.height <= a.y || a.x + a.width <= b.x || b.x + b.width <= a.x)).toBe(true);
  }
});

test('signed-out visitors are sent to log in for the billing page and for plans', async ({ page }) => {
  await page.goto('/billing');
  await expect(page).toHaveURL(/\/signin\?next=%2Fdashboard%2Fbilling/);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Create an Agreement' }).first()).toHaveAttribute('href', '/signup');
});
