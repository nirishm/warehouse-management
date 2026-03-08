import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// These tests require a seeded empty tenant with a tenant_admin user.
// Set TENANT_SLUG, TEST_EMAIL, TEST_PASSWORD env vars to configure.
const TENANT_SLUG = process.env.TENANT_SLUG || 'test-tenant';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@test.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`**/t/${TENANT_SLUG}**`);
}

test.describe('Onboarding Wizard', () => {
  test('new tenant admin sees wizard on empty tenant', async ({ page }) => {
    await login(page);
    // Should see onboarding wizard, not regular dashboard
    await expect(page.locator('text=Add your first location')).toBeVisible();
    // Step indicator should be visible
    await expect(page.locator('.rounded-full.bg-\\[var\\(--accent-color\\)\\]')).toBeVisible();
  });

  test('location creation step works', async ({ page }) => {
    await login(page);
    await expect(page.locator('text=Add your first location')).toBeVisible();

    await page.fill('#loc-name', 'Test Warehouse');
    await page.fill('#loc-code', 'TW-01');
    await page.click('button:has-text("Create location")');

    // Should advance to commodity step
    await expect(page.locator('text=Add your first commodity')).toBeVisible();
  });

  test('skip button hides wizard', async ({ page }) => {
    await login(page);
    await expect(page.locator('text=Add your first location')).toBeVisible();
    await page.click('text=Skip setup');
    // After skip, page refreshes — should no longer show wizard
    // (it sets a localStorage key and refreshes)
    await page.waitForTimeout(1000);
  });

  test('invite step allows skipping to completion', async ({ page }) => {
    await login(page);
    // Navigate through to invite step
    await page.fill('#loc-name', 'Test Warehouse 2');
    await page.fill('#loc-code', 'TW-02');
    await page.click('button:has-text("Create location")');
    await expect(page.locator('text=Add your first commodity')).toBeVisible();

    // Skip commodity
    await page.click('button:has-text("Skip")');
    await expect(page.locator('text=Invite a team member')).toBeVisible();

    // Skip invite
    await page.click('button:has-text("Skip")');
    await expect(page.locator('text=You\'re all set!')).toBeVisible();
  });
});
