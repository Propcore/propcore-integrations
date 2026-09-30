# @propcore/astro

Astro content-layer loaders for a Propcore operator's real estate catalog: projects, units,
listings, promotions, and live availability. Astro 7+.

    npm install @propcore/astro

Set two environment variables (from Propcore Admin → Storefronts → your **AI Source**):

    PROPCORE_SITE=https://skyline.propcore.page
    PROPCORE_KEY=pcs_…

Declare them as server secrets in `astro.config.mjs`, so the key is never written into the build
or sent to the browser:

```js
// astro.config.mjs
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  env: {
    schema: {
      PROPCORE_SITE: envField.string({ context: 'server', access: 'secret' }),
      PROPCORE_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});
```

## Build-time collections (static pages)

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { PROPCORE_KEY, PROPCORE_SITE } from 'astro:env/server';
import { propcoreProjects, propcoreUnits } from '@propcore/astro';

const propcore = { site: PROPCORE_SITE, key: PROPCORE_KEY };

export const collections = {
  projects: defineCollection({ loader: propcoreProjects(propcore) }),
  units: defineCollection({ loader: propcoreUnits(propcore) }),
};
```

```astro
---
import { getCollection } from 'astro:content';
const units = await getCollection('units');
---
{units.map(({ data: u }) => <a href={`/units/${u.id}`}>{u.unit_number} · {u.status.label} · {u.price.effective} {u.price.currency}</a>)}
```

`propcoreUnits` also takes a `project_id` option to load only one project's units. Rebuild to refresh. Each loader replaces its collection with the current scoped set.

## Live collections (server-rendered pages)

```ts
// src/live.config.ts
import { defineLiveCollection } from 'astro:content';
import { PROPCORE_KEY, PROPCORE_SITE } from 'astro:env/server';
import { propcoreLiveUnits } from '@propcore/astro';

export const collections = {
  availability: defineLiveCollection({ loader: propcoreLiveUnits({ site: PROPCORE_SITE, key: PROPCORE_KEY }) }),
};
```

```astro
---
export const prerender = false;
import { getLiveCollection } from 'astro:content';
const { entries, error } = await getLiveCollection('availability', { project_id: Astro.params.id });
---
```

The `{ project_id }` filter narrows the live collection to one project. Live collections need an SSR adapter. For a floors × units grid use `propcoreStacking(options, projectId)`.

Fields are exactly what the API returns (snake_case): `unit_number`, `floor_number`, `price.effective`,
`status.state` (`available` | `unavailable`), `status.label`, `cover_url`.
A full site: [`examples/astro-starter`](../../examples/astro-starter).
