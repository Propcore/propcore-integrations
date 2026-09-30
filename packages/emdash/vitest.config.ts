import { emdashPluginTest } from '@emdash-cms/plugin-test/config';
import { defineConfig } from 'vitest/config';

// Plugin tests run inside workerd; test/node/** needs Node APIs and has its own config.
export default defineConfig({
  plugins: [emdashPluginTest()],
  test: { exclude: ['test/node/**', 'node_modules/**'] },
});
