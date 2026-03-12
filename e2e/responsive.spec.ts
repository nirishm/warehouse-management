import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('login page renders correctly on mobile', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    // Form should be visible and usable
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test('register page renders correctly on mobile', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});
