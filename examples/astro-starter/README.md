# Astro starter for a Propcore catalog

A small real estate site: projects, a unit grid with a rooms filter, unit pages, and a live
availability grid per project. Clone it, set two variables, deploy.

    cp .env.example .env     # PROPCORE_SITE + PROPCORE_KEY from Propcore Admin → Storefronts → AI Source
    pnpm install
    pnpm dev

Inside this repo, run `pnpm install && pnpm build` at the repo root first (the starter links the
packages through their `dist/`), and the starter uses `workspace:^`. When you copy it out, set
`"@propcore/astro": "^0.1.0"` (and `"@propcore/client": "^0.1.0"`) in `package.json`.

## Environment variables

`PROPCORE_SITE` and `PROPCORE_KEY` are server-only secrets, declared in `astro.config.mjs`
(`env.schema`) and read through `astro:env/server`. They are never sent to the browser and
never written into the built files.

Both variables must be present in the **build** environment, not only at runtime: `/` and
`/units/*` are built statically, so the build fetches the catalog from the API. Locally they
come from `.env`; on Cloudflare Workers set them in the build environment **and** as runtime
secrets (`wrangler secret put PROPCORE_SITE`, `wrangler secret put PROPCORE_KEY`); the live page reads them on every request.

## What is static and what is live

- `/` and `/units/*` are built once. They change when you rebuild (for example from a deploy
  hook or a schedule).
- `/projects/[id]` is server-rendered on every request: the project header, the unit list and
  the availability grid are live.

Deploys to Cloudflare Workers with static assets (`@astrojs/cloudflare`), not Pages. `wrangler.jsonc`
names the Worker; the build writes `dist/server/wrangler.json` (entry `dist/server/entry.mjs`, assets
`dist/client`) and `wrangler deploy` follows it:

    pnpm build
    wrangler deploy

Swap the adapter for Node, Vercel or Netlify if you prefer. The adapter prerenders in Node
(`prerenderEnvironment: 'node'`) so the build reads the variables from the build environment.
