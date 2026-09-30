import { validateBlockResponse } from '@emdash-cms/blocks/server';
import { createPluginRuntimeTestHost, type PluginRuntimeTestHost } from '@emdash-cms/plugin-test';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { ENC_KEY, json, KEY, SITE } from './fixtures.js';

// The same validator EmDash runs on every sandboxed admin response
// (emdash-runtime validateSandboxedAdminResponse); an invalid block is a 502 in the admin.
function expectValidBlocks(out: unknown) {
  const r = validateBlockResponse(out, { pluginPagePaths: ['/propcore'] });
  expect(r.errors).toEqual([]);
}

let host: PluginRuntimeTestHost | undefined;
beforeAll(() => {
  process.env.EMDASH_ENCRYPTION_KEY ??= ENC_KEY;
});
afterEach(async () => {
  await host?.dispose();
  host = undefined;
});

it('page_load renders the form with has_value=false before a key is saved', async () => {
  host = await createPluginRuntimeTestHost();
  const out = (await host.transport.invokeRoute('admin', {
    type: 'page_load',
    page: '/propcore',
  })) as { blocks: unknown[] };
  expectValidBlocks(out);
  const text = JSON.stringify(out);
  expect(text).toContain('"action_id":"siteSlug"');
  expect(text).toContain('"action_id":"apiKey"');
  expect(text).toContain('"has_value":false');
});

it('form_submit saves settings, schedules the hourly sync, and never echoes the key', async () => {
  host = await createPluginRuntimeTestHost();
  const out = await host.transport.invokeRoute('admin', {
    type: 'form_submit',
    action_id: 'save',
    values: { siteSlug: 'demo', apiKey: KEY },
  });
  expectValidBlocks(out);
  expect(await host.inspect.setting('siteSlug')).toBe('demo');
  // Secret settings are stored as an encrypted envelope, never as the plaintext.
  const stored = await host.inspect.setting('apiKey');
  expect(stored).toBeTruthy();
  expect(JSON.stringify(stored)).not.toContain(KEY);
  expect(JSON.stringify(out)).not.toContain(KEY);
  expect(JSON.stringify(out)).toContain('"has_value":true');
  const tasks = await host.inspect.scheduledTasks();
  expect(tasks.map((t) => t.name)).toContain('sync');
});

it('rejects an invalid slug and keeps the old value', async () => {
  host = await createPluginRuntimeTestHost();
  await host.fixtures.plugin.setting('siteSlug', 'demo');
  const out = await host.transport.invokeRoute('admin', {
    type: 'form_submit',
    action_id: 'save',
    values: { siteSlug: 'Bad Slug!' },
  });
  expectValidBlocks(out);
  expect(await host.inspect.setting('siteSlug')).toBe('demo');
  expect(JSON.stringify(out)).toMatch(/slug/i);
});

it('sync_now runs the sync and shows the counts', async () => {
  host = await createPluginRuntimeTestHost();
  await host.fixtures.plugin.setting('siteSlug', 'demo');
  await host.fixtures.plugin.setting('apiKey', KEY);
  await host.http.respond(`${SITE}/ai/projects`, json('projects'));
  await host.http.respond(`${SITE}/ai/units`, json('units'));
  const out = await host.transport.invokeRoute('admin', {
    type: 'block_action',
    action_id: 'sync_now',
  });
  expectValidBlocks(out);
  expect(JSON.stringify(out)).toContain('4 units');
  expect(await host.inspect.storage.list('units')).toHaveLength(4);
});
