# Propcore integrations

Packages that bring a Propcore operator's live catalog — projects, units, status, price,
availability — into a website built with an external tool.

| Package | What it is |
|---|---|
| [`@propcore/client`](packages/client) | Typed `fetch` client for the headless API (`https://<site>/ai/…`) |
| [`@propcore/astro`](packages/astro) | Astro content-layer loaders (build-time and live) |
| [`examples/astro-starter`](examples/astro-starter) | A small real estate site to clone |

Live demo: https://propcore-astro-demo.xdm-inside.workers.dev — built from the starter against a Propcore demo workspace.

## How it works

In Propcore Admin the operator creates an **AI Source** storefront: picks the Views to expose and
gets a site address and a source key (`pcs_…`). Every package here takes those two values.
The key is a secret: use it only on the server (build step, SSR, CI), never in browser code.

## Development

    pnpm install && pnpm build && pnpm typecheck && pnpm test

Build comes before typecheck because the packages resolve each other through `dist/`, which does not exist in a fresh clone.

Releases use [Changesets](https://github.com/changesets/changesets): `pnpm changeset`, merge,
`pnpm release`.
