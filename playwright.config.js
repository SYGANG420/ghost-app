import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'https://ghost-control.duckdns.org',
    ...devices['Pixel 5'],
  },
});
