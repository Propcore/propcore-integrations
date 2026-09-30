import { defineLiveCollection } from 'astro:content';
import { PROPCORE_KEY, PROPCORE_SITE } from 'astro:env/server';
import { propcoreLiveProjects, propcoreLiveUnits } from '@propcore/astro';

const propcore = { site: PROPCORE_SITE, key: PROPCORE_KEY };

export const collections = {
  availability: defineLiveCollection({ loader: propcoreLiveUnits(propcore) }),
  liveProjects: defineLiveCollection({ loader: propcoreLiveProjects(propcore) }),
};
