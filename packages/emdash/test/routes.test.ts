import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from '@emdash-cms/plugin-test';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { KEY, SITE, json } from './fixtures.js';

const ROUTES = 'https://plugin.test/_emdash/api/plugins/propcore';
let host: PluginRuntimeTestHost | undefined;
beforeAll(() => { process.env.EMDASH_ENCRYPTION_KEY ??= 'test-encryption-key-32-bytes-long!!'; });
afterEach(async () => { await host?.dispose(); host = undefined; });

async function synced() {
  host = await createPluginRuntimeTestHost();
  await host.fixtures.plugin.setting('siteSlug', 'demo');
  await host.fixtures.plugin.setting('apiKey', KEY);
  await host.http.respond(`${SITE}/ai/projects`, json('projects'));
  await host.http.respond(`${SITE}/ai/units`, json('units'));
  await host.transport.invokeHook('cron', { name: 'sync', scheduledAt: new Date().toISOString() });
  host.http.clear();
  return host;
}

it('projects serves the synced projects with a cache header', async () => {
  const h = await synced();
  const res = await h.actions.routes.request('projects', { method: 'GET' });
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toContain('max-age=60');
  const body = (await res.json()) as { data: { items: Array<{ id: string }> } };
  expect(body.data.items.map((p) => p.id)).toEqual(['p-skyline']);
});

it('units filters by project and returns the wire fields unchanged', async () => {
  const h = await synced();
  const res = await h.actions.routes.request('units', { method: 'GET', url: `${ROUTES}/units?project=p-skyline` });
  const body = (await res.json()) as { data: { items: Array<{ unit_number: string; price: { effective?: string } }> } };
  expect(body.data.items.map((u) => u.unit_number)).toEqual(['1201', '1202', '1301', '1302']);
  expect(body.data.items[0]?.price.effective).toBe('237500.00');
  const none = await h.actions.routes.request('units', { method: 'GET', url: `${ROUTES}/units?project=nope` });
  expect(((await none.json()) as { data: { items: unknown[] } }).data.items).toEqual([]);
  const missing = await h.actions.routes.request('units', { method: 'GET' });
  expect(missing.status).toBe(400);
});

it('availability fetches the stacking plan live and never exposes the key', async () => {
  const h = await synced();
  await h.http.respond(`${SITE}/ai/projects/p-skyline/stacking`, json('stacking'));
  const res = await h.actions.routes.request('availability', { method: 'GET', url: `${ROUTES}/availability?project=p-skyline` });
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toContain('max-age=30');
  const body = (await res.json()) as { data: { buildings: Array<{ floors: unknown[] }> } };
  expect(body.data.buildings[0]?.floors).toHaveLength(2);
  expect(JSON.stringify(body)).not.toContain(KEY);
  await h.http.respond(`${SITE}/ai/projects/p-skyline/stacking`, new Response('down', { status: 503 }));
  const bad = await h.actions.routes.request('availability', { method: 'GET', url: `${ROUTES}/availability?project=p-skyline` });
  expect(bad.status).toBe(502);
});

it('routes refuse non-GET methods', async () => {
  const h = await synced();
  expect((await h.actions.routes.request('projects', { method: 'POST' })).status).toBeGreaterThanOrEqual(400);
});
