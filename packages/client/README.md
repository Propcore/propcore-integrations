# @propcore/client

Typed `fetch` client for a Propcore operator's headless catalog: projects, units, listings,
promotions, live availability. Zero dependencies; runs on Node 20+, Bun, Deno and edge runtimes.

    npm install @propcore/client

```ts
import { createClient } from '@propcore/client';

const pc = createClient({
  site: 'https://skyline.propcore.page',   // the AI Source site address from Propcore Admin
  key: process.env.PROPCORE_KEY,            // its source key (pcs_…) — server-side only
});

const projects = await pc.projects.list();
const units = await pc.units.list();                    // status + effective price on every card
const stacking = await pc.projects.stacking(projects[0].id);   // floors × units, live availability
```

Where the address and key come from: Propcore Admin → Storefronts → New → **AI Source**. The
detail drawer shows the site address and the source key; **Rotate** issues a new key.

The client calls `https://<site>/ai/…`; that path is a stable contract for this major version.

Errors: `PropcoreAuthError` (401, key missing or revoked), `PropcoreNotFoundError` (404),
`PropcoreRateLimitError` (429, `retryAfter` seconds), `PropcoreError` (anything else).
Field names are exactly what the API returns (snake_case).
