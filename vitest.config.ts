import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules/**', '.next/**'],
    // Pictures are taken by a real browser and an HTTPS handshake is set up per test file;
    // the default 5s is too tight for that.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
