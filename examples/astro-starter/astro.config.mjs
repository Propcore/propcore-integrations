import cloudflare from '@astrojs/cloudflare';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  output: 'static',
  adapter: cloudflare({ prerenderEnvironment: 'node' }),
  env: {
    schema: {
      PROPCORE_SITE: envField.string({ context: 'server', access: 'secret' }),
      PROPCORE_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
