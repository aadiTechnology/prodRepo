import { test, expect } from '@playwright/test';

test('sample test - playwright homepage has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
