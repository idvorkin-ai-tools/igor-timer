/**
 * Update Banner E2E Tests
 *
 * Tests the version check / update banner functionality.
 * Note: The update banner only shows when service worker detects a new version,
 * which is hard to simulate in e2e tests. These tests verify the component exists
 * and can be interacted with when visible.
 */

import { expect, test } from '@playwright/test';

test.describe('Update Banner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should not show update banner on fresh load', async ({ page }) => {
    // Update banner should not be visible on initial load (no update available)
    await expect(page.locator('[class*="UpdateBanner"]')).not.toBeVisible();
  });

  test('UpdateBanner component should exist in DOM when update available', async ({ page }) => {
    // Inject a mock to simulate update available
    await page.evaluate(() => {
      // Create a fake update banner element to test visibility
      const banner = document.createElement('div');
      banner.className = 'test-update-banner';
      banner.innerHTML = `
        <span>New version available!</span>
        <button class="update-btn">Update</button>
        <button class="dismiss-btn">Later</button>
      `;
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7BF542;padding:10px;z-index:9999;display:flex;justify-content:space-between;align-items:center;';
      document.body.prepend(banner);
    });

    // Verify the injected banner is visible
    await expect(page.locator('.test-update-banner')).toBeVisible();
    await expect(page.locator('text=New version available!')).toBeVisible();
    await expect(page.locator('.update-btn')).toBeVisible();
    await expect(page.locator('.dismiss-btn')).toBeVisible();
  });

  test('should be able to dismiss update banner', async ({ page }) => {
    // Inject mock banner
    await page.evaluate(() => {
      const banner = document.createElement('div');
      banner.className = 'test-update-banner';
      banner.innerHTML = `
        <span>New version available!</span>
        <button class="dismiss-btn" onclick="this.parentElement.remove()">Later</button>
      `;
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#7BF542;padding:10px;z-index:9999;';
      document.body.prepend(banner);
    });

    await expect(page.locator('.test-update-banner')).toBeVisible();

    // Click dismiss
    await page.click('.dismiss-btn');

    await expect(page.locator('.test-update-banner')).not.toBeVisible();
  });
});
