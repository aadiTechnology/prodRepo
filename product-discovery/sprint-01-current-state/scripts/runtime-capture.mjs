/**
 * Read-only runtime UI capture for discovery (no data mutation).
 * Uses QA example credentials against hosted test UI.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(__dirname, "../screenshots");
fs.mkdirSync(out, { recursive: true });

const BASE = "https://erpui.aaditechnology.com";
const EMAIL = "aaditechology@gmail.com";
const PASSWORD = "Test@123";

const routes = [
  ["SS-A-01-lead-list", "/admissions/leads"],
  ["SS-A-02-lead-add", "/admissions/leads/add"],
  ["SS-A-05-enrollment", "/admissions/enrollment"],
  ["SS-A-06-students", "/students"],
  ["SS-A-09-users", "/users"],
  ["SS-B-01-fee-categories", "/fees/categories"],
  ["SS-B-02-fee-structure", "/fees/setup"],
  ["SS-B-04-discounts", "/fees/discounts"],
  ["SS-B-05-invoices", "/fees/invoices"],
  ["SS-B-05b-generate-invoice", "/fees/generate-invoice"],
  ["SS-B-06-collect", "/fees/collect-payment"],
  ["SS-B-09-due-list", "/fees/due-list-v2"],
  ["SS-B-10-fee-report", "/fees/reports"],
];

const results = [];

async function shot(page, id) {
  const file = path.join(out, `${id}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function bodyPreview(page, n = 500) {
  try {
    return (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, n);
  } catch {
    return "";
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("textbox", { name: /Email Address/i }).fill(EMAIL);
  await page.getByRole("textbox", { name: /^Password/i }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot(page, "SS-00-dashboard");
  results.push({
    id: "SS-00-dashboard",
    url: page.url(),
    roleHint: "Admin badge observed on dashboard historically",
    body: await bodyPreview(page),
  });

  for (const [id, route] of routes) {
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(4000);
      await shot(page, id);
      const headings = await page.locator("h1,h2,h3,h4,h5,h6").allTextContents();
      results.push({
        id,
        route,
        url: page.url(),
        ok: true,
        headings: headings.slice(0, 12),
        body: await bodyPreview(page, 600),
      });
      console.log("OK", id, page.url());
    } catch (e) {
      results.push({ id, route, ok: false, error: String(e).slice(0, 250) });
      console.log("FAIL", id, e.message);
    }
  }

  // Lead convert / edit probes
  try {
    await page.goto(`${BASE}/admissions/leads`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    const convert = page.locator('[title*="Convert"], [aria-label*="Convert"]');
    const convertCount = await convert.count();
    results.push({ convertButtons: convertCount });
    if (convertCount > 0) {
      await convert.first().click();
      await page.waitForTimeout(4000);
      await shot(page, "SS-A-04-convert-to-enrollment");
      results.push({
        id: "SS-A-04-convert-to-enrollment",
        url: page.url(),
        body: await bodyPreview(page, 700),
      });
      await page.goto(`${BASE}/admissions/leads`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);
    }
    const edit = page.locator('[title*="Edit"], [aria-label*="Edit"]');
    if ((await edit.count()) > 0) {
      await edit.first().click();
      await page.waitForTimeout(3500);
      await shot(page, "SS-A-03-lead-edit");
      results.push({
        id: "SS-A-03-lead-edit",
        url: page.url(),
        body: await bodyPreview(page, 700),
      });
    }
  } catch (e) {
    results.push({ leadInteractionError: String(e).slice(0, 250) });
  }

  // Student view
  try {
    await page.goto(`${BASE}/students`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const viewBtn = page.getByRole("button", { name: /view|edit/i }).first();
    if ((await viewBtn.count()) > 0) {
      await viewBtn.click();
      await page.waitForTimeout(4000);
      await shot(page, "SS-A-07-student-view");
      results.push({
        id: "SS-A-07-student-view",
        url: page.url(),
        body: await bodyPreview(page, 800),
      });
    }
  } catch (e) {
    results.push({ studentViewError: String(e).slice(0, 250) });
  }

  // Invoice detail (read-only)
  try {
    await page.goto(`${BASE}/fees/invoices`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const viewBtn = page.getByRole("button", { name: /view/i }).first();
    if ((await viewBtn.count()) > 0) {
      await viewBtn.click();
      await page.waitForTimeout(3500);
      await shot(page, "SS-B-05c-invoice-detail");
      results.push({
        id: "SS-B-05c-invoice-detail",
        url: page.url(),
        body: await bodyPreview(page, 700),
      });
    }
  } catch (e) {
    results.push({ invoiceError: String(e).slice(0, 250) });
  }

  // Fee structure edit to see installments
  try {
    await page.goto(`${BASE}/fees/setup`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3500);
    const edit = page.getByRole("button", { name: /edit/i }).first();
    if ((await edit.count()) > 0) {
      await edit.click();
      await page.waitForTimeout(4000);
      await shot(page, "SS-B-03-fee-structure-installments");
      results.push({
        id: "SS-B-03-fee-structure-installments",
        url: page.url(),
        body: await bodyPreview(page, 800),
      });
    }
  } catch (e) {
    results.push({ structureError: String(e).slice(0, 250) });
  }

  // Receipt only if we can navigate without paying — probe collect page text only
  // Do not submit payments.

  fs.writeFileSync(path.join(out, "runtime-notes.json"), JSON.stringify(results, null, 2));
  console.log("DONE", results.length);
} finally {
  await browser.close();
}
