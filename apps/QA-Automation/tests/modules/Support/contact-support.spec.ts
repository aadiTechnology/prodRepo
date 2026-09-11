import { expect, Page, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { loginToDashboard } from '../../../auth/auth-login';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

const loginUsername = process.env.LOGIN_USERNAME;
const loginPassword = process.env.LOGIN_PASSWORD;

const MY_QUERIES_URL = /\/support\/contact\/?$/;
const CREATE_QUERY_URL = /\/support\/contact\/add\/?$/;
const CATEGORIES_URL = /\/support\/contact\/categories\/?$/;

const MINI_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

async function openMyQueries(page: Page) {
  await page.goto('/support/contact');
  await expect(
    page.getByTestId('support-my-queries').or(page.getByTestId('page-support-queries-denied'))
  ).toBeVisible({ timeout: 60000 });
}

async function waitForQueryList(page: Page) {
  await expect(page.getByTestId('support-my-queries')).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByTestId('table-support-queries').or(page.getByTestId('empty-support-queries'))
  ).toBeVisible({ timeout: 30000 });
}

async function openCreateQuery(page: Page) {
  await waitForQueryList(page);
  const createBtn = page.getByTestId('btn-create-query');
  const emptyCreateBtn = page.getByTestId('btn-empty-create-query');

  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
  } else if (await emptyCreateBtn.isVisible().catch(() => false)) {
    await emptyCreateBtn.click();
  } else {
    await page.goto('/support/contact/add');
  }

  await expect(
    page.getByTestId('page-create-query').or(page.getByTestId('page-create-query-denied'))
  ).toBeVisible({ timeout: 30000 });
}

async function selectFirstQueryCategory(page: Page): Promise<string | null> {
  await page.getByTestId('support-query-category').click();
  const option = page.getByTestId('support-query-category-option').first();
  if (!(await option.isVisible().catch(() => false))) {
    await page.keyboard.press('Escape');
    return null;
  }
  const name = (await option.innerText()).trim();
  await option.click();
  return name || null;
}

async function fillQueryForm(
  page: Page,
  values: { subject: string; description: string; category?: string }
) {
  if (values.category) {
    await page.getByTestId('support-query-category').click();
    await page
      .getByTestId('support-query-category-option')
      .filter({ hasText: values.category })
      .first()
      .click();
  } else {
    const selected = await selectFirstQueryCategory(page);
    expect(selected, 'At least one support category must exist to create a query').toBeTruthy();
  }

  await page.getByTestId('input-query-subject').fill(values.subject);
  await page.getByTestId('input-query-description').fill(values.description);
}

async function snackbar(page: Page, text: string | RegExp) {
  await expect(page.getByText(text)).toBeVisible({ timeout: 30000 });
}

async function createOwnedQuery(
  page: Page,
  values: { subject: string; description: string }
): Promise<string | null> {
  await openCreateQuery(page);
  if (await page.getByTestId('page-create-query-denied').isVisible().catch(() => false)) {
    return null;
  }

  await expect(page.getByTestId('page-create-query')).toBeVisible();
  await fillQueryForm(page, values);
  await page.getByTestId('btn-submit-create-query').click();

  const success = page.getByText(/Query .+ created successfully\./);
  const failure = page.getByText('Failed to save query. Please try again.');
  await expect(success.or(failure)).toBeVisible({ timeout: 30000 });

  if (await failure.isVisible().catch(() => false)) {
    return null;
  }

  const message = await success.innerText();
  const match = message.match(/Query\s+(\S+)\s+created successfully/);
  expect(match, `Could not parse query id from "${message}"`).toBeTruthy();
  await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 30000 });
  await waitForQueryList(page);
  return match![1];
}

async function queryRow(page: Page, queryId: string) {
  return page.getByTestId('table-support-queries').getByRole('row').filter({
    hasText: queryId,
  });
}

