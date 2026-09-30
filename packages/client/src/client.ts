import {
  PropcoreAuthError,
  PropcoreError,
  PropcoreNotFoundError,
  PropcoreRateLimitError,
} from './errors.js';
import type {
  Manifest,
  PublicListingCard,
  PublicListingDetail,
  PublicProject,
  PublicProjectDetail,
  PublicPromotion,
  PublicStackingBuilding,
  PublicUnitCard,
  PublicUnitDetail,
  PublicViewResults,
} from './types.js';

export interface ClientOptions {
  /** The headless site's origin, e.g. https://skyline.propcore.page */
  site: string;
  /** Source key (pcs_…). Required for every call except manifest(). Keep it server-side. */
  key?: string;
  /** Injectable fetch for sandboxes and tests. Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  userAgent?: string;
}

export interface PropcoreClient {
  readonly site: string;
  manifest(): Promise<Manifest>;
  projects: {
    list(): Promise<PublicProject[]>;
    get(id: string): Promise<PublicProjectDetail>;
    stacking(id: string): Promise<PublicStackingBuilding[]>;
  };
  units: { list(): Promise<PublicUnitCard[]>; get(id: string): Promise<PublicUnitDetail> };
  listings: { list(): Promise<PublicListingCard[]>; get(id: string): Promise<PublicListingDetail> };
  promotions: { list(): Promise<PublicPromotion[]>; get(id: string): Promise<PublicPromotion> };
  views: { results(key: string): Promise<PublicViewResults> };
}

function normaliseSite(site: string): string {
  if (!/^https?:\/\//.test(site))
    throw new Error(`site must start with http:// or https://, got "${site}"`);
  const url = new URL(site);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`site must be an origin with no path, got "${site}"`);
  }
  return url.origin;
}

async function readError(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = (await res.json()) as { message?: string; code?: string };
    return { message: body.message ?? res.statusText, ...(body.code ? { code: body.code } : {}) };
  } catch {
    return { message: res.statusText || `HTTP ${res.status}` };
  }
}

export function createClient(options: ClientOptions): PropcoreClient {
  const site = normaliseSite(options.site);
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const key = options.key;

  async function request<T>(path: string, auth: boolean): Promise<T> {
    if (auth && !key) throw new PropcoreAuthError('A source key is required for this call');
    const headers: Record<string, string> = { accept: 'application/json' };
    if (auth && key) headers.authorization = `Bearer ${key}`;
    if (options.userAgent) headers['user-agent'] = options.userAgent;
    const res = await fetchImpl(`${site}/ai${path}`, { headers });
    if (res.ok) return (await res.json()) as T;
    const { message, code } = await readError(res);
    if (res.status === 401) throw new PropcoreAuthError(message, code);
    if (res.status === 404) throw new PropcoreNotFoundError(message, code);
    if (res.status === 429) {
      const ra = res.headers.get('retry-after');
      throw new PropcoreRateLimitError(message, ra ? Number(ra) : undefined, code);
    }
    throw new PropcoreError(message, res.status, code);
  }

  const seg = (s: string) => encodeURIComponent(s);
  const items = async <T>(path: string) => (await request<{ items: T[] }>(path, true)).items;

  return {
    site,
    manifest: () => request<Manifest>('/manifest.json', false),
    projects: {
      list: () => items<PublicProject>('/projects'),
      get: (id) => request<PublicProjectDetail>(`/projects/${seg(id)}`, true),
      stacking: (id) => request<PublicStackingBuilding[]>(`/projects/${seg(id)}/stacking`, true),
    },
    units: {
      list: () => items<PublicUnitCard>('/units'),
      get: (id) => request<PublicUnitDetail>(`/units/${seg(id)}`, true),
    },
    listings: {
      list: () => items<PublicListingCard>('/listings'),
      get: (id) => request<PublicListingDetail>(`/listings/${seg(id)}`, true),
    },
    promotions: {
      list: () => items<PublicPromotion>('/promotions'),
      get: (id) => request<PublicPromotion>(`/promotions/${seg(id)}`, true),
    },
    views: {
      results: (k) => request<PublicViewResults>(`/views/${seg(k)}/results`, true),
    },
  };
}
