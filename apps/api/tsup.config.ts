import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist',
  noExternal: [/^@cos\/shared/],
});
