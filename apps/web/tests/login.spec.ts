import { test, expect } from '@playwright/test';

test('placeholder test', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/./);
});