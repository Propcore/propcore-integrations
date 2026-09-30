import { defineConfig } from 'vitest/config';

// Build/bundle checks shell out to the emdash-plugin CLI, so they run in plain Node.
export default defineConfig({ test: { include: ['test/node/**/*.test.ts'] } });
