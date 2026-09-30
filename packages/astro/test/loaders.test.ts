import type { PropcoreClient } from '@propcore/client';
import type { LoaderContext } from 'astro/loaders';
import { describe, expect, it, vi } from 'vitest';
import { propcoreProjects, propcoreUnits } from '../src/loaders.js';

const units = [
  { id: 'u1', unit_number: '1', project_id: 'p1', status: { state: 'available' } },
  { id: 'u2', unit_number: '2', project_id: 'p2', status: { state: 'unavailable' } },
];
const projects = [
  { id: 'p1', name: 'Skyline' },
  { id: 'p2', name: 'Marina' },
];

function fakeClient(): PropcoreClient {
  return {
    site: 'https://s.example',
    manifest: vi.fn(),
    projects: { list: vi.fn(async () => projects), get: vi.fn(), stacking: vi.fn() },
    units: { list: vi.fn(async () => units), get: vi.fn() },
    listings: { list: vi.fn(async () => []), get: vi.fn() },
    promotions: { list: vi.fn(async () => []), get: vi.fn() },
    views: { results: vi.fn() },
  } as unknown as PropcoreClient;
}

function fakeContext() {
  const rows = new Map<string, { id: string; data: Record<string, unknown>; digest?: string }>();
  const meta = new Map<string, string>();
  const ctx = {
    store: {
      set: (e: { id: string; data: Record<string, unknown>; digest?: string }) => {
        rows.set(e.id, e);
        return true;
      },
      clear: () => rows.clear(),
      get: (k: string) => rows.get(k),
      entries: () => [...rows.entries()],
      keys: () => [...rows.keys()],
      values: () => [...rows.values()],
      delete: (k: string) => rows.delete(k),
      has: (k: string) => rows.has(k),
    },
    meta: {
      get: (k: string) => meta.get(k),
      set: (k: string, v: string) => meta.set(k, v),
      has: (k: string) => meta.has(k),
      delete: (k: string) => meta.delete(k),
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    parseData: async ({ data }: { id: string; data: Record<string, unknown> }) => data,
    generateDigest: (d: unknown) => JSON.stringify(d).length.toString(),
    collection: 'units',
  } as unknown as LoaderContext;
  return { ctx, rows, meta };
}

describe('propcoreUnits', () => {
  it('stores every unit by id with a digest and stamps last_synced_at', async () => {
    const { ctx, rows, meta } = fakeContext();
    await propcoreUnits({ site: 'https://s.example', key: 'k', client: fakeClient() }).load(ctx);
    expect([...rows.keys()]).toEqual(['u1', 'u2']);
    expect(rows.get('u1')?.data).toMatchObject({ unit_number: '1' });
    expect(rows.get('u1')?.digest).toBeTruthy();
    expect(meta.get('last_synced_at')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('filters by project_id client-side', async () => {
    const { ctx, rows } = fakeContext();
    await propcoreUnits({
      site: 'https://s.example',
      key: 'k',
      client: fakeClient(),
      project_id: 'p2',
    }).load(ctx);
    expect([...rows.keys()]).toEqual(['u2']);
  });

  it('replaces the previous sync (a unit that disappeared is gone)', async () => {
    const { ctx, rows } = fakeContext();
    rows.set('stale', { id: 'stale', data: {} });
    await propcoreUnits({ site: 'https://s.example', key: 'k', client: fakeClient() }).load(ctx);
    expect(rows.has('stale')).toBe(false);
  });
});

describe('propcoreProjects', () => {
  it('is named and stores projects', async () => {
    const { ctx, rows } = fakeContext();
    const loader = propcoreProjects({ site: 'https://s.example', key: 'k', client: fakeClient() });
    expect(loader.name).toBe('propcore-projects');
    await loader.load(ctx);
    expect(rows.get('p2')?.data).toMatchObject({ name: 'Marina' });
  });
});
