import type { PluginContext } from 'emdash/plugin';
import { clientFor, readSettings } from './settings.js';

export const SYNC_TASK = 'sync';
export const SYNC_SCHEDULE = '0 * * * *';
export const STATE_KEY = 'state:sync';

export interface SyncState {
  last_sync_at: string;
  projects: number;
  units: number;
  error?: string;
}

// Two HTTP calls and two putMany calls per run: the Cloudflare sandbox allows ten host calls
// per invocation, so the sync stays well inside it for a normal project site.
export async function runSync(ctx: PluginContext): Promise<SyncState> {
  const at = new Date().toISOString();
  const settings = await readSettings(ctx);
  if (!settings) {
    return record(ctx, {
      last_sync_at: at,
      projects: 0,
      units: 0,
      error: 'Propcore settings are missing: set the site slug and the source key',
    });
  }
  try {
    const { projects: projectStore, units: unitStore } = ctx.storage;
    if (!projectStore || !unitStore) throw new Error('storage collections are missing');
    const pc = clientFor(ctx, settings);
    const projects = await pc.projects.list();
    const units = await pc.units.list();
    await projectStore.putMany(projects.map((p) => ({ id: p.id, data: p })));
    await unitStore.putMany(units.map((u) => ({ id: u.id, data: u })));
    return record(ctx, { last_sync_at: at, projects: projects.length, units: units.length });
  } catch (e) {
    const message = describe(e);
    ctx.log.warn('propcore sync failed', { message });
    return record(ctx, { last_sync_at: at, projects: 0, units: 0, error: message });
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
