import { type PropcoreClient, PropcoreNotFoundError } from '@propcore/client';
import { describe, expect, it, vi } from 'vitest';
import { PropcoreLiveError, propcoreLiveUnits, propcoreStacking } from '../src/live.js';

const units = [
  { id: 'u1', unit_number: '1', project_id: 'p1' },
  { id: 'u2', unit_number: '2', project_id: 'p2' },
];

function fakeClient(over: Partial<PropcoreClient['units']> = {}): PropcoreClient {
  return {
    site: 'https://s.example',
    units: {
      list: vi.fn(async () => units),
      get: vi.fn(
        async (id: string) =>
          units.find((u) => u.id === id) ?? Promise.reject(new PropcoreNotFoundError('no')),
      ),
      ...over,
    },
    projects: {
      list: vi.fn(),
      get: vi.fn(),
      stacking: vi.fn(async () => [{ building_id: 'b', building_name: 'B', floors: [] }]),
    },
  } as unknown as PropcoreClient;
}

describe('propcoreLiveUnits', () => {
  it('loadCollection returns entries and honours a project_id filter', async () => {
    const loader = propcoreLiveUnits({ site: 'https://s.example', key: 'k', client: fakeClient() });
    const all = await loader.loadCollection({ collection: 'u' });
    expect('entries' in all && all.entries.map((e) => e.id)).toEqual(['u1', 'u2']);
    const one = await loader.loadCollection({ collection: 'u', filter: { project_id: 'p2' } });
    expect('entries' in one && one.entries.map((e) => e.id)).toEqual(['u2']);
  });

  it('loadEntry returns the unit or undefined on 404', async () => {
    const loader = propcoreLiveUnits({ site: 'https://s.example', key: 'k', client: fakeClient() });
    const hit = await loader.loadEntry({ collection: 'u', filter: { id: 'u1' } });
    expect(hit && 'data' in hit && hit.data).toMatchObject({ unit_number: '1' });
    expect(await loader.loadEntry({ collection: 'u', filter: { id: 'nope' } })).toBeUndefined();
  });

  it('returns {error} instead of throwing on an API failure', async () => {
    const failing = fakeClient({
      list: vi.fn(async () => {
        throw new PropcoreNotFoundError('gone', 'ai_source_not_found');
      }),
    });
    const res = await propcoreLiveUnits({
      site: 'https://s.example',
      key: 'k',
      client: failing,
    }).loadCollection({ collection: 'u' });
    expect('error' in res && res.error).toBeInstanceOf(PropcoreLiveError);
    expect('error' in res && res.error.status).toBe(404);
  });
});

describe('propcoreStacking', () => {
  it('fetches the stacking plan for a project', async () => {
    expect(
      await propcoreStacking({ site: 'https://s.example', key: 'k', client: fakeClient() }, 'p1'),
    ).toEqual([{ building_id: 'b', building_name: 'B', floors: [] }]);
  });
});
