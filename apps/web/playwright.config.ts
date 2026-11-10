import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.e2e\.ts/,
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
});
