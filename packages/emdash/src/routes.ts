import { type PluginContext, pluginResponse, type RouteEntry } from 'emdash/plugin';
import { clientFor, readSettings } from './settings.js';

type Input = Record<string, unknown> | undefined;
const str = (input: Input, key: string): string | null => {
  const v = input?.[key];
  return typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : null;
};

// Routes use `response: 'raw'` because that is the only way a sandboxed handler can choose an HTTP
// status. The body keeps EmDash's `{ success, data }` envelope so clients see one shape.
// Storage cursors are base64 of {orderValue,id}, longer than a plain identifier.
const cursorOf = (input: Input): string | null => {
  const v = input?.cursor;
  return typeof v === 'string' && v.length > 0 && v.length <= 1024 ? v : null;
};

const reply = (status: number, body: unknown) =>
  pluginResponse({
    status,
    headers: { 'content-type': 'application/json' },
    body: { kind: 'text', value: JSON.stringify(body) },
  });
const ok = (data: unknown) => reply(200, { success: true, data });
const fail = (status: number, code: string, message: string) =>
  reply(status, { success: false, error: { code, message } });
const badRequest = (message: string) => fail(400, 'BAD_REQUEST', message);
const serverError = (message: string) => fail(500, 'SERVER_ERROR', message);
const badGateway = (message: string) => fail(502, 'UPSTREAM_ERROR', message);

export const projects: RouteEntry = {
  public: true,
  methods: ['GET'],
  response: 'raw',
  cacheControl: 'public, max-age=60',
  handler: async (_routeCtx, ctx: PluginContext) => {
    if (!ctx.storage.projects) return serverError('storage unavailable');
    const r = await ctx.storage.projects.query({ orderBy: { updated_at: 'desc' }, limit: 100 });
    return ok({ items: r.items.map((i) => i.data) });
  },
};

export const units: RouteEntry = {
  public: true,
  methods: ['GET'],
  response: 'raw',
  cacheControl: 'public, max-age=60',
  handler: async (routeCtx, ctx: PluginContext) => {
    const project = str(routeCtx.input as Input, 'project');
    if (!project) return badRequest('project is required');
    if (!ctx.storage.units) return serverError('storage unavailable');
    const cursor = cursorOf(routeCtx.input as Input);
    try {
      const r = await ctx.storage.units.query({
        where: { project_id: project },
        orderBy: { unit_number: 'asc' },
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      return ok({ items: r.items.map((i) => i.data), cursor: r.cursor ?? null });
    } catch (e) {
      if (e instanceof Error && e.name === 'InvalidCursorError')
        return badRequest('invalid cursor');
      throw e;
    }
  },
};

export const availability: RouteEntry = {
  public: true,
  methods: ['GET'],
  response: 'raw',
  cacheControl: 'public, max-age=30',
  handler: async (routeCtx, ctx: PluginContext) => {
    const project = str(routeCtx.input as Input, 'project');
    if (!project) return badRequest('project is required');
    const settings = await readSettings(ctx);
    if (!settings) return badRequest('Propcore settings are missing');
    try {
      const buildings = await clientFor(ctx, settings).projects.stacking(project);
      return ok({ buildings });
    } catch (e) {
      ctx.log.warn('propcore availability failed', {
        message: e instanceof Error ? e.message : String(e),
      });
      return badGateway('Catalog unavailable');
    }
  },
};