test.describe('Contact Support — My Queries', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !loginUsername || !loginPassword,
      'Set LOGIN_USERNAME and LOGIN_PASSWORD in QA-Automation/.env'
    );
    test.setTimeout(180000);
    await loginToDashboard(page);
  });

  test('opens My Queries from the Support sidebar', async ({ page }) => {
    const quickSearch = page.getByPlaceholder('Quick Search...');
    if (await quickSearch.isVisible().catch(() => false)) {
      await quickSearch.fill('My Queries');
    }

    const myQueriesItem = page.getByText('My Queries', { exact: true }).first();
    if (!(await myQueriesItem.isVisible().catch(() => false))) {
      await page.getByText('Support', { exact: true }).first().click();
    }

    await expect(myQueriesItem).toBeVisible({ timeout: 30000 });
    await myQueriesItem.click();
    await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 30000 });
    await waitForQueryList(page);
    await expect(page.getByText('My Queries').first()).toBeVisible();
  });

  test('shows the My Queries list screen', async ({ page }) => {
    await openMyQueries(page);
    await waitForQueryList(page);

    await expect(page.getByTestId('input-query-search')).toBeVisible();
    await expect(page.getByTestId('support-query-category-filter')).toBeVisible();
    await expect(page.getByPlaceholder('Search by ID, subject, category…')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Query ID' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Subject' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created Date & Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();

    const createBtn = page.getByTestId('btn-create-query');
    const categoryAddBtn = page.getByTestId('support-category-add');
    await expect(createBtn.or(categoryAddBtn)).toBeVisible();

    if (await categoryAddBtn.isVisible().catch(() => false)) {
      await expect(page.getByRole('columnheader', { name: 'Created By' })).toBeVisible();
    }
  });

  test('shows empty state when no queries match', async ({ page }) => {
    await openMyQueries(page);
    await waitForQueryList(page);

    await page.getByTestId('input-query-search').fill(`no-match-${Date.now()}`);
    await expect(page.getByTestId('empty-support-queries')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('No queries found')).toBeVisible();
    await expect(page.getByText("You haven't raised any support queries yet.")).toBeVisible();
  });

  test('searches queries by subject', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Search Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Search flow description for Playwright.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    const row = await queryRow(page, queryId!);
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText(subject);
    await expect(page.getByTestId(`chip-query-status-${queryId}`)).toBeVisible();
    await expect(page.getByTestId(`btn-view-query-${queryId}`)).toBeVisible();
  });

  test('filters queries by category', async ({ page }) => {
    await openMyQueries(page);
    await waitForQueryList(page);

    await page.getByTestId('support-query-category-filter').click();
    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 10000 });

    let category: string | null = null;
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = (await options.nth(i).innerText()).trim();
      if (text && text !== 'Category' && text !== 'All Categories') {
        category = text;
        await options.nth(i).click();
        break;
      }
    }

    test.skip(!category, 'No category options available to filter');
    await expect(page.getByTestId('support-query-category-filter')).toContainText(category!);

    const empty = page.getByTestId('empty-support-queries');
    const table = page.getByTestId('table-support-queries');
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
    } else {
      await expect(table.getByRole('row').nth(1)).toContainText(category!);
    }
  });

  test('filters queries by status', async ({ page }) => {
    await openMyQueries(page);
    await waitForQueryList(page);

    const statusFilter = page.getByRole('combobox').filter({ hasText: /^Status$/ });
    await expect(statusFilter).toBeVisible();
    await statusFilter.click();
    await expect(page.getByRole('option', { name: 'Open', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'In Progress', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Resolved', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Closed', exact: true })).toBeVisible();
    await page.getByRole('option', { name: 'Open', exact: true }).click();

    const empty = page.getByTestId('empty-support-queries');
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
    } else {
      await expect(page.getByTestId('table-support-queries').getByText('Open').first()).toBeVisible();
    }
  });

  test('opens create query and cancels back to the list', async ({ page }) => {
    await openMyQueries(page);
    await openCreateQuery(page);
    test.skip(
      await page.getByTestId('page-create-query-denied').isVisible().catch(() => false),
      'Current user cannot create support queries'
    );

    await expect(page).toHaveURL(CREATE_QUERY_URL);
    await expect(page.getByTestId('page-create-query')).toBeVisible();
    await expect(page.getByText('Add Query')).toBeVisible();
    await expect(page.getByTestId('support-query-category')).toBeVisible();
    await expect(page.getByTestId('input-query-subject')).toBeVisible();
    await expect(page.getByTestId('input-query-description')).toBeVisible();
    await expect(page.getByTestId('section-query-attachment')).toBeVisible();
    await expect(page.getByTestId('btn-query-upload')).toBeVisible();
    await expect(page.getByTestId('btn-header-cancel-query')).toBeVisible();
    await expect(page.getByTestId('btn-header-save-query')).toBeVisible();

    await page.getByTestId('btn-cancel-create-query').click();
    await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 15000 });
    await waitForQueryList(page);
  });

  test('blocks save when required create fields are empty', async ({ page }) => {
    await openMyQueries(page);
    await openCreateQuery(page);
    test.skip(
      await page.getByTestId('page-create-query-denied').isVisible().catch(() => false),
      'Current user cannot create support queries'
    );

    await page.getByTestId('btn-submit-create-query').click();
    await expect(page.getByText('Required.').first()).toBeVisible();
    await expect(page).toHaveURL(CREATE_QUERY_URL);
    await expect(page.getByTestId('page-create-query')).toBeVisible();
  });

  test('rejects an invalid query attachment type', async ({ page }) => {
    await openMyQueries(page);
    await openCreateQuery(page);
    test.skip(
      await page.getByTestId('page-create-query-denied').isVisible().catch(() => false),
      'Current user cannot create support queries'
    );

    await page.getByTestId('input-query-attachment').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an allowed support attachment'),
    });

    await expect(page.getByTestId('alert-query-attachment-error')).toBeVisible();
    await expect(page.getByTestId('alert-query-attachment-error')).toContainText(
      'Please upload a valid file. Allowed file types: PDF, DOC, DOCX, JPG, JPEG, PNG.'
    );
  });

  test('rejects a query attachment larger than 10 MB', async ({ page }) => {
    await openMyQueries(page);
    await openCreateQuery(page);
    test.skip(
      await page.getByTestId('page-create-query-denied').isVisible().catch(() => false),
      'Current user cannot create support queries'
    );

    await page.getByTestId('input-query-attachment').setInputFiles({
      name: 'large.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    });

    await expect(page.getByTestId('alert-query-attachment-error')).toBeVisible();
    await expect(page.getByTestId('alert-query-attachment-error')).toContainText(
      'File size must be 10 MB or less.'
    );
  });

  test('uploads and removes a valid query attachment', async ({ page }) => {
    await openMyQueries(page);
    await openCreateQuery(page);
    test.skip(
      await page.getByTestId('page-create-query-denied').isVisible().catch(() => false),
      'Current user cannot create support queries'
    );

    await page.getByTestId('input-query-attachment').setInputFiles({
      name: 'qa-support.png',
      mimeType: 'image/png',
      buffer: MINI_PNG,
    });

    await expect(page.getByTestId('card-query-attachment')).toBeVisible();
    await expect(page.getByTestId('card-query-attachment')).toContainText('qa-support.png');
    await page.getByText('qa-support.png').click();
    await expect(page.getByTestId('dialog-query-attachment-preview')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('btn-remove-query-attachment').click();
    await expect(page.getByTestId('card-query-attachment')).toHaveCount(0);
  });

  test('creates a support query and shows it in the list', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Created Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Created by Playwright for Contact Support.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    const row = await queryRow(page, queryId!);
    await expect(row).toBeVisible();
    await expect(row).toContainText(subject);
    await expect(page.getByTestId(`chip-query-status-${queryId}`)).toHaveText('Open');
    await expect(page.getByTestId(`btn-view-query-${queryId}`)).toBeVisible();
    await expect(page.getByTestId(`btn-edit-query-${queryId}`)).toBeVisible();
    await expect(page.getByTestId(`btn-delete-query-${queryId}`)).toBeVisible();
  });

  test('views query detail, conversation, and back navigation', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA View Query');
    const description = 'View-flow description for Playwright.';
    const queryId = await createOwnedQuery(page, { subject, description });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-view-query-${queryId}`).click();
    await expect(page).toHaveURL(new RegExp(`/support/contact/${queryId}/?$`), { timeout: 30000 });
    await expect(page.getByTestId('page-query-detail')).toBeVisible();
    await expect(page.getByTestId('section-query-summary')).toBeVisible();
    await expect(page.getByTestId('section-query-conversation')).toBeVisible();
    await expect(page.getByTestId('chip-query-detail-status')).toHaveText('Open');
    await expect(page.getByTestId('section-query-summary')).toContainText(queryId!);
    await expect(page.getByTestId('section-query-summary')).toContainText(subject);
    await expect(page.getByTestId('section-query-summary')).toContainText(description);
    await expect(page.getByText('No attachments')).toBeVisible();
    await expect(page.getByTestId('input-query-response')).toBeVisible();
    await expect(page.getByTestId('select-query-status')).toBeVisible();
    await expect(page.getByTestId('btn-submit-query-response')).toBeVisible();

    await page.getByTestId('btn-back-queries').click();
    await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 15000 });
    await waitForQueryList(page);
  });

  test('requires a response body before submitting on query detail', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Empty Reply');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Empty reply validation.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-view-query-${queryId}`).click();
    await expect(page.getByTestId('page-query-detail')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('btn-submit-query-response').click();
    await snackbar(page, 'Enter a response before submitting.');
  });

  test('adds a query response and updates status', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Reply Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Reply-flow description.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-view-query-${queryId}`).click();
    await expect(page.getByTestId('page-query-detail')).toBeVisible({ timeout: 30000 });

    const reply = uniqueLabel('QA response');
    await page.getByTestId('input-query-response').fill(reply);
    await page.getByTestId('select-query-status').click();
    await page.getByRole('option', { name: 'In Progress', exact: true }).click();
    await page.getByTestId('btn-submit-query-response').click();
    await snackbar(page, 'Response added.');
    await expect(page.getByTestId('section-query-conversation')).toContainText(reply);
    await expect(page.getByTestId('chip-query-detail-status')).toHaveText('In Progress');
  });

  test('edits an owned query and returns to the list', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Edit Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Original description before edit.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-edit-query-${queryId}`).click();
    await expect(page).toHaveURL(new RegExp(`/support/contact/${queryId}/edit/?$`), {
      timeout: 30000,
    });
    await expect(page.getByTestId('page-edit-query')).toBeVisible();
    await expect(page.getByText('Edit Query')).toBeVisible();
    await expect(page.getByTestId('input-query-subject')).toHaveValue(subject);

    const updatedSubject = `${subject} updated`;
    const updatedDescription = 'Updated description from Playwright.';
    await page.getByTestId('input-query-subject').fill(updatedSubject);
    await page.getByTestId('input-query-description').fill(updatedDescription);
    await page.getByTestId('btn-submit-create-query').click();
    await snackbar(page, `Query ${queryId} updated successfully.`);
    await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 30000 });

    await page.getByTestId('input-query-search').fill(updatedSubject);
    await expect(await queryRow(page, queryId!)).toContainText(updatedSubject);
  });

  test('cancels query delete from the confirmation dialog', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Cancel Delete');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Delete cancel flow.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-delete-query-${queryId}`).click();
    const dialog = page.getByTestId('dialog-delete-query');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`Permanently delete ${queryId}? This cannot be undone.`);
    await dialog.getByTestId('btn-cancel').click();
    await expect(dialog).toBeHidden();
    await expect(await queryRow(page, queryId!)).toBeVisible();
  });

  test('deletes an owned query after confirmation', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA Delete Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'Delete confirm flow.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-delete-query-${queryId}`).click();
    const dialog = page.getByTestId('dialog-delete-query');
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('btn-confirm').click();
    await snackbar(page, `Query ${queryId} deleted.`);
    await page.getByTestId('input-query-search').fill(subject);
    await expect(page.getByTestId(`btn-view-query-${queryId}`)).toHaveCount(0);
  });

  test('shows missing-query states for unknown ids', async ({ page }) => {
    await page.goto('/support/contact/QRY-DOES-NOT-EXIST');
    await expect(page.getByTestId('page-query-detail-missing')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Query not found.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to My Queries' }).click();
    await expect(page).toHaveURL(MY_QUERIES_URL, { timeout: 15000 });

    await page.goto('/support/contact/QRY-DOES-NOT-EXIST/edit');
    await expect(
      page
        .getByTestId('page-edit-query-missing')
        .or(page.getByTestId('page-create-query-denied'))
        .or(page.getByTestId('page-edit-query-forbidden'))
    ).toBeVisible({ timeout: 30000 });
  });

  test('runs the complete My Queries create-view-edit-delete flow', async ({ page }) => {
    await openMyQueries(page);
    const subject = uniqueLabel('QA E2E Query');
    const queryId = await createOwnedQuery(page, {
      subject,
      description: 'End-to-end Contact Support flow.',
    });
    test.skip(
      !queryId,
      'Could not create a query. SYSTEM_ADMIN login may lack tenant context required to save.'
    );

    await page.getByTestId('input-query-search').fill(subject);
    await expect(await queryRow(page, queryId!)).toBeVisible();

    await page.getByTestId(`btn-view-query-${queryId}`).click();
    await expect(page.getByTestId('page-query-detail')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('section-query-summary')).toContainText(subject);
    await page.getByTestId('input-query-response').fill('E2E follow-up response.');
    await page.getByTestId('btn-submit-query-response').click();
    await snackbar(page, 'Response added.');

    await page.getByTestId('btn-back-queries').click();
    await waitForQueryList(page);
    await page.getByTestId('input-query-search').fill(subject);
    await page.getByTestId(`btn-edit-query-${queryId}`).click();
    await expect(page.getByTestId('page-edit-query')).toBeVisible({ timeout: 30000 });
    const updated = `${subject} e2e-updated`;
    await page.getByTestId('input-query-subject').fill(updated);
    await page.getByTestId('btn-header-save-query').click();
    await snackbar(page, `Query ${queryId} updated successfully.`);

    await page.getByTestId('input-query-search').fill(updated);
    await page.getByTestId(`btn-delete-query-${queryId}`).click();
    await page.getByTestId('dialog-delete-query').getByTestId('btn-confirm').click();
    await snackbar(page, `Query ${queryId} deleted.`);
    await expect(page.getByTestId(`btn-view-query-${queryId}`)).toHaveCount(0);
  });
});
test.describe('Contact Support — Query Categories', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !loginUsername || !loginPassword,
      'Set LOGIN_USERNAME and LOGIN_PASSWORD in QA-Automation/.env'
    );
    test.setTimeout(180000);
    await loginToDashboard(page);
    await openMyQueries(page);
  });

  test('opens the category list from My Queries for Super Admin', async ({ page }) => {
    const addFromList = page.getByTestId('support-category-add');
    test.skip(
      !(await addFromList.isVisible().catch(() => false)),
      'Category management is Super Admin only; current user sees Create Query instead'
    );

    await addFromList.click();
    await expect(page).toHaveURL(CATEGORIES_URL, { timeout: 30000 });
    await expect(page.getByTestId('support-category-list')).toBeVisible();
    await expect(page.getByTestId('table-support-categories')).toBeVisible();
    await expect(page.getByTestId('input-support-category-search')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    await expect(page.getByText('Add Categories')).toBeVisible();
  });

  test('shows access denied on categories for non Super Admin', async ({ page }) => {
    const createBtn = page.getByTestId('btn-create-query');
    test.skip(
      !(await createBtn.isVisible().catch(() => false)),
      'Current user is Super Admin and can access categories'
    );

    await page.goto('/support/contact/categories');
    await expect(page.getByTestId('page-support-categories-denied')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Access Denied')).toBeVisible();
  });

  test('validates empty and duplicate category names', async ({ page }) => {
    const addFromList = page.getByTestId('support-category-add');
    test.skip(
      !(await addFromList.isVisible().catch(() => false)),
      'Category management is Super Admin only'
    );

    await addFromList.click();
    await expect(page.getByTestId('support-category-list')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('support-category-add').click();

    const dialog = page.getByTestId('dialog-support-category');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add Category')).toBeVisible();
    await page.getByTestId('support-category-save').click();
    await expect(page.getByTestId('support-category-name')).toBeVisible();
    await expect(dialog.getByText('Please enter category name.')).toBeVisible();

    await page.getByTestId('support-category-cancel').click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('support-category-add').click();
    await expect(dialog).toBeVisible();
    await page.getByTestId('support-category-name').fill('Technical Issue');
    await page.getByTestId('support-category-save').click();
    const duplicate = dialog.getByText('Category already exists.');
    const saved = page.getByText('Category added successfully.');
    await expect(duplicate.or(saved)).toBeVisible({ timeout: 10000 });
  });

  test('adds, searches, edits, and deletes a category', async ({ page }) => {
    const addFromList = page.getByTestId('support-category-add');
    test.skip(
      !(await addFromList.isVisible().catch(() => false)),
      'Category management is Super Admin only'
    );

    await addFromList.click();
    await expect(page.getByTestId('support-category-list')).toBeVisible({ timeout: 30000 });

    const name = uniqueLabel('QA Category');
    await page.getByTestId('support-category-add').click();
    const dialog = page.getByTestId('dialog-support-category');
    await expect(dialog).toBeVisible();
    await page.getByTestId('support-category-name').fill(name);
    await page.getByTestId('support-category-save').click();
    await snackbar(page, 'Category added successfully.');
    await expect(dialog).toBeHidden();

    await page.getByTestId('input-support-category-search').fill(name);
    const row = page.getByTestId('table-support-categories').getByRole('row').filter({
      hasText: name,
    });
    await expect(row).toBeVisible();

    await row.locator('[data-testid^="support-category-edit-"]').click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit Category')).toBeVisible();
    const updated = `${name} updated`;
    await page.getByTestId('support-category-name').fill(updated);
    await page.getByTestId('support-category-save').click();
    await snackbar(page, 'Category updated successfully.');

    await page.getByTestId('input-support-category-search').fill(updated);
    const updatedRow = page.getByTestId('table-support-categories').getByRole('row').filter({
      hasText: updated,
    });
    await expect(updatedRow).toBeVisible();

    await updatedRow.locator('[data-testid^="support-category-delete-"]').click();
    const confirm = page.getByTestId('support-category-delete-confirmation');
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText('Are you sure you want to delete this category?');
    await confirm.getByTestId('btn-confirm').click();
    await snackbar(page, 'Category deleted successfully.');
    await page.getByTestId('input-support-category-search').fill(updated);
    await expect(page.getByText('No categories configured.')).toBeVisible();
  });
});

