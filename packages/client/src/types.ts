import type { components } from './types.gen.js';

type S = components['schemas'];

export type PublicProject = S['PublicProject'];
export type PublicProjectDetail = S['PublicProjectDetail'];
export type PublicUnitCard = S['PublicUnitCard'];
export type PublicUnitDetail = S['PublicUnitDetail'];
export type PublicListingCard = S['PublicListingCard'];
export type PublicListingDetail = S['PublicListingDetail'];
export type PublicPromotion = S['PublicPromotion'];
export type PublicStackingBuilding = S['PublicStackingBuilding'];
export type PublicStackingFloor = S['PublicStackingFloor'];
export type PublicStackingCell = S['PublicStackingCell'];
export type PublicViewResults = S['PublicViewResults'];
export type PublicPrice = S['PublicPrice'];
export type PublicStatusBadge = S['PublicStatusBadge'];

/** manifest.json is served without a response schema; these are the fields a client reads. */
export interface Manifest {
  schema_version: number;
  name: string;
  prompt: string;
  audience: string;
  languages: string[];
  base_url: string;
  views: Array<{ key: string; name: string; entity: 'unit' | 'listing'; results_url: string }>;
  [key: string]: unknown;
}
