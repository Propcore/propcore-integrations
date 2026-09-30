import { createClient, type PropcoreClient } from '@propcore/client';
import { VERSION } from './version.js';

export interface PropcoreOptions {
  /** The AI Source site address from Propcore Admin, e.g. https://skyline.propcore.page */
  site: string;
  /** Its source key (pcs_…). Server-side only. */
  key: string;
  fetch?: typeof globalThis.fetch;
  /** A prebuilt client (tests). */
  client?: PropcoreClient;
}

export function resolveClient(o: PropcoreOptions): PropcoreClient {
  if (o.client) return o.client;
  if (!o.site || !o.key) {
    throw new Error(
      '@propcore/astro: both `site` and `key` are required (set PROPCORE_SITE and PROPCORE_KEY)',
    );
  }
  return createClient({
    site: o.site,
    key: o.key,
    ...(o.fetch ? { fetch: o.fetch } : {}),
    userAgent: `@propcore/astro/${VERSION}`,
  });
}
