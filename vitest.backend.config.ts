import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/backend/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 60000,
    sequence: { concurrent: false },
    pool: 'forks',
    singleFork: true,
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/global-setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
