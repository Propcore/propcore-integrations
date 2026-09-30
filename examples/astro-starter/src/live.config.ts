import { defineLiveCollection } from 'astro:content';
import { propcoreLiveUnits } from '@propcore/astro';

export const collections = {
  availability: defineLiveCollection({
    loader: propcoreLiveUnits({
      site: import.meta.env.PROPCORE_SITE,
      key: import.meta.env.PROPCORE_KEY,
    }),
  }),
};
