import { createClient, type PropcoreClient } from '@propcore/client';
import type { PluginContext } from 'emdash/plugin';

export interface Settings {
  siteSlug: string;
  apiKey: string;
}

// Dots are allowed: a site can live at a deeper name such as astra-demo.demo.propcore.page.
export const SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

// Accept a pasted address: drop the scheme, the path and the .propcore.page suffix.
export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.propcore\.page$/, '');
}

export function siteUrl(slug: string): string {
  return `https://${slug}.propcore.page`;
}

export async function readSettings(ctx: PluginContext): Promise<Settings | null> {
  const siteSlug = await ctx.settings.get<string>('siteSlug');
  const apiKey = await ctx.settings.get<string>('apiKey');
  if (!siteSlug || !apiKey || !SLUG.test(siteSlug) || siteSlug.length > 80) return null;
  return { siteSlug, apiKey };
}

export function clientFor(ctx: PluginContext, s: Settings): PropcoreClient {
  if (!ctx.http) throw new Error('network:request capability is missing');
  const http = ctx.http;
  // ctx.http.fetch takes a URL string; the client always passes one.
  const fetchImpl: typeof fetch = (input, init) =>
    http.fetch(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      init,
    );
  return createClient({
    site: siteUrl(s.siteSlug),
    key: s.apiKey,
    fetch: fetchImpl,
    userAgent: 'propcore-emdash-plugin/0.1.0',
  });
}
