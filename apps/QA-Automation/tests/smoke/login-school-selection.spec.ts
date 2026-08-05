import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import {
  loginToDashboard,
  logoutFromDashboard,
  openLoginPage,
  returnToLoginPage,
  verifyLoginPage,
  verifyNavigationMenu,
  verifyProtectedRouteBlocked,
} from '../../auth/auth-login';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const loginUsername = process.env.LOGIN_USERNAME;
const loginPassword = process.env.LOGIN_PASSWORD;

test.describe('Application login flow', () => {
  test.beforeEach(() => {
    test.skip(
      !loginUsername || !loginPassword,
      'Set LOGIN_USERNAME and LOGIN_PASSWORD in QA-Automation/.env (see .env.example).'
    );
  });

  test('opens login page without school selection', async ({ page }) => {
    await openLoginPage(page);

    await expect(page.getByRole('textbox', { name: /Email Address/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Password/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]tenant=\d+/);
  });

  test('keeps Sign In disabled until email and password are filled', async ({ page }) => {
    await openLoginPage(page);

    const signIn = page.getByRole('button', { name: 'Sign In' });
    await expect(signIn).toBeDisabled();

    await page.getByRole('textbox', { name: /Email Address/i }).fill('user@example.com');
    await expect(signIn).toBeDisabled();

    await page.getByRole('textbox', { name: /^Password/i }).fill('Secret123');
    await expect(signIn).toBeEnabled();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await openLoginPage(page);

    await page.getByRole('textbox', { name: /Email Address/i }).fill('not-an-email');
    await page.getByRole('textbox', { name: /^Password/i }).fill('SomePassword1');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid Email Address.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/i);
  });

  test('shows invalid credentials error for wrong password', async ({ page }) => {
    test.setTimeout(90000);

    await openLoginPage(page);
    await page.getByRole('textbox', { name: /Email Address/i }).fill(loginUsername!);
    await page.getByRole('textbox', { name: /^Password/i }).fill('WrongPassword!999');

    const loginResponse = page.waitForResponse(
      (response) =>
        /\/auth\/login\/context/.test(response.url()) &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Sign In' }).click();
    const response = await loginResponse;
    expect(response.status()).toBeGreaterThanOrEqual(400);

    await expect(page.getByText(/Invalid credentials\.|do not have permission/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/login/i);
  });

  test('logs in with email and password and reaches dashboard', async ({ page }) => {
    test.setTimeout(90000);
    await loginToDashboard(page);
  });

  test('logs out from dashboard and shows logout confirmation', async ({ page }) => {
    test.setTimeout(90000);
    await loginToDashboard(page);
    await logoutFromDashboard(page);
  });

  test('returns to login page after logout', async ({ page }) => {
    test.setTimeout(90000);
    await loginToDashboard(page);
    await logoutFromDashboard(page);
    await verifyProtectedRouteBlocked(page);
    await returnToLoginPage(page);
    await verifyLoginPage(page);
  });

  test('shows navigation menu on dashboard after login', async ({ page }) => {
    test.setTimeout(90000);
    await loginToDashboard(page);
    await verifyNavigationMenu(page);
  });
});
