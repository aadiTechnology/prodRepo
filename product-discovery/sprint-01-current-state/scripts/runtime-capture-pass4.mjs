/** Capture collect for pending invoice; receipt for paid. No payment submit. */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const out =
  "C:/Users/lenovo/AadiTech/Product/code/product-discovery/sprint-01-current-state/screenshots";
const BASE = "https://erpui.aaditechnology.com";
const notes = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
await page.getByRole("textbox", { name: /Email Address/i }).fill("aaditechology@gmail.com");
await page.getByRole("textbox", { name: /^Password/i }).fill("Test@123");
await page.getByRole("button", { name: "Sign In" }).click();
await page.waitForURL((u) => !u.pathname.includes("login"), { timeout: 90000 });
await page.waitForTimeout(2000);

await page.getByRole("button", { name: /Fees/i }).first().click();
await page.waitForTimeout(600);
await page.getByRole("button", { name: /Invoice List/i }).first().click();
await page.waitForTimeout(3500);

const views = page.getByRole("button", { name: /view/i });
const n = await views.count();
notes.push({ viewButtonCount: n });

for (let i = 0; i < Math.min(n, 10); i++) {
  await views.nth(i).click();
  await page.waitForTimeout(2500);
  if (!page.url().includes("/detail")) continue;
  const pay = page.getByTestId("btn-pay-now").or(page.getByRole("button", { name: /Pay Now/i }));
  const enabled = (await pay.count()) > 0 && (await pay.isEnabled().catch(() => false));
  const text = await page.locator("body").innerText();
  notes.push({ i, url: page.url(), payEnabled: enabled, snippet: text.replace(/\s+/g, " ").slice(0, 400) });
  await page.screenshot({ path: path.join(out, `SS-B-05c-detail-${i}.png`), fullPage: true });
  if (enabled) {
    await pay.click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(out, "SS-B-06-collect-payment-v2.png"), fullPage: true });
    notes.push({
      collectUrl: page.url(),
      collectBody: (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1000),
    });
    break;
  }
  // Full Receipt when paid
  const fr = page.getByRole("button", { name: /Full Receipt|Receipt/i });
  if ((await fr.count()) > 0 && (await fr.isEnabled().catch(() => false))) {
    await fr.click();
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(out, "SS-B-08-receipt-v2.png"), fullPage: true });
    notes.push({
      receiptUrl: page.url(),
      receiptBody: (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 900),
    });
    // continue searching for pay-now too
  }
  await page.goBack();
  await page.waitForTimeout(2000);
}

// Users listing for student accounts
await page.goto(`${BASE}/users`, { waitUntil: "networkidle" });
await page.waitForTimeout(3500);
const usersBody = (await page.locator("body").innerText()).replace(/\s+/g, " ");
notes.push({ usersHasStudent: /Student/i.test(usersBody), usersBody: usersBody.slice(0, 1800) });
await page.screenshot({ path: path.join(out, "SS-A-09-users-full.png"), fullPage: true });

fs.writeFileSync(path.join(out, "runtime-notes-pass4.json"), JSON.stringify(notes, null, 2));
console.log("PASS4 DONE");
await browser.close();
