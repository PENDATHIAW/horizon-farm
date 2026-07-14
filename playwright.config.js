import { defineConfig, devices } from '@playwright/test';

const previewPort = 4173;
const localBaseUrl = `http://127.0.0.1:${previewPort}`;
const externalBaseUrl = process.env.E2E_BASE_URL?.trim();
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1';
const useLocalPreview = !externalBaseUrl && !skipWebServer;
const useLocalDemo = process.env.E2E_LOCAL_DEMO === '1';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: useLocalDemo ? 600_000 : 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: externalBaseUrl || localBaseUrl,
    headless: true,
    viewport: { width: 1440, height: 950 },
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: useLocalPreview
    ? {
        command: useLocalDemo
          ? `npm run dev -- --port ${previewPort} --host 127.0.0.1`
          : `npm run preview -- --port ${previewPort} --host 127.0.0.1`,
        url: localBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
