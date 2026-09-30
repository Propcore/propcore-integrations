import { defineCollection } from 'astro:content';
import { PROPCORE_KEY, PROPCORE_SITE } from 'astro:env/server';
import { propcoreProjects, propcoreUnits } from '@propcore/astro';

const propcore = { site: PROPCORE_SITE, key: PROPCORE_KEY };

export const collections = {
  projects: defineCollection({ loader: propcoreProjects(propcore) }),
  units: defineCollection({ loader: propcoreUnits(propcore) }),
};
