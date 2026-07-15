import { test, expect } from '@playwright/test';

/**
 * T2.7 — E2E: Template List
 * Verifies that the ProductTemplate list loads on the homepage.
 */
test.describe('Template List (HomePage)', () => {
  test('displays Product Templates heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Product Templates/i })).toBeVisible();
  });

  test('shows New ProductTemplate button', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByRole('button', { name: /New ProductTemplate/i });
    await expect(btn).toBeVisible();
  });
});
