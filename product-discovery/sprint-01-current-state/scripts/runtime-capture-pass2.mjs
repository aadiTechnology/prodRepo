/**
 * Second-pass capture for previously blank routes — longer waits + error text.
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Script runs from QA-Automation after copy; write to discovery screenshots via absolute path
const out = "C:/Users/lenovo/AadiTech/Product/code/product-discovery/sprint-01-current-state/screenshots";
fs.mkdirSync(out, { recursive: true });

const BASE = "https://erpui.aaditechnology.com";
const EMAIL = "aaditechology@gmail.com";
const PASSWORD = "Test@123";

const targets = [
  { id: "SS-A-01-lead-list", route: "/admissions/leads" },
  { id: "SS-A-02-lead-add", route: "/admissions/leads/add" },
  { id: "SS-A-05-enrollment", route: "/admissions/enrollment" },
  { id: "SS-B-01-fee-categories", route: "/fees/categories" },
  { id: "SS-B-02-fee-structure", route: "/fees/setup" },
  { id: "SS-B-02b-fee-structure-add", route: "/fees/setup/add" },
  { id: "SS-B-04-discounts", route: "/fees/discounts" },
  { id: "SS-B-05-invoices", route: "/fees/invoices" },
  { id: "SS-B-05b-generate-invoice", route: "/fees/generate-invoice" },
  { id: "SS-B-06-collect", route: "/fees/collect-payment" },
  { id: "SS-B-09-due-list", route: "/fees/due-list-v2" },
  { id: "SS-B-10-fee-report", route: "/fees/reports" },
  { id: "SS-A-05b-student-add-enroll", route: "/admissions/enrollment?source=students" },
  { id: "SS-A-08-profile", route: "/profile" },
];

const notes = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const consoleLogs = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleLogs.push(msg.text().slice(0, 300));
});
page.on("pageerror", (err) => consoleLogs.push("PAGEERROR: " + String(err).slice(0, 300)));

await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
await page.getByRole("textbox", { name: /Email Address/i }).fill(EMAIL);
await page.getByRole("textbox", { name: /^Password/i }).fill(PASSWORD);
await page.getByRole("button", { name: "Sign In" }).click();
await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 90000 });
await page.waitForTimeout(3000);

// Capture Admissions submenu via UI navigation
try {
  await page.getByRole("button", { name: /Admissions/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, "SS-A-00-admissions-menu.png") });
  notes.push({ id: "SS-A-00-admissions-menu", body: (await page.locator("body").innerText()).slice(0, 800) });
  // click child if any labeled Lead or Enrollment
  const leadItem = page.getByRole("button", { name: /Lead|Enrollment|Enquiry/i }).first();
  if ((await leadItem.count()) > 0) {
    const label = await leadItem.innerText();
    await leadItem.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, "SS-A-00b-admissions-child.png") });
    notes.push({ id: "SS-A-00b-admissions-child", label, url: page.url(), body: (await page.locator("body").innerText()).slice(0, 800) });
  }
} catch (e) {
  notes.push({ admissionsMenuError: String(e).slice(0, 200) });
}

try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Fees/i }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(out, "SS-B-00-fees-menu.png") });
  notes.push({ id: "SS-B-00-fees-menu", body: (await page.locator("body").innerText()).slice(0, 1200) });
} catch (e) {
  notes.push({ feesMenuError: String(e).slice(0, 200) });
}

for (const t of targets) {
  consoleLogs.length = 0;
  try {
    await page.goto(`${BASE}${t.route}`, { waitUntil: "networkidle", timeout: 90000 });
    // wait for either main content or permission message
    await page.waitForTimeout(5000);
    // try dismiss buddy
    try {
      const gotIt = page.getByRole("button", { name: /Got it/i });
      if (await gotIt.isVisible({ timeout: 500 })) await gotIt.click();
    } catch {}
    await page.screenshot({ path: path.join(out, `${t.id}.png`), fullPage: true });
    const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1000);
    const htmlLen = (await page.content()).length;
    notes.push({
      id: t.id,
      route: t.route,
      url: page.url(),
      textLen: text.length,
      htmlLen,
      body: text,
      consoleErrors: [...consoleLogs].slice(0, 8),
    });
    console.log(t.id, "textLen=", text.length, "errors=", consoleLogs.length);
  } catch (e) {
    notes.push({ id: t.id, error: String(e).slice(0, 250) });
    console.log("FAIL", t.id, e.message);
  }
}

// Expand Fees children from menu if present after opening invoices via menu labels
try {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /^0 Fees$|Fees/i }).first().click();
  await page.waitForTimeout(800);
  const feeChildren = await page.locator('button,a').filter({ hasText: /Invoice|Due|Category|Structure|Discount|Report|Collect/i }).allTextContents();
  notes.push({ feeChildLabels: feeChildren.slice(0, 20) });
  for (const label of ["Invoice List", "Fee Structure", "Fee Category", "Fee Report", "Fee Due List", "Fee Collection", "Fee Discount"]) {
    const btn = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
      await btn.click();
      await page.waitForTimeout(4500);
      const safe = label.replace(/\s+/g, "-").toLowerCase();
      await page.screenshot({ path: path.join(out, `SS-B-menu-${safe}.png`), fullPage: true });
      notes.push({
        id: `SS-B-menu-${safe}`,
        url: page.url(),
        body: (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 700),
      });
      // reopen fees for next
      await page.getByRole("button", { name: /Fees/i }).first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }
} catch (e) {
  notes.push({ feeMenuNavError: String(e).slice(0, 200) });
}

// Student edit for fee assignment display
try {
  await page.goto(`${BASE}/students`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const edit = page.getByRole("button", { name: /edit/i }).first();
  if ((await edit.count()) > 0) {
    await edit.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(out, "SS-A-07b-student-edit.png"), fullPage: true });
    notes.push({
      id: "SS-A-07b-student-edit",
      url: page.url(),
      body: (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900),
    });
  }
} catch (e) {
  notes.push({ studentEditError: String(e).slice(0, 200) });
}

fs.writeFileSync(path.join(out, "runtime-notes-pass2.json"), JSON.stringify(notes, null, 2));
console.log("PASS2 DONE", notes.length);
await browser.close();
