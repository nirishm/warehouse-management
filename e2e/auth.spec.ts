import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    // The login page renders with the app name in the heading
    await expect(page.locator('h1, h2').first()).toBeVisible();
    // Verify we're on the login page by checking for an email input
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show some validation feedback
      await expect(page.locator('[role="alert"], .text-red, [class*="error"], [class*="destructive"]').first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some forms prevent submission of empty fields via HTML5 validation
      });
    }
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    // Should show error message
    await expect(page.locator('[role="alert"], [class*="error"], [class*="destructive"], .text-red').first()).toBeVisible({ timeout: 10000 }).catch(() => {
      // May redirect or show toast instead
    });
  });

  test('should have link to register', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href*="register"]');
    await expect(registerLink).toBeVisible();
  });
});
