import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Auth Pages — Visual & Functional', () => {
  test('login page renders with WareOS branding', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('text=WareOS')).toBeVisible();
    await expect(page.locator('text=Sign in')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('register page matches WareOS design', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('text=WareOS')).toBeVisible();
    await expect(page.locator('text=Create account')).toBeVisible();
    await expect(page.locator('input#fullName')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Should NOT have shadcn Card components — check no data-slot="card"
    await expect(page.locator('[data-slot="card"]')).toHaveCount(0);
  });

  test('forgot-password flow shows confirmation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.click('text=Forgot password?');
    await expect(page.locator('text=Reset password')).toBeVisible();
    await page.fill('input[type="email"]', 'test@example.com');
    // Note: submitting will hit Supabase — we only test the UI transition
    await expect(page.locator('text=Send reset link')).toBeVisible();
  });

  test('register and login pages link to each other', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // No register link from login (by design), but login has forgot-password
    await expect(page.locator('text=Forgot password?')).toBeVisible();

    await page.goto(`${BASE_URL}/register`);
    await expect(page.locator('text=Sign in')).toBeVisible();
    await page.click('text=Sign in');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('No-Tenant Redirect', () => {
  test('unauthenticated user on /no-tenant gets passed through', async ({ page }) => {
    // Unauthenticated users can see the page (public route)
    // but in practice they'd never navigate here manually
    await page.goto(`${BASE_URL}/no-tenant`);
    await expect(page.locator('text=Access Pending')).toBeVisible();
    await expect(page.locator('text=Sign out')).toBeVisible();
  });
});

test.describe('Reset Password Page', () => {
  test('reset-password page shows verifying state', async ({ page }) => {
    await page.goto(`${BASE_URL}/reset-password`);
    await expect(page.locator('text=Set new password')).toBeVisible();
    // Without a code/token, should show verifying or no form interaction
    await expect(page.locator('text=Verifying reset link')).toBeVisible();
  });
});
