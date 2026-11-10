import { defineConfig } from 'vitest/config';

const suite = (name: string) => ({
  extends: true as const,
  test: {
    name,
    include: [`test/**/*.${name}.test.ts`],
    environment: 'node',
  },
});

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      // Type-only modules (domain records, repository ports) and the process entry point carry no statement to cover.
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/**/domain/*-record.ts', 'src/**/application/*-repository.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      reportsDirectory: '../../coverage/api',
    },
    projects: [suite('unit'), suite('integration'), suite('realtime')],
  },
  resolve: {
    alias: {
      '@cos/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
