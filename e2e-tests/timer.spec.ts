/**
 * Timer E2E Tests
 *
 * Tests the main timer functionality:
 * - Timer display and presets
 * - Start/stop controls
 * - Mode navigation (Rounds, Stopwatch, Sets)
 */

import { expect, test } from '@playwright/test';

test.describe('Timer Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show timer with time display', async ({ page }) => {
    // Timer should show 00:30 by default (30 SEC preset)
    await expect(page.locator('text=00:30')).toBeVisible();
  });

  test('should not show WORK label when idle', async ({ page }) => {
    // WORK label should not be visible in idle state
    const workLabel = page.locator('text=WORK');
    await expect(workLabel).not.toBeVisible();
  });

  test('should show REST preview', async ({ page }) => {
    await expect(page.locator('text=REST')).toBeVisible();
    await expect(page.locator('text=00:05')).toBeVisible();
  });

  test('should show START button', async ({ page }) => {
    await expect(page.locator('text=START')).toBeVisible();
  });

  test('should show round counter', async ({ page }) => {
    // Check for round-related UI elements (the stat labels)
    await expect(page.locator('[class*="statLabel"]').first()).toBeVisible();
  });
});

test.describe('Presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show preset buttons', async ({ page }) => {
    await expect(page.locator('text=30 SEC').first()).toBeVisible();
    await expect(page.locator('text=1 MIN')).toBeVisible();
    await expect(page.locator('text=5-1')).toBeVisible();
  });

  test('should change timer when clicking 1 MIN preset', async ({ page }) => {
    await page.click('text=1 MIN');
    await expect(page.locator('text=01:00')).toBeVisible();
  });

  test('should change timer when clicking 5-1 preset', async ({ page }) => {
    await page.click('text=5-1');
    await expect(page.locator('text=05:00')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show navigation tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: /rounds/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /stopwatch/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sets/i })).toBeVisible();
  });

  test('should switch to Stopwatch mode', async ({ page }) => {
    await page.click('text=STOPWATCH');
    // Stopwatch shows 00:00.0 format
    await expect(page.locator('text=00:00')).toBeVisible();
  });

  test('should switch to Sets mode', async ({ page }) => {
    await page.getByRole('button', { name: /sets/i }).click();
    // Sets mode shows tally marks area (the sets tab becomes active)
    await expect(page.getByRole('button', { name: /sets/i })).toHaveClass(/active/i);
  });
});
