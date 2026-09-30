import { describe, expect, it, vi } from 'vitest';
import { createClient } from '../src/client.js';
import { PropcoreAuthError, PropcoreNotFoundError, PropcoreRateLimitError } from '../src/errors.js';

function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

describe('createClient', () => {
  it('builds URLs under <site>/ai/ and normalises the site', async () => {
    const f = fakeFetch(200, { items: [] });
    const pc = createClient({
      site: 'https://skyline.propcore.page/',
      key: 'pcs_x',
      fetch: f.fetch,
    });
    expect(pc.site).toBe('https://skyline.propcore.page');
    await pc.units.list();
    expect(f.calls[0]?.url).toBe('https://skyline.propcore.page/ai/units');
  });

  it('sends the key as a Bearer header on data calls and not on the manifest', async () => {
    const f = fakeFetch(200, { schema_version: 1, views: [] });
    const pc = createClient({ site: 'https://s.example', key: 'pcs_x', fetch: f.fetch });
    await pc.manifest();
    await pc.projects.get('p1');
    const h0 = new Headers(f.calls[0]?.init.headers);
    const h1 = new Headers(f.calls[1]?.init.headers);
    expect(f.calls[0]?.url).toBe('https://s.example/ai/manifest.json');
    expect(h0.get('authorization')).toBeNull();
    expect(h1.get('authorization')).toBe('Bearer pcs_x');
    expect(f.calls[1]?.url).toBe('https://s.example/ai/projects/p1');
  });

  it('refuses a data call without a key before fetching', async () => {
    const f = fakeFetch(200, {});
    const pc = createClient({ site: 'https://s.example', fetch: f.fetch });
    await expect(pc.units.list()).rejects.toBeInstanceOf(PropcoreAuthError);
    expect(f.calls).toHaveLength(0);
  });

  it('unwraps {items} on lists and returns detail objects as is', async () => {
    const list = fakeFetch(200, { items: [{ id: 'u1' }] });
    expect(
      await createClient({ site: 'https://s.example', key: 'k', fetch: list.fetch }).units.list(),
    ).toEqual([{ id: 'u1' }]);
    const stacking = fakeFetch(200, [{ building_id: 'b1', building_name: 'A', floors: [] }]);
    expect(
      await createClient({
        site: 'https://s.example',
        key: 'k',
        fetch: stacking.fetch,
      }).projects.stacking('p1'),
    ).toEqual([{ building_id: 'b1', building_name: 'A', floors: [] }]);
    expect(stacking.calls[0]?.url).toBe('https://s.example/ai/projects/p1/stacking');
  });

  it('encodes path segments', async () => {
    const f = fakeFetch(200, { view: { key: 'sea view', name: 'x', entity: 'unit' }, items: [] });
    await createClient({ site: 'https://s.example', key: 'k', fetch: f.fetch }).views.results(
      'sea view',
    );
    expect(f.calls[0]?.url).toBe('https://s.example/ai/views/sea%20view/results');
  });

  it('maps 401, 404 and 429 to typed errors', async () => {
    const a = fakeFetch(401, {
      code: 'ai_source_key_invalid',
      message: 'Missing or invalid source key',
    });
    const pa = createClient({ site: 'https://s.example', key: 'k', fetch: a.fetch }).units.list();
    await expect(pa).rejects.toBeInstanceOf(PropcoreAuthError);
    await expect(pa).rejects.toMatchObject({ code: 'ai_source_key_invalid' });
    const n = fakeFetch(404, { code: 'ai_source_not_found', message: 'AI source not found' });
    await expect(
      createClient({ site: 'https://s.example', key: 'k', fetch: n.fetch }).units.get('u9'),
    ).rejects.toBeInstanceOf(PropcoreNotFoundError);
    const r = fakeFetch(429, { message: 'Rate limit exceeded' }, { 'retry-after': '17' });
    const pr = createClient({ site: 'https://s.example', key: 'k', fetch: r.fetch }).units.list();
    await expect(pr).rejects.toBeInstanceOf(PropcoreRateLimitError);
    await expect(pr).rejects.toMatchObject({ retryAfter: 17 });
  });

  it('rejects a site that is not an http(s) origin', () => {
    expect(() => createClient({ site: 'skyline.propcore.page' })).toThrow(/https?:\/\//);
    expect(() => createClient({ site: 'https://s.example/some/path' })).toThrow(/origin/);
  });
});
