import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: [],
    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/api',
    },
  },
  resolve: {
    alias: {
      '@cos/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
  projects: [
    {
      test: {
        name: 'unit',
        include: ['test/**/*.unit.test.ts'],
        environment: 'node',
      },
    },
    {
      test: {
        name: 'integration',
        include: ['test/**/*.integration.test.ts'],
        environment: 'node',
      },
    },
    {
      test: {
        name: 'realtime',
        include: ['test/**/*.realtime.test.ts'],
        environment: 'node',
      },
    },
  ],
});
