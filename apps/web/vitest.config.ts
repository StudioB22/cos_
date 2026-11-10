import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.unit.test.ts'],
    coverage: {
      include: ['src/**'],
      exclude: ['src/**/*.test.ts', 'src/**/*.e2e.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: '../../coverage/web',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@cos/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
});
