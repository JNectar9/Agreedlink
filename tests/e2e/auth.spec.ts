import { expect, test } from '@playwright/test';

test('sign up page has the required fields, hints, and a terms checkbox with real links', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByLabel('Full Name')).toBeVisible();
  await expect(page.getByLabel('Email Address')).toBeVisible();
  await expect(page.getByLabel(/Phone Number/)).toBeVisible();
  await expect(page.getByText('Include country code (e.g. +234...)')).toBeVisible();
  await expect(page.getByText('Minimum 8 characters')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
});

test('the password show and hide control works', async ({ page }) => {
  await page.goto('/signup');
  const field = page.getByLabel('Password', { exact: true });
  await expect(field).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(field).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(field).toHaveAttribute('type', 'password');
});

test('sign up cannot be submitted without agreeing to the terms', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Full Name').fill('Test User');
  await page.getByLabel('Email Address').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('longenough');
  await page.getByRole('button', { name: /Create Account/ }).click();
  await expect(page).toHaveURL(/\/signup$/);
});

test('footer shows each contact detail once', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: /\+234\d{10}/ })).toHaveCount(1);
  await expect(footer.getByRole('link', { name: /@gmail\.com/ })).toHaveCount(1);
});
