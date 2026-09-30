import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from '@emdash-cms/plugin-test';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { json, KEY, SITE } from './fixtures.js';

let host: PluginRuntimeTestHost | undefined;
beforeAll(() => {
  process.env.EMDASH_ENCRYPTION_KEY ??= 'test-encryption-key-32-bytes-long!!';
});
afterEach(async () => {
  await host?.dispose();
  host = undefined;
});

const cron = (name: string) => ({ name, scheduledAt: new Date().toISOString() });

async function configured(slug = 'demo') {
  host = await createPluginRuntimeTestHost();
  await host.fixtures.plugin.setting('siteSlug', slug);
  await host.fixtures.plugin.setting('apiKey', KEY);
  return host;
}

it('cron sync stores projects and units and records the state', async () => {
  const h = await configured();
  await h.http.respond(`${SITE}/ai/projects`, json('projects'));
  await h.http.respond(`${SITE}/ai/units`, json('units'));
  await h.transport.invokeHook('cron', cron('sync'));
  const reqs = h.http.requests();
  expect(reqs.map((r) => r.url)).toEqual([`${SITE}/ai/projects`, `${SITE}/ai/units`]);
  expect(new Headers(reqs[0]?.headers).get('authorization')).toBe(`Bearer ${KEY}`);
  expect(await h.inspect.storage.list('projects')).toHaveLength(1);
  expect(await h.inspect.storage.list('units')).toHaveLength(4);
  expect(await h.inspect.storage.get('units', 'u-1201')).toMatchObject({
    unit_number: '1201',
    project_id: 'p-skyline',
  });
  expect(await h.inspect.kv.get('state:sync')).toMatchObject({ projects: 1, units: 4 });
});

it('supports a dotted site slug', async () => {
  const h = await configured('astra-demo.demo');
  const base = 'https://astra-demo.demo.propcore.page';
  await h.http.respond(`${base}/ai/projects`, json('projects'));
  await h.http.respond(`${base}/ai/units`, json('units'));
  await h.transport.invokeHook('cron', cron('sync'));
  expect(h.http.requests()[0]?.url).toBe(`${base}/ai/projects`);
});

it('does nothing and records an error when settings are missing', async () => {
  host = await createPluginRuntimeTestHost();
  await host.transport.invokeHook('cron', cron('sync'));
  expect(host.http.requests()).toHaveLength(0);
  expect(await host.inspect.kv.get('state:sync')).toMatchObject({
    error: expect.stringContaining('settings'),
  });
});

it('keeps existing documents when the API fails', async () => {
  const h = await configured();
  await h.fixtures.plugin.storage('units', 'u-old', {
    id: 'u-old',
    unit_number: 'old',
    project_id: 'p',
  });
  await h.http.respond(
    `${SITE}/ai/projects`,
    new Response('{"code":"ai_source_key_invalid"}', { status: 401 }),
  );
  await h.transport.invokeHook('cron', cron('sync'));
  expect(await h.inspect.storage.get('units', 'u-old')).toBeTruthy();
  expect(await h.inspect.kv.get('state:sync')).toMatchObject({
    error: expect.stringMatching(/401|key/i),
  });
});

it('ignores cron events with another name', async () => {
  const h = await configured();
  await h.transport.invokeHook('cron', cron('other'));
  expect(h.http.requests()).toHaveLength(0);
});
