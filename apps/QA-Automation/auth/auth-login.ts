import { expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const schoolName = process.env.SCHOOL_NAME;
const loginUsername = process.env.LOGIN_USERNAME;
const loginPassword = process.env.LOGIN_PASSWORD;

const LOGIN_PATH = /\/login/i;
const TENANTS_LIST_URL = /\/tenants\/tenants\/?(?:\?|$)/;
const LOGIN_CONTEXT_URL = /\/auth\/login\/context/;

function isDashboardUrl(url: string) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '') || '/';
    return pathname === '/';
  } catch {
    return false;
  }
}

function emailField(page: Page) {
  // Required MUI fields expose accessible name as "Email Address*"
  return page.getByRole('textbox', { name: /Email Address/i });
}

function passwordField(page: Page) {
  // Required MUI fields expose accessible name as "Password*"
  return page.getByRole('textbox', { name: /^Password/i });
}

function signInButton(page: Page) {
  return page.getByRole('button', { name: 'Sign In' });
}

function schoolDialog(page: Page) {
  return page.getByRole('dialog', { name: /Select or Switch School/i });
}

/** Opens the login page (no school selection). */
export async function openLoginPage(page: Page) {
  await page.goto('/login');
  await verifyLoginPage(page);
}

/**
 * Optional school picker — kept for school-specific scenarios.
 * Default login flow does not use this (system admin logs in without a school).
 */
export async function selectSchool(page: Page, reloadAfterSelect = false) {
  await openLoginPage(page);

  const changeSchool = page.getByRole('button', { name: 'Change School for Login' });

  await Promise.race([
    changeSchool.waitFor({ state: 'visible', timeout: 20000 }),
    page.waitForURL(/[?&]tenant=\d+/, { timeout: 20000 }),
  ]).catch(() => undefined);

  const canChangeSchool = await changeSchool.isVisible().catch(() => false);

  if (canChangeSchool) {
    const schoolsResponse = page.waitForResponse(
      (response) =>
        TENANTS_LIST_URL.test(response.url()) && response.status() === 200
    );

    await changeSchool.click();
    const dialog = schoolDialog(page);
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await schoolsResponse;

    await selectSchoolFromDialog(page, schoolName!);
    await expect(page).toHaveURL(/[?&]tenant=\d+/);
  } else {
    await expect
      .poll(() => /[?&]tenant=\d+/.test(page.url()), { timeout: 60000 })
      .toBe(true);
  }

  await expect(emailField(page)).toBeVisible();

  if (reloadAfterSelect) {
    await page.reload();
    await expect(schoolDialog(page)).toBeHidden();
    await expect(emailField(page)).toBeVisible({ timeout: 60000 });
    await expect(page).toHaveURL(/[?&]tenant=\d+/);
  }
}

export async function fillLoginCredentials(page: Page) {
  const email = emailField(page);
  const password = passwordField(page);

  await email.click();
  await email.fill(loginUsername!);
  await password.click();
  await password.fill(loginPassword!);

  await expect(email).toHaveValue(loginUsername!);
  await expect(password).toHaveValue(loginPassword!);
}

export async function verifyDashboard(page: Page) {
  await expect(page).not.toHaveURL(LOGIN_PATH, { timeout: 30000 });
  await expect
    .poll(() => isDashboardUrl(page.url()), { timeout: 30000 })
    .toBe(true);
  await expect(emailField(page)).toBeHidden();

  // Fail fast if the app error boundary replaces the dashboard.
  await expect(page.getByRole('heading', { name: /Something went wrong/i })).toHaveCount(0);

  await expect(
    page.getByText(/Good (morning|afternoon|evening)/i).first()
  ).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.MuiAvatar-root').first()).toBeVisible({ timeout: 30000 });
}

/** Waits for optional post-login dialogs to close if they appear. */
export async function dismissMissingAttendancePopup(page: Page) {
  const dialog = page.getByRole('dialog').filter({
    hasText: /Missing Attendance Alert\(s\)/i,
  });

  try {
    await dialog.waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    return;
  }

  await expect(dialog).toBeHidden({ timeout: 15000 });
}

