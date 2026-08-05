import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Prefer QA-Automation/.env over any pre-set shell BASE_URL (e.g. localhost:5173).
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const isHeadless = (process.env.HEADLESS ?? 'false').toLowerCase() === 'true';
const browserName = (process.env.BROWSER ?? 'chromium').toLowerCase();

const browserProjects = {
  chromium: { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] } },
} as const;

const selectedProject =
  browserProjects[browserName as keyof typeof browserProjects] ?? browserProjects.chromium;

export default defineConfig({
  testDir: './tests',
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'reports/HTML', open: 'never' }],
    ['./reporters/lightweight-html-reporter.ts'],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://erpui.aaditechnology.com/',
    headless: isHeadless,
    video: 'on',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [selectedProject],
});
