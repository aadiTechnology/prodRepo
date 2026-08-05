import fs from 'fs';
import path from 'path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestResult,
} from '@playwright/test/reporter';

type Row = {
  id: string;
  name: string;
  status: 'Passed' | 'Failed' | 'Skipped';
  time: string;
  failureReason: string;
};

const ID_PREFIX = /^(TC[\w]+(?:\s*\/\s*TC[\w]+)*)\s+/i;

function parseIdAndName(title: string, fallbackId: string): { id: string; name: string } {
  const match = title.match(ID_PREFIX);
  if (match) {
    return { id: match[1], name: title.slice(match[0].length).trim() };
  }
  return { id: fallbackId, name: title };
}

function mapStatus(status: TestResult['status']): Row['status'] {
  if (status === 'passed') return 'Passed';
  if (status === 'skipped') return 'Skipped';
  return 'Failed';
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Strip terminal color codes Playwright embeds in error messages. */
function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function failureReason(result: TestResult): string {
  if (result.status === 'passed' || result.status === 'skipped') return '';
  const message = stripAnsi(result.error?.message ?? '').trim();
  // Keep only the first line; never include stack traces.
  return message.split(/\r?\n/)[0] ?? '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(rows: Row[]): string {
  const body = rows
    .map(
      (row) => `    <tr class="${row.status.toLowerCase()}">
      <td>${escapeHtml(row.id)}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${row.status}</td>
      <td>${row.time}</td>
      <td>${escapeHtml(row.failureReason)}</td>
    </tr>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Test Execution Report</title>
  <style>
    body { font-family: Segoe UI, sans-serif; margin: 24px; color: #222; }
    h1 { font-size: 20px; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; }
    tr.passed td:nth-child(3) { color: #0a7a2f; font-weight: 600; }
    tr.failed td:nth-child(3) { color: #b00020; font-weight: 600; }
    tr.skipped td:nth-child(3) { color: #8a6d00; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Test Execution Report</h1>
  <table>
    <thead>
      <tr>
        <th>Test Case ID</th>
        <th>Test Case Name</th>
        <th>Execution Status</th>
        <th>Execution Time</th>
        <th>Failure Reason</th>
      </tr>
    </thead>
    <tbody>
${body}
    </tbody>
  </table>
</body>
</html>
`;
}

class LightweightHtmlReporter implements Reporter {
  private suite!: Suite;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite;
  }

  onEnd(_result: FullResult): void {
    const rows: Row[] = [];
    let autoId = 1;

    for (const test of this.suite.allTests()) {
      const result = test.results[test.results.length - 1];
      if (!result) continue;

      const fallbackId = `TC${String(autoId).padStart(3, '0')}`;
      const { id, name } = parseIdAndName(test.title, fallbackId);
      if (!ID_PREFIX.test(test.title)) autoId += 1;

      rows.push({
        id,
        name,
        status: mapStatus(result.status),
        time: formatTime(result.duration),
        failureReason: failureReason(result),
      });
    }

    const outDir = path.resolve(process.cwd(), 'reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'index.html');
    fs.writeFileSync(outFile, buildHtml(rows), 'utf-8');
    console.log(`Lightweight report: ${outFile}`);
  }
}

export default LightweightHtmlReporter;
