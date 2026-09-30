import { defineCollection } from 'astro:content';
import { propcoreProjects, propcoreUnits } from '@propcore/astro';

const propcore = { site: import.meta.env.PROPCORE_SITE, key: import.meta.env.PROPCORE_KEY };

export const collections = {
  projects: defineCollection({ loader: propcoreProjects(propcore) }),
  units: defineCollection({ loader: propcoreUnits(propcore) }),
};
