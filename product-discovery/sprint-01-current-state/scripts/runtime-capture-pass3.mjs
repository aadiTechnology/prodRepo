/**
 * SPA-only navigation capture (no hard reload page.goto on deep links).
 * Hosted deploy returns empty shell when deep-linking (asset 404s); client routing from dashboard works.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const out =
  "C:/Users/lenovo/AadiTech/Product/code/product-discovery/sprint-01-current-state/screenshots";
fs.mkdirSync(out, { recursive: true });
const BASE = "https://erpui.aaditechnology.com";
const EMAIL = "aaditechology@gmail.com";
const PASSWORD = "Test@123";
const notes = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function capture(id) {
  await page.waitForTimeout(2500);
  try {
    const gotIt = page.getByRole("button", { name: /Got it/i });
    if (await gotIt.isVisible({ timeout: 400 })) await gotIt.click();
  } catch {}
  await page.screenshot({ path: path.join(out, `${id}.png`), fullPage: true });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1000);
  notes.push({ id, url: page.url(), bodyLen: body.length, body });
  console.log(id, page.url(), "len", body.length);
}

async function openParent(name) {
  // ensure at dashboard shell
  const btn = page.getByRole("button", { name: new RegExp(name, "i") }).first();
  await btn.click();
  await page.waitForTimeout(700);
}

async function clickChild(name) {
  const btn = page.getByRole("button", { name: new RegExp(name, "i") }).first();
  await btn.click();
  await page.waitForTimeout(3000);
}

await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
await page.getByRole("textbox", { name: /Email Address/i }).fill(EMAIL);
await page.getByRole("textbox", { name: /^Password/i }).fill(PASSWORD);
await page.getByRole("button", { name: "Sign In" }).click();
await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 90000 });
await page.waitForTimeout(2500);
await capture("SS-00-dashboard-pass3");

// Admissions → Lead Management
await openParent("Admissions");
await page.waitForTimeout(500);
await capture("SS-A-00-admissions-menu-v2");
await clickChild("Lead Management");
await capture("SS-A-01-lead-list-v2");

// Add Lead from toolbar
try {
  const add = page.getByRole("button", { name: /Add Lead/i });
  if ((await add.count()) > 0) {
    await add.click();
    await page.waitForTimeout(3000);
    await capture("SS-A-02-lead-add-v2");
    // go back via breadcrumb or browser history within SPA
    await page.goBack();
    await page.waitForTimeout(2000);
  }
} catch (e) {
  notes.push({ addLeadError: String(e).slice(0, 200) });
}

// Convert action — only click if present; do not save enrollment
await page.getByRole("button", { name: /Admissions/i }).first().click().catch(() => {});
await page.waitForTimeout(400);
await clickChild("Lead Management").catch(() => {});
await page.waitForTimeout(2000);
const convert = page.locator('[title*="Convert"], [aria-label*="Convert"]');
notes.push({ convertCount: await convert.count() });
if ((await convert.count()) > 0) {
  await convert.first().click();
  await page.waitForTimeout(3500);
  await capture("SS-A-04-convert-to-enrollment-v2");
  await page.goBack();
  await page.waitForTimeout(1500);
}

// Edit first lead for detail
const edits = page.locator('[title*="Edit"], [aria-label*="Edit"]');
if ((await edits.count()) > 0) {
  await edits.first().click();
  await page.waitForTimeout(3000);
  await capture("SS-A-03-lead-edit-v2");
  await page.goBack();
  await page.waitForTimeout(1500);
}

// Students path works with goto earlier; re-verify student view via SPA if needed
// Fees menu children
async function ensureDashboard() {
  // click Dashboard in menu to reset
  try {
    await page.getByRole("button", { name: /Dashboard/i }).first().click();
    await page.waitForTimeout(1500);
  } catch {
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);
  }
}

const feeItems = [
  ["SS-B-menu-invoice-list-v2", "Invoice List"],
  ["SS-B-menu-fee-category-v2", "Fee Category"],
  ["SS-B-menu-fee-structure-v2", "Fee Structure"],
  ["SS-B-menu-fee-discount-v2", "Fee Discount"],
  ["SS-B-menu-fee-due-v2", "Fee Due"],
  ["SS-B-menu-fee-collection-v2", "Fee Collection"],
  ["SS-B-menu-fee-report-v2", "Fee Report"],
];

for (const [id, label] of feeItems) {
  try {
    await ensureDashboard();
    await openParent("Fees");
    await page.waitForTimeout(600);
    const child = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if ((await child.count()) === 0) {
      notes.push({ id, missing: true, label });
      console.log("MISSING", label);
      continue;
    }
    await child.click();
    await page.waitForTimeout(3500);
    await capture(id);
    // try secondary actions without saving
    if (label === "Fee Structure") {
      const add = page.getByRole("button", { name: /Add/i }).first();
      if ((await add.count()) > 0 && (await add.isVisible())) {
        await add.click();
        await page.waitForTimeout(3000);
        await capture("SS-B-03-fee-structure-form-v2");
        await page.goBack().catch(() => {});
        await page.waitForTimeout(1500);
      }
      const edit = page.locator('[title*="Edit"], [aria-label*="Edit"]').first();
      if ((await edit.count()) > 0) {
        await edit.click();
        await page.waitForTimeout(3500);
        await capture("SS-B-03-fee-structure-edit-installments-v2");
        await page.goBack().catch(() => {});
      }
    }
    if (label === "Invoice List") {
      const view = page.getByRole("button", { name: /view/i }).first();
      if ((await view.count()) > 0) {
        await view.click();
        await page.waitForTimeout(3500);
        await capture("SS-B-05c-invoice-detail-v2");
        // Collect payment navigation if present — do not submit
        const collect = page.getByRole("button", { name: /collect|payment/i }).first();
        if ((await collect.count()) > 0 && (await collect.isVisible().catch(() => false))) {
          await collect.click();
          await page.waitForTimeout(3500);
          await capture("SS-B-06-collect-payment-v2");
          await page.goBack().catch(() => {});
        }
        await page.goBack().catch(() => {});
      }
      const gen = page.getByRole("button", { name: /Generate/i }).first();
      if ((await gen.count()) > 0 && (await gen.isVisible().catch(() => false))) {
        await gen.click();
        await page.waitForTimeout(3500);
        await capture("SS-B-05b-generate-invoice-v2");
        await page.goBack().catch(() => {});
      }
    }
  } catch (e) {
    notes.push({ id, error: String(e).slice(0, 250) });
    console.log("ERR", label, e.message);
  }
}

// Users list already known; Student edit show parent+fee already
await ensureDashboard();
await openParent("Basic Configuration").catch(() => {});
// Students often under Administration-like; may be under Platform Foundation / Basic Configuration
// We have /students working — but prefer SPA: try searching
try {
  const search = page.getByPlaceholder(/Quick Search/i);
  if (await search.isVisible()) {
    await search.fill("Student");
    await page.waitForTimeout(1000);
    await capture("SS-A-search-student");
  }
} catch {}

fs.writeFileSync(path.join(out, "runtime-notes-pass3.json"), JSON.stringify(notes, null, 2));
console.log("PASS3 DONE");
await browser.close();
