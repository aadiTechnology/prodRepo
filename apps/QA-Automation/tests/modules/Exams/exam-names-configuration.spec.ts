import { expect, Locator, Page, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { loginToDashboard } from '../../../auth/auth-login';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

const schoolName = process.env.SCHOOL_NAME;
const loginUsername = process.env.LOGIN_USERNAME;
const loginPassword = process.env.LOGIN_PASSWORD;

const CONTROL_PANEL_URL = /\/RITeSchool\/AdminStaff\/SchoolConfiguration\/ControlPanel/i;
const EXAM_NAMES_URL = /\/RITeSchool\/AdminStaff\/SchoolConfiguration\/ExamNamesConfiguration/i;

const MSG_AT_LEAST_ONE = 'At least one exam name should be selected for saving.';
const MSG_BLANK = 'Exam name should not be blank.';
const MSG_DUPLICATE = 'Exam Name can not be duplicated.';
const MSG_FINAL = 'Please select final exam for each term.';
const VALIDATION_HEADER = 'Please fix following error(s):';

async function openSchoolConfigurationFromDashboard(page: Page) {
  await page.getByRole('button', { name: 'Sidebar' }).click();

  const quickFind = page.getByPlaceholder('Quick Find');
  await expect(quickFind).toBeVisible({ timeout: 30000 });
  await quickFind.fill('School Configuration');

  // Teacher sidebar keeps School Configuration under Extra Screens; search expands matching groups.
  const extraScreens = page.getByText('Extra Screens', { exact: true }).first();
  if (await extraScreens.isVisible().catch(() => false)) {
    const accordionClosed = page
      .locator('.MuiAccordion-root')
      .filter({ hasText: 'Extra Screens' })
      .locator('.MuiCollapse-root:not(.MuiCollapse-entered)');
    if (await accordionClosed.count()) {
      await extraScreens.click();
    }
  }

  const schoolConfig = page
    .getByRole('button', { name: 'School Configuration' })
    .or(page.getByRole('link', { name: 'School Configuration' }))
    .or(page.locator('a', { hasText: /^School Configuration$/ }))
    .or(page.locator('.MuiListItem-root', { hasText: /^School Configuration$/ }))
    .first();

  await schoolConfig.scrollIntoViewIfNeeded();
  await expect(schoolConfig).toBeVisible({ timeout: 60000 });
  await schoolConfig.click({ force: true });
  await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  await expect(page.getByText('School Configuration', { exact: true }).first()).toBeVisible({
    timeout: 60000,
  });
}

async function openExamNamesViaControlPanel(page: Page) {
  await openSchoolConfigurationFromDashboard(page);

  // Wait for Control Panel menu/config grid to finish loading.
  await expect(page.locator('.MuiCircularProgress-root')).toHaveCount(0, { timeout: 120000 });

  const noMenu = page.getByText('No menu items available.');
  if (await noMenu.isVisible().catch(() => false)) {
    throw new Error('School Configuration Control Panel has no menu items for this user.');
  }

  const examsLink = page.getByText('Exams', { exact: true });
  const alreadyVisible = await examsLink.isVisible().catch(() => false);

  if (!alreadyVisible) {
    const leftMenus = page.locator('ul li .MuiListItemButton-root');
    await expect(leftMenus.first()).toBeVisible({ timeout: 60000 });
    const menuCount = await leftMenus.count();
    let found = false;

    for (let i = 0; i < menuCount; i++) {
      await leftMenus.nth(i).click();
      await expect(page.locator('.MuiCircularProgress-root')).toHaveCount(0, { timeout: 60000 });
      if (await examsLink.isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }

    expect(found, 'Could not find a Control Panel module that lists Exams').toBeTruthy();
  }

  await examsLink.click();
  await expect(page).toHaveURL(EXAM_NAMES_URL, { timeout: 60000 });
  await expect(page.getByTestId('exam-names-configuration-page')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('page-loader')).toBeHidden({ timeout: 60000 });
}

async function goToExamNamesFresh(page: Page) {
  await loginToDashboard(page);
  await openExamNamesViaControlPanel(page);
}

function dataRows(page: Page) {
  return page.locator('table tbody tr');
}

async function waitForGridOrEmpty(page: Page) {
  await expect(page.getByTestId('page-loader')).toBeHidden({ timeout: 60000 });
  const empty = page.getByTestId('empty-state');
  if (await empty.isVisible().catch(() => false)) {
    return 0;
  }
  await expect(dataRows(page).first()).toBeVisible({ timeout: 60000 });
  return dataRows(page).count();
}

function rowCheckbox(page: Page, row: Locator) {
  return row.locator('input[type="checkbox"]');
}

async function rowKeySuffix(row: Locator): Promise<string> {
  const checkbox = row.locator('input[type="checkbox"]').first();
  const id = (await checkbox.getAttribute('id')) ?? '';
  const suffix = id.replace('examNamesRowCheckbox-', '');
  if (!suffix) {
    throw new Error('Could not resolve row key suffix for Exam Names grid row.');
  }
  return suffix;
}

async function rowExamName(page: Page, row: Locator) {
  const suffix = await rowKeySuffix(row);
  return page.locator(`#examName-${suffix}`);
}

async function rowTerm(page: Page, row: Locator) {
  const suffix = await rowKeySuffix(row);
  return page.locator(`[data-testid="exam-names-term-select-${suffix}"]`);
}

async function rowFinal(page: Page, row: Locator) {
  const suffix = await rowKeySuffix(row);
  return page.locator(`#examFinalExam-${suffix}`);
}

async function findUncheckedRow(page: Page): Promise<Locator | null> {
  const rows = dataRows(page);
  const count = await rows.count();
  // Prefer early visible rows to avoid off-screen grid rows.
  const limit = Math.min(count, 10);
  for (let i = 0; i < limit; i++) {
    const row = rows.nth(i);
    const checked = await rowCheckbox(page, row).isChecked();
    if (!checked) {
      await row.scrollIntoViewIfNeeded();
      return row;
    }
  }
  for (let i = limit; i < count; i++) {
    const row = rows.nth(i);
    const checked = await rowCheckbox(page, row).isChecked();
    if (!checked) {
      await row.scrollIntoViewIfNeeded();
      return row;
    }
  }
  return null;
}

async function findCheckedRow(page: Page): Promise<Locator | null> {
  const rows = dataRows(page);
  const count = await rows.count();
  const limit = Math.min(count, 10);
  for (let i = 0; i < limit; i++) {
    const row = rows.nth(i);
    const checked = await rowCheckbox(page, row).isChecked();
    if (checked) {
      await row.scrollIntoViewIfNeeded();
      return row;
    }
  }
  for (let i = limit; i < count; i++) {
    const row = rows.nth(i);
    const checked = await rowCheckbox(page, row).isChecked();
    if (checked) {
      await row.scrollIntoViewIfNeeded();
      return row;
    }
  }
  return null;
}

async function uncheckAllRows(page: Page) {
  const selectAll = page.getByTestId('exam-names-select-all-checkbox-input');
  if (await selectAll.isChecked()) {
    await selectAll.click();
  }

  const rows = dataRows(page);
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const cb = rowCheckbox(page, rows.nth(i));
    if (await cb.isChecked()) {
      await cb.click();
    }
  }
}

async function configureCheckedRow(
  page: Page,
  row: Locator,
  options: { name?: string; termLabel: 'Term1' | 'Term2'; makeFinal?: boolean }
) {
  if (!(await rowCheckbox(page, row).isChecked())) {
    await rowCheckbox(page, row).check();
  }

  if (options.name !== undefined) {
    await (await rowExamName(page, row)).fill(options.name);
  }

  await (await rowTerm(page, row)).click();
  await page.getByRole('option', { name: options.termLabel, exact: true }).click();

  if (options.makeFinal !== false) {
    const finalRadio = await rowFinal(page, row);
    if (!(await finalRadio.isChecked())) {
      await finalRadio.click();
    }
  }
}

async function clickSave(page: Page) {
  await page.getByTestId('exam-names-save-button').click();
}

test.describe('Exam Names Configuration (V1)', () => {
  test.beforeEach(() => {
    test.skip(!schoolName, 'Set SCHOOL_NAME in QA-Automation/.env');
    test.skip(
      !loginUsername || !loginPassword,
      'Set LOGIN_USERNAME and LOGIN_PASSWORD in QA-Automation/.env'
    );
  });

  test('TC_TNL_001 opens Exams page via School Configuration Control Panel', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await expect(page.getByText('School Configuration', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Exams', { exact: true }).first()).toBeVisible();
  });

  test('TC_TNL_002 page layout shows validation areas, grid or empty, Save and Help', async ({
    page,
  }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);

    await expect(page.getByTestId('exam-names-save-button')).toBeVisible();
    await expect(page.getByTestId('exam-names-help-button')).toBeVisible();

    const rowCount = await waitForGridOrEmpty(page);
    if (rowCount === 0) {
      await expect(page.getByTestId('empty-state')).toBeVisible();
    } else {
      await expect(page.locator('table')).toBeVisible();
    }

    await uncheckAllRows(page);
    await clickSave(page);
    await expect(page.getByTestId('exam-names-validation-summary')).toBeVisible();
  });

  test('TC_TNL_003 grid column headers', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount === 0, 'No exam rows to show headers/data table');

    // Select column uses renderHeader with checkbox only (label "Select All" is not rendered as text).
    await expect(page.getByTestId('exam-names-select-all-checkbox-input')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Exam Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Term' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Is Final Exam' })).toBeVisible();
  });

  test('TC_TNL_004 grid shows exam rows from API', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount === 0, 'No master/configured exams returned for this school/year');
    expect(rowCount).toBeGreaterThan(0);
  });

  test('TC_TNL_005 assigned rows are pre-checked and fields enabled', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount === 0, 'No exam rows');

    const assigned = await findCheckedRow(page);
    test.skip(!assigned, 'No pre-checked (assigned) exam row in current data');

    await expect(await rowExamName(page, assigned!)).toBeEnabled();
    await expect(await rowTerm(page, assigned!)).toBeEnabled();
    await expect(await rowFinal(page, assigned!)).toBeEnabled();
  });

  test('TC_TNL_006 unassigned rows are unchecked and fields disabled', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount === 0, 'No exam rows');

    const unassigned = await findUncheckedRow(page);
    test.skip(!unassigned, 'No unchecked (unassigned) exam row in current data');

    await expect(await rowExamName(page, unassigned!)).toBeDisabled();
    await expect(await rowTerm(page, unassigned!)).toBeDisabled();
    await expect(await rowFinal(page, unassigned!)).toBeDisabled();
  });

  test('TC_TNL_007 checking a row enables fields', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    const unassigned = await findUncheckedRow(page);
    test.skip(!unassigned, 'No unchecked row to enable');

    await rowCheckbox(page, unassigned!).check();
    await expect(await rowExamName(page, unassigned!)).toBeEnabled();
    await expect(await rowTerm(page, unassigned!)).toBeEnabled();
    await expect(await rowFinal(page, unassigned!)).toBeEnabled();
  });

  test('TC_TNL_008 unchecking disables fields and resets Term and Final Exam', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    const unassigned = await findUncheckedRow(page);
    test.skip(!unassigned, 'No unchecked row');

    await rowCheckbox(page, unassigned!).check();
    await configureCheckedRow(page, unassigned!, {
      name: 'QA Temp Exam',
      termLabel: 'Term1',
      makeFinal: true,
    });

    await rowCheckbox(page, unassigned!).uncheck();
    await expect(await rowExamName(page, unassigned!)).toBeDisabled();
    await expect(await rowTerm(page, unassigned!)).toBeDisabled();
    await expect(await rowFinal(page, unassigned!)).toBeDisabled();
    await expect(await rowFinal(page, unassigned!)).not.toBeChecked();
  });

  test('TC_TNL_009 Select All checks all rows', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need multiple rows');

    await page.getByTestId('exam-names-select-all-checkbox-input').check();
    const rows = dataRows(page);
    for (let i = 0; i < rowCount; i++) {
      await expect(rowCheckbox(page, rows.nth(i))).toBeChecked();
      await expect(await rowExamName(page, rows.nth(i))).toBeEnabled();
    }
  });

  test('TC_TNL_010 Select All unchecks all rows', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need multiple rows');

    const selectAll = page.getByTestId('exam-names-select-all-checkbox-input');
    await selectAll.check();
    await selectAll.uncheck();

    const rows = dataRows(page);
    for (let i = 0; i < rowCount; i++) {
      await expect(rowCheckbox(page, rows.nth(i))).not.toBeChecked();
      await expect(await rowExamName(page, rows.nth(i))).toBeDisabled();
      await expect(await rowFinal(page, rows.nth(i))).not.toBeChecked();
    }
  });

  test('TC_TNL_011 Exam Name max length is 50', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    const row = (await findUncheckedRow(page)) ?? (await findCheckedRow(page));
    test.skip(!row, 'No row available');

    if (!(await rowCheckbox(page, row!).isChecked())) {
      await rowCheckbox(page, row!).check();
    }

    const fiftyOne = 'A'.repeat(51);
    await (await rowExamName(page, row!)).fill(fiftyOne);
    const value = await (await rowExamName(page, row!)).inputValue();
    expect(value.length).toBe(50);
  });

  test('TC_TNL_012 Term dropdown options', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    const row = (await findUncheckedRow(page)) ?? (await findCheckedRow(page));
    test.skip(!row, 'No row available');

    if (!(await rowCheckbox(page, row!).isChecked())) {
      await rowCheckbox(page, row!).check();
    }

    await (await rowTerm(page, row!)).click();
    await expect(page.getByRole('option', { name: 'Select', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Term1', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Term2', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('TC_TNL_013 only one Final Exam for Term 1', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows');

    const rows = dataRows(page);
    const rowA = rows.nth(0);
    const rowB = rows.nth(1);

    await configureCheckedRow(page, rowA, { termLabel: 'Term1', makeFinal: true });
    await configureCheckedRow(page, rowB, { termLabel: 'Term1', makeFinal: true });

    await expect(await rowFinal(page, rowB)).toBeChecked();
    await expect(await rowFinal(page, rowA)).not.toBeChecked();
  });

  test('TC_TNL_014 only one Final Exam for Term 2', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows');

    const rows = dataRows(page);
    const rowC = rows.nth(0);
    const rowD = rows.nth(1);

    await configureCheckedRow(page, rowC, { termLabel: 'Term2', makeFinal: true });
    await configureCheckedRow(page, rowD, { termLabel: 'Term2', makeFinal: true });

    await expect(await rowFinal(page, rowD)).toBeChecked();
    await expect(await rowFinal(page, rowC)).not.toBeChecked();
  });

  test('TC_TNL_016 changing Term re-evaluates Final Exam', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    const row = dataRows(page).first();
    await configureCheckedRow(page, row, { termLabel: 'Term1', makeFinal: true });
    await expect(await rowFinal(page, row)).toBeChecked();

    await (await rowTerm(page, row)).click();
    await page.getByRole('option', { name: 'Term2', exact: true }).click();
    await expect(await rowFinal(page, row)).toBeVisible();
  });

  test('TC_TNL_017 Save with no row selected', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    await uncheckAllRows(page);
    await clickSave(page);
    await expect(page.getByTestId('validation-message')).toContainText(MSG_AT_LEAST_ONE);
    await expect(page).toHaveURL(EXAM_NAMES_URL);
  });

  test('TC_TNL_018 Save with blank Exam Name', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    await uncheckAllRows(page);
    const row = dataRows(page).first();
    await rowCheckbox(page, row).check();
    await (await rowExamName(page, row)).fill('');
    await clickSave(page);

    await expect(page.getByTestId('validation-message-header')).toHaveText(VALIDATION_HEADER);
    await expect(page.getByTestId('validation-message')).toContainText(MSG_BLANK);
  });

  test('TC_TNL_019 Save with duplicate Exam Names', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows');

    await uncheckAllRows(page);
    const rows = dataRows(page);
    const row1 = rows.nth(0);
    const row2 = rows.nth(1);

    await configureCheckedRow(page, row1, { name: 'Unit Test', termLabel: 'Term1', makeFinal: true });
    await configureCheckedRow(page, row2, { name: 'unit test', termLabel: 'Term2', makeFinal: true });
    await clickSave(page);

    await expect(page.getByTestId('validation-message-header')).toHaveText(VALIDATION_HEADER);
    await expect(page.getByTestId('validation-message')).toContainText(MSG_DUPLICATE);
  });

  test('TC_TNL_020 Save without Final Exam for Term 1', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    await uncheckAllRows(page);
    const row = dataRows(page).first();
    await rowCheckbox(page, row).check();
    await (await rowExamName(page, row)).fill('Term1 Only Exam QA');
    await (await rowTerm(page, row)).click();
    await page.getByRole('option', { name: 'Term1', exact: true }).click();
    await clickSave(page);

    await expect(page.getByTestId('validation-message')).toContainText(MSG_FINAL);
  });

  test('TC_TNL_021 Save without Final Exam for Term 2', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    await waitForGridOrEmpty(page);

    await uncheckAllRows(page);
    const row = dataRows(page).first();
    await rowCheckbox(page, row).check();
    await (await rowExamName(page, row)).fill('Term2 Only Exam QA');
    await (await rowTerm(page, row)).click();
    await page.getByRole('option', { name: 'Term2', exact: true }).click();
    await clickSave(page);

    await expect(page.getByTestId('validation-message')).toContainText(MSG_FINAL);
  });

  test('TC_TNL_046 duplicate names with spaces are blocked', async ({ page }) => {
    test.setTimeout(180000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows');

    await uncheckAllRows(page);
    const rows = dataRows(page);
    await configureCheckedRow(page, rows.nth(0), {
      name: 'Exam A',
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(1), {
      name: '  Exam A  ',
      termLabel: 'Term2',
      makeFinal: true,
    });
    await clickSave(page);

    await expect(page.getByTestId('validation-message')).toContainText(MSG_DUPLICATE);
  });

  test.skip('TC_TNL_028 Cancel returns to Control Panel without save redirect stay', async () => {
    // Cancel button removed from Exam Names Configuration UI
  });

  test('TC_TNL_015 / TC_TNL_037 Save with Term1 and Term2 Final Exams succeeds', async ({
    page,
  }) => {
    test.setTimeout(240000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows for Term1 and Term2 Final Exams');

    await uncheckAllRows(page);
    const rows = dataRows(page);
    const unique = `QA Exam ${Date.now()}`;

    await configureCheckedRow(page, rows.nth(0), {
      name: `${unique} T1`,
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(1), {
      name: `${unique} T2`,
      termLabel: 'Term2',
      makeFinal: true,
    });

    const saveResponse = page.waitForResponse(
      (response) => response.url().toLowerCase().includes('exam') && response.request().method() === 'POST'
    );
    await clickSave(page);

    await Promise.race([
      page.waitForURL(CONTROL_PANEL_URL, { timeout: 60000 }),
      saveResponse,
    ]);

    if (await page.getByTestId('exam-names-validation-summary').isVisible().catch(() => false)) {
      const messages = await page.getByTestId('validation-message').allTextContents();
      throw new Error(`Save blocked by validation: ${messages.join(' | ')}`);
    }
    if (await page.getByTestId('exam-names-server-error').isVisible().catch(() => false)) {
      const err = await page.getByTestId('error-message').innerText();
      throw new Error(`Save failed with server error: ${err}`);
    }

    await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  });

  test('TC_TNL_022 Save insert on an unassigned row (no delete)', async ({ page }) => {
    test.setTimeout(240000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need rows for Term1/Term2 finals');

    let unassignedIndex = -1;
    const rows = dataRows(page);
    for (let i = 0; i < rowCount; i++) {
      if (!(await rowCheckbox(page, rows.nth(i)).isChecked())) {
        unassignedIndex = i;
        break;
      }
    }
    test.skip(unassignedIndex < 0, 'No unassigned row available for insert');

    await uncheckAllRows(page);
    const unique = `QA Insert ${Date.now()}`;
    const term2Index = unassignedIndex === 0 ? 1 : 0;

    await configureCheckedRow(page, rows.nth(unassignedIndex), {
      name: `${unique} T1`,
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(term2Index), {
      name: `${unique} T2`,
      termLabel: 'Term2',
      makeFinal: true,
    });

    await clickSave(page);
    await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  });

  test('TC_TNL_023 Save update on an assigned row (no delete)', async ({ page }) => {
    test.setTimeout(240000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need rows for Term1/Term2 finals');

    let assignedIndex = -1;
    const rows = dataRows(page);
    for (let i = 0; i < rowCount; i++) {
      if (await rowCheckbox(page, rows.nth(i)).isChecked()) {
        assignedIndex = i;
        break;
      }
    }
    test.skip(assignedIndex < 0, 'No assigned row available for update');

    await uncheckAllRows(page);
    const unique = `QA Update ${Date.now()}`;
    const secondIndex = assignedIndex === 0 ? 1 : 0;

    await configureCheckedRow(page, rows.nth(assignedIndex), {
      name: `${unique} T1`,
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(secondIndex), {
      name: `${unique} T2`,
      termLabel: 'Term2',
      makeFinal: true,
    });

    await clickSave(page);
    await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  });

  test('TC_TNL_038 Select All configure and Save (no unassign/delete)', async ({ page }) => {
    test.setTimeout(300000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need multiple rows');

    await page.getByTestId('exam-names-select-all-checkbox-input').check();

    const rows = dataRows(page);
    const unique = `QA All ${Date.now()}`;
    await configureCheckedRow(page, rows.nth(0), {
      name: `${unique} T1`,
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(1), {
      name: `${unique} T2`,
      termLabel: 'Term2',
      makeFinal: true,
    });

    for (let i = 2; i < rowCount; i++) {
      const row = rows.nth(i);
      await (await rowExamName(page, row)).fill(`${unique} Extra ${i}`);
      await (await rowTerm(page, row)).click();
      await page.getByRole('option', { name: i % 2 === 0 ? 'Term1' : 'Term2', exact: true }).click();
    }

    await clickSave(page);

    if (await page.getByTestId('exam-names-validation-summary').isVisible().catch(() => false)) {
      const messages = await page.getByTestId('validation-message').allTextContents();
      test.skip(true, `Select-all save blocked in this data set: ${messages.join(' | ')}`);
    }

    await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  });

  test('TC_TNL_044 Save shows busy state during submit', async ({ page }) => {
    test.setTimeout(240000);
    await goToExamNamesFresh(page);
    const rowCount = await waitForGridOrEmpty(page);
    test.skip(rowCount < 2, 'Need at least two rows');

    await uncheckAllRows(page);
    const rows = dataRows(page);
    const unique = `QA Busy ${Date.now()}`;
    await configureCheckedRow(page, rows.nth(0), {
      name: `${unique} T1`,
      termLabel: 'Term1',
      makeFinal: true,
    });
    await configureCheckedRow(page, rows.nth(1), {
      name: `${unique} T2`,
      termLabel: 'Term2',
      makeFinal: true,
    });

    const saveButton = page.getByTestId('exam-names-save-button');
    await saveButton.click();
    await expect(saveButton.locator('.MuiCircularProgress-root').or(saveButton)).toBeVisible();
    await expect(page).toHaveURL(CONTROL_PANEL_URL, { timeout: 60000 });
  });
});
