import type { PluginContext, RouteEntry } from 'emdash/plugin';
import { readSettings, SLUG, siteUrl } from './settings.js';
import { runSync, STATE_KEY, SYNC_SCHEDULE, SYNC_TASK, type SyncState } from './sync.js';

type Interaction =
  | { type: 'page_load'; page: string }
  | { type: 'block_action'; action_id: string; block_id?: string; value?: unknown }
  | { type: 'form_submit'; action_id: string; block_id?: string; values: Record<string, unknown> };

async function render(ctx: PluginContext, notice?: string) {
  const siteSlug = (await ctx.settings.get<string>('siteSlug')) ?? '';
  const hasKey = Boolean(await ctx.settings.get<string>('apiKey'));
  const state = await ctx.kv.get<SyncState>(STATE_KEY);
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
      const slug = typeof i.values.siteSlug === 'string' ? i.values.siteSlug.trim() : '';
      if (slug && !SLUG.test(slug)) {
        return render(
          ctx,
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
      return { ...(await render(ctx)), toast: { message: 'Settings saved', type: 'success' } };
    }
    if (i.type === 'block_action' && i.action_id === 'sync_now') {
      const s = await runSync(ctx);
      return render(
        ctx,
        s.error ? `Sync failed: ${s.error}` : `Synced ${s.projects} projects and ${s.units} units.`,
      );
    }
    return render(ctx);
  },
};
