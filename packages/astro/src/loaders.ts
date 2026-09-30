import type {
  PublicListingCard,
  PublicProject,
  PublicPromotion,
  PublicUnitCard,
} from '@propcore/client';
import type { Loader, LoaderContext } from 'astro/loaders';
import { type PropcoreOptions, resolveClient } from './options.js';

type Row = { id: string } & Record<string, unknown>;

// One sync = the full scoped set: the API returns everything the source's Views expose, so the
// store is replaced, not merged — a unit that left the Views leaves the site.
async function syncAll(ctx: LoaderContext, rows: Row[]): Promise<void> {
  ctx.store.clear();
  for (const row of rows) {
    const data = await ctx.parseData({ id: row.id, data: row });
    ctx.store.set({ id: row.id, data, digest: ctx.generateDigest(data) });
  }
  ctx.meta.set('last_synced_at', new Date().toISOString());
  ctx.logger.info(`propcore: ${rows.length} ${ctx.collection} synced`);
}

export function propcoreProjects(o: PropcoreOptions): Loader {
  return {
    name: 'propcore-projects',
    load: async (ctx) => syncAll(ctx, (await resolveClient(o).projects.list()) as Row[]),
  };
}

export function propcoreUnits(o: PropcoreOptions & { project_id?: string }): Loader {
  return {
    name: 'propcore-units',
    load: async (ctx) => {
      let units: PublicUnitCard[] = await resolveClient(o).units.list();
      if (o.project_id) units = units.filter((u) => u.project_id === o.project_id);
      await syncAll(ctx, units as Row[]);
    },
  };
}

export function propcoreListings(o: PropcoreOptions): Loader {
  return {
    name: 'propcore-listings',
    load: async (ctx) =>
      syncAll(ctx, (await resolveClient(o).listings.list()) as PublicListingCard[] as Row[]),
  };
}

export function propcorePromotions(o: PropcoreOptions): Loader {
  return {
    name: 'propcore-promotions',
    load: async (ctx) =>
      syncAll(ctx, (await resolveClient(o).promotions.list()) as PublicPromotion[] as Row[]),
  };
}

export type { PublicListingCard, PublicProject, PublicPromotion, PublicUnitCard };
