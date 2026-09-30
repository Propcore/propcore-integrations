import type { PluginContext, RouteEntry } from 'emdash/plugin';
import { normalizeSlug, readSettings, SLUG, siteUrl } from './settings.js';
import { runSync, STATE_KEY, SYNC_SCHEDULE, SYNC_TASK, type SyncState } from './sync.js';

type Interaction =
  | { type: 'page_load'; page: string }
  | { type: 'block_action'; action_id: string; block_id?: string; value?: unknown }
  | { type: 'form_submit'; action_id: string; block_id?: string; values: Record<string, unknown> };

// Host calls per path (the Cloudflare sandbox allows ten per invocation; each ctx.* call counts):
//   page_load: settings.get x2 + kv.get = 3
//   Save:      settings.set x2 + readSettings x2 + cron.schedule + render (settings x2 + kv.get) = 8
//   Sync now:  readSettings x2 + runSync (http x2, putMany x2, kv.set) = 7; render reuses the
//              settings and the returned state, so it adds none. Failure paths are 7 or fewer.
interface View {
  siteSlug: string;
  hasKey: boolean;
  state: SyncState | null | undefined;
}

async function load(ctx: PluginContext): Promise<View> {
  const siteSlug = (await ctx.settings.get<string>('siteSlug')) ?? '';
  const hasKey = Boolean(await ctx.settings.get<string>('apiKey'));
  return { siteSlug, hasKey, state: await ctx.kv.get<SyncState>(STATE_KEY) };
}

function render(view: View, notice?: string) {
  const { siteSlug, hasKey, state } = view;
  const status = !state
    ? 'Not synced yet.'
    : state.error
      ? `Last attempt ${state.last_sync_at}: ${state.error}`
      : `Last sync ${state.last_sync_at}: ${state.projects} projects, ${state.units} units.`;
  const base = '/_emdash/api/plugins/propcore';
  return {
    blocks: [
      { type: 'header', text: 'Propcore catalog' },
      ...(notice ? [{ type: 'section', text: notice }] : []),
      {
        type: 'form',
        block_id: 'settings',
        fields: [
          {
            type: 'text_input',
            action_id: 'siteSlug',
            label: 'Propcore site slug',
            initial_value: siteSlug,
            placeholder: 'skyline',
          },
          { type: 'secret_input', action_id: 'apiKey', label: 'Source key', has_value: hasKey },
        ],
        submit: { label: 'Save', action_id: 'save' },
      },
      { type: 'section', text: status },
      {
        type: 'actions',
        elements: [{ type: 'button', action_id: 'sync_now', label: 'Sync now', style: 'primary' }],
      },
      // Section text renders as one plain paragraph (newlines collapse), so the
      // site and the routes go into a fields block: one label/value pair each.
      {
        type: 'fields',
        fields: [
          { label: 'Site', value: siteSlug ? siteUrl(siteSlug) : '-' },
          { label: 'Projects route', value: `${base}/projects` },
          { label: 'Units route', value: `${base}/units?project=<id>` },
          { label: 'Availability route', value: `${base}/availability?project=<id>` },
        ],
      },
    ],
  };
}

export const admin: RouteEntry = {
  handler: async (routeCtx, ctx: PluginContext) => {
    const i = routeCtx.input as Interaction;
    if (i.type === 'form_submit' && i.action_id === 'save') {
      const slug = typeof i.values.siteSlug === 'string' ? normalizeSlug(i.values.siteSlug) : '';
      if (slug && (!SLUG.test(slug) || slug.length > 80)) {
        return render(
          await load(ctx),
          'The site slug may contain only lowercase letters, digits, dots and dashes.',
        );
      }
      if (slug) await ctx.settings.set('siteSlug', slug);
      if (typeof i.values.apiKey === 'string' && i.values.apiKey) {
        await ctx.settings.set('apiKey', i.values.apiKey);
      }
      if (ctx.cron && (await readSettings(ctx))) {
        await ctx.cron.schedule(SYNC_TASK, { schedule: SYNC_SCHEDULE });
      }
      return { ...render(await load(ctx)), toast: { message: 'Settings saved', type: 'success' } };
    }
    if (i.type === 'block_action' && i.action_id === 'sync_now') {
      const settings = await readSettings(ctx);
      const s = await runSync(ctx, settings);
      return render(
        {
          siteSlug: settings?.siteSlug ?? (await ctx.settings.get<string>('siteSlug')) ?? '',
          hasKey: Boolean(settings),
          state: s,
        },
        s.error ? `Sync failed: ${s.error}` : `Synced ${s.projects} projects and ${s.units} units.`,
      );
    }
    return render(await load(ctx));
  },
};
