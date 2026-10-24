import { expect, test } from '@playwright/test';

// These smoke tests need no Supabase credentials. The full create -> approve -> change journey
// needs a configured test project and is listed as remaining work in docs/REMAINING.md.
test('landing page shows the promise and the JNectar credit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every project. Every change. Clearly agreed.');
  await expect(page.getByText('Created by JNectar').first()).toBeVisible();
});

test('landing page does not scroll sideways', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('paid plans are not presented as purchasable', async ({ page }) => {
  await page.goto('/#pricing');
  await expect(page.getByRole('button', { name: 'Not yet available' })).toHaveCount(2);
});

test('sign in page loads', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: 'Sign in to AgreedLink' })).toBeVisible();
});

test('signed-out visitors are sent away from the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/signin$/);
});

test('a malformed customer link shows the not-found page', async ({ page }) => {
  await page.goto('/a/not-a-real-token');
  await expect(page.getByRole('heading', { name: 'We could not find that page' })).toBeVisible();
});
