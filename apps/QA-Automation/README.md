# QA Automation

Self-contained Playwright framework. Copy this folder into any React project; change only `.env`, test data, and tests.

## Setup

```bash
cd QA-Automation
npm install
copy .env.example .env
```

Edit `.env`:

| Variable | Purpose |
|----------|---------|
| `ENV_NAME` | Environment label |
| `BASE_URL` | App URL (`https://erpui.aaditechnology.com/` for this product) |
| `TENANT` | Tenant identifier |
| `SCHOOL_NAME` | Exact school name in Select School dropdown |
| `LOGIN_USERNAME` | Login email (not a username) |
| `LOGIN_PASSWORD` | Login password |
| `BROWSER` | `chromium`, `firefox`, or `webkit` |
| `HEADLESS` | `true` or `false` |

## Run

```bash
npx playwright test
npx playwright test tests/smoke
npx playwright test tests/modules/Exams
npx playwright show-report reports/HTML
```

## Structure

```
auth/           Reusable login helpers
config/         Reserved for shared config
pages/          Reserved for page objects
components/     Reserved for shared UI locators
fixtures/       Reserved for Playwright fixtures
utils/          Reserved for shared helpers
tests/smoke/    Smoke tests
tests/regression/
tests/modules/  Feature modules (Student, Teacher, Attendance, Exams, Fees, Support)
reports/        HTML report
test-results/   Screenshots, videos, traces (Playwright output)
```

## Reporting

- HTML report → `reports/HTML`
- Screenshots on failure → `test-results/`
- Video recording → `test-results/`
- Trace on retry → `test-results/`
