import type { PluginContext } from 'emdash/plugin';
import { clientFor, readSettings, type Settings } from './settings.js';

export const SYNC_TASK = 'sync';
export const SYNC_SCHEDULE = '0 * * * *';
export const STATE_KEY = 'state:sync';

export interface SyncState {
  last_sync_at: string;
  projects: number;
  units: number;
  error?: string;
}

// Host calls per run (the Cloudflare sandbox allows ten per invocation): settings x2 (skipped when
// the caller passes them), http x2, putMany x2, kv.set x1 = 7, or 5 with settings passed in.
export async function runSync(ctx: PluginContext, given?: Settings | null): Promise<SyncState> {
  const at = new Date().toISOString();
  const settings = given === undefined ? await readSettings(ctx) : given;
  if (!settings) {
    return record(ctx, {
      last_sync_at: at,
      projects: 0,
      units: 0,
      error: 'Propcore settings are missing: set the site slug and the source key',
    });
  }
  let projectCount = 0;
  try {
    const { projects: projectStore, units: unitStore } = ctx.storage;
    if (!projectStore || !unitStore) throw new Error('storage collections are missing');
    const pc = clientFor(ctx, settings);
    const projects = await pc.projects.list();
    const units = await pc.units.list();
    await projectStore.putMany(projects.map((p) => ({ id: p.id, data: p })));
    projectCount = projects.length;
    await unitStore.putMany(units.map((u) => ({ id: u.id, data: u })));
    return record(ctx, { last_sync_at: at, projects: projects.length, units: units.length });
  } catch (e) {
    const message = describe(e);
    return record(ctx, { last_sync_at: at, projects: projectCount, units: 0, error: message });
  }
}

async function record(ctx: PluginContext, state: SyncState): Promise<SyncState> {
  await ctx.kv.set(STATE_KEY, state);
  return state;
}

// PropcoreError carries the HTTP status; put it in the message so the admin page shows "401 ...".
function describe(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const status = (e as { status?: unknown }).status;
  return typeof status === 'number' ? `${status} ${e.message}` : e.message;
}
