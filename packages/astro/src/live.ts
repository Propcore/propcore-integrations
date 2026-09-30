import {
  PropcoreError,
  PropcoreNotFoundError,
  type PublicProject,
  type PublicStackingBuilding,
  type PublicUnitCard,
} from '@propcore/client';
import type { LiveLoader } from 'astro/loaders';
import { type PropcoreOptions, resolveClient } from './options.js';

export class PropcoreLiveError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'PropcoreLiveError';
    this.status = status;
  }
}

function toLiveError(e: unknown): PropcoreLiveError {
  if (e instanceof PropcoreError) return new PropcoreLiveError(e.message, e.status);
  return new PropcoreLiveError(e instanceof Error ? e.message : String(e), 0);
}

type IdFilter = { id: string };
type UnitFilter = { project_id?: string };

export function propcoreLiveUnits(
  o: PropcoreOptions,
): LiveLoader<PublicUnitCard, IdFilter, UnitFilter, PropcoreLiveError> {
  const client = () => resolveClient(o);
  return {
    name: 'propcore-live-units',
    loadCollection: async ({ filter }) => {
      try {
        let units = await client().units.list();
        if (filter?.project_id) units = units.filter((u) => u.project_id === filter.project_id);
        const lastModified = new Date();
        return {
          entries: units.map((u) => ({ id: u.id, data: u, cacheHint: { lastModified } })),
          cacheHint: { lastModified },
        };
      } catch (e) {
        return { error: toLiveError(e) };
      }
    },
    loadEntry: async ({ filter }) => {
      try {
        const unit = await client().units.get(filter.id);
        return { id: unit.id, data: unit, cacheHint: { lastModified: new Date() } };
      } catch (e) {
        if (e instanceof PropcoreNotFoundError) return undefined;
        return { error: toLiveError(e) };
      }
    },
  };
}

export function propcoreLiveProjects(
  o: PropcoreOptions,
): LiveLoader<PublicProject, IdFilter, Record<string, never>, PropcoreLiveError> {
  const client = () => resolveClient(o);
  return {
    name: 'propcore-live-projects',
    loadCollection: async () => {
      try {
        const projects = await client().projects.list();
        const lastModified = new Date();
        return {
          entries: projects.map((p) => ({ id: p.id, data: p, cacheHint: { lastModified } })),
          cacheHint: { lastModified },
        };
      } catch (e) {
        return { error: toLiveError(e) };
      }
    },
    loadEntry: async ({ filter }) => {
      try {
        const project = await client().projects.get(filter.id);
        return { id: project.id, data: project, cacheHint: { lastModified: new Date() } };
      } catch (e) {
        if (e instanceof PropcoreNotFoundError) return undefined;
        return { error: toLiveError(e) };
      }
    },
  };
}

/** The stacking plan (floors × units with live status and price) for one project. Call it from a server-rendered page. */
export function propcoreStacking(
  o: PropcoreOptions,
  projectId: string,
): Promise<PublicStackingBuilding[]> {
  return resolveClient(o).projects.stacking(projectId);
}
