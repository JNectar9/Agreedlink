import { expect, test } from '@playwright/test';

// These smoke tests need no Supabase credentials. The full create -> approve -> change journey
// needs a configured test project and is listed as remaining work in docs/REMAINING.md.
test('landing page shows the promise and the JNectar credit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('I never said that.');
  await expect(page.getByText('Created by JNectar').first()).toBeVisible();
});

test('landing page does not scroll sideways', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the pricing page shows the three official plans without pretending checkout works', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText(/\$0 forever/).first()).toBeVisible();
  await expect(page.getByText(/\$9\/month/).first()).toBeVisible();
  await expect(page.getByText(/\$24\/month/).first()).toBeVisible();
  await expect(page.getByText('Available now').first()).toBeVisible();
  await expect(page.getByText('Coming soon').first()).toBeVisible();
  await expect(page.getByText(/activated by an administrator after the payment is verified/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Update prices/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Update prices/ })).toHaveCount(0);
});

test('sign in page loads', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: /Your agreements/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
});

test('signed-out visitors are sent away from the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/signin$/);
});

test('a malformed customer link shows the not-found page', async ({ page }) => {
  await page.goto('/a/not-a-real-token');
  await expect(page.getByRole('heading', { name: 'We could not find that page' })).toBeVisible();
});