/** Direct email/password login — no school selection. */
export async function loginToDashboard(page: Page) {
  await openLoginPage(page);
  await fillLoginCredentials(page);

  const loginRequest = page.waitForRequest(
    (request) =>
      request.method() === 'POST' && LOGIN_CONTEXT_URL.test(request.url())
  );
  const loginResponse = page.waitForResponse(
    (response) =>
      LOGIN_CONTEXT_URL.test(response.url()) && response.request().method() === 'POST'
  );
  const dashboardResponse = page.waitForResponse(
    (res) =>
      /\/api\/dashboard\/me/.test(res.url()) && res.request().method() === 'GET',
    { timeout: 45000 }
  );

  await expect(signInButton(page)).toBeEnabled();
  await signInButton(page).click();

  const request = await loginRequest;
  const response = await loginResponse;
  const requestBody = request.postDataJSON();
  const responseBody = await response.json();

  expect(requestBody?.email).toBe(loginUsername);
  expect(requestBody?.password).toBe(loginPassword);
  // Direct login: no school selected, so tenant_id must not be sent.
  expect(requestBody?.tenant_id).toBeUndefined();

  if (response.status() !== 200 || !responseBody?.access_token) {
    throw new Error(
      `Login failed for "${loginUsername}". Status ${response.status()}. API response: ${JSON.stringify(responseBody)}`
    );
  }

  await expect(page.getByText('Invalid credentials.')).not.toBeVisible();
  await expect(page).not.toHaveURL(LOGIN_PATH, { timeout: 30000 });

  await dashboardResponse.catch(() => undefined);

  await verifyDashboard(page);
  await dismissMissingAttendancePopup(page);
}

export async function verifyLoginPage(page: Page) {
  await expect(page).toHaveURL(LOGIN_PATH, { timeout: 60000 });
  await expect(page.getByText('Sign in to your account')).toBeVisible();
  await expect(emailField(page)).toBeVisible({ timeout: 60000 });
  await expect(passwordField(page)).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
  await expect(page.getByText('Forgot password?')).toBeVisible();
}

export async function logoutFromDashboard(page: Page) {
  await expect(page.getByRole('heading', { name: /Something went wrong/i })).toHaveCount(0);

  const avatar = page.locator('.MuiAvatar-root').first();
  await expect(avatar).toBeVisible({ timeout: 30000 });
  await avatar.click();
  await page.getByRole('menuitem', { name: /Logout Session/i }).click();

  await expect(page).toHaveURL(LOGIN_PATH, { timeout: 30000 });
  await expect(
    page.getByText(/You have been logged out successfully/i)
  ).toBeVisible({ timeout: 15000 });
}

export async function returnToLoginPage(page: Page) {
  await page.goto('/login');
  await verifyLoginPage(page);
}

export async function selectSchoolFromDialog(page: Page, school: string) {
  const dialog = schoolDialog(page);
  await expect(dialog).toBeVisible();

  const schoolField = dialog.getByLabel('Select School');
  await schoolField.click();

  const option = page.getByRole('option', { name: school, exact: true });
  await expect(option).toBeVisible({ timeout: 30000 });
  await option.click();

  await expect(dialog).toBeHidden({ timeout: 15000 });
}

export async function openChangeSchoolDialog(page: Page) {
  await page.getByRole('button', { name: 'Change School for Login' }).click();
  await expect(schoolDialog(page)).toBeVisible();
}

export async function verifyNavigationMenu(page: Page) {
  await expect(page.getByRole('heading', { name: /Something went wrong/i })).toHaveCount(0);

  const sidebarItems = page.locator('.MuiDrawer-root .MuiListItemButton-root');
  await expect(sidebarItems.first()).toBeVisible({ timeout: 30000 });
  expect(await sidebarItems.count()).toBeGreaterThan(0);

  await sidebarItems.first().click();
  await expect(page).not.toHaveURL(LOGIN_PATH, { timeout: 30000 });
  await expect(page.locator('.MuiAvatar-root').first()).toBeVisible();
}

export async function verifyProtectedRouteBlocked(page: Page) {
  await page.goto('/');
  await expect(page).toHaveURL(LOGIN_PATH, { timeout: 30000 });
  await expect(emailField(page)).toBeVisible();
}
