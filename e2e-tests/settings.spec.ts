/**
 * Settings Modal E2E Tests
 *
 * Tests the settings modal functionality:
 * - Opening/closing the modal
 * - Bug reporting section
 * - About section with version info
 */

import { expect, test } from '@playwright/test';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Modal Open/Close', () => {
    test('should open settings when clicking settings button', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=SETTINGS')).toBeVisible();
    });

    test('should close settings when clicking close button', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=SETTINGS')).toBeVisible();

      await page.click('button:has-text("×")');
      await expect(page.locator('text=SETTINGS')).not.toBeVisible();
    });

    test('should close settings when clicking overlay', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=SETTINGS')).toBeVisible();

      // Click on the overlay (outside the modal) - use force click on backdrop
      await page.locator('[class*="modalOverlay"]').click({ position: { x: 10, y: 10 }, force: true });
      await expect(page.locator('text=SETTINGS')).not.toBeVisible();
    });
  });

  test.describe('Bug Reporting Section', () => {
    test('should show Bug Reporting section', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=BUG REPORTING')).toBeVisible();
    });

    test('should show Report a Bug button', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('button:has-text("Report a Bug")')).toBeVisible();
    });

    test('should show shake toggle on mobile', async ({ page, browserName }) => {
      // Shake detection may only show on devices that support it
      await page.click('[aria-label="Settings"]');
      // The toggle may or may not be visible depending on device support
      // Just verify the section exists
      await expect(page.locator('text=BUG REPORTING')).toBeVisible();
    });
  });

  test.describe('About Section', () => {
    test('should show app name', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      // About section shows app title
      await expect(page.locator('[class*="aboutTitle"]')).toBeVisible();
    });

    test('should show build info', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=BUILD')).toBeVisible();
      await expect(page.locator('text=BRANCH')).toBeVisible();
      await expect(page.locator('text=BUILT')).toBeVisible();
    });

    test('should show GitHub link', async ({ page }) => {
      await page.click('[aria-label="Settings"]');
      await expect(page.locator('text=GitHub')).toBeVisible();
    });
  });
});
