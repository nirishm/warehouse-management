import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/t/test-tenant/inventory');
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(login|auth)/);
  });

  test('should redirect unknown routes to login', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    // Unknown routes may redirect to login or show a 404 page
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const body = await page.locator('body').textContent();
    const isLoginPage = /login|auth/i.test(url) || /sign in|email|password/i.test(body ?? '');
    const is404Page = /not found|404/i.test(body ?? '');
    expect(isLoginPage || is404Page).toBeTruthy();
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('reset password page loads', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
