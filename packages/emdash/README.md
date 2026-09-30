# Propcore catalog for EmDash

Your Propcore projects, units and live availability, inside an EmDash site. Install from the EmDash registry, enter your Propcore site slug and source key, and your pages can read the catalog from three routes. `projects` returns up to 100 projects. `units` returns 100 units per page; pass `cursor=<value from the previous response>` for the next page. `availability` makes one live request to Propcore per call and works only for projects that have been synced. The sync reads the whole catalog in one request; it is tested with 119 units, and larger catalogs are planned.

## Routes

    GET /_emdash/api/plugins/propcore/projects
    GET /_emdash/api/plugins/propcore/units?project=<project_id>
    GET /_emdash/api/plugins/propcore/availability?project=<project_id>   (live)

Responses are `{ "success": true, "data": ... }`. Fields are exactly what Propcore returns (snake_case).

## Installation

1. In Propcore Admin, go to Storefronts, then New, then **AI Source**. Pick the Views to expose, create it, and copy the site slug and the source key from the drawer. The slug is the part before `.propcore.page`. A site under a workspace subdomain has a dotted slug, for example `astra-demo.demo` for `astra-demo.demo.propcore.page`.
2. In EmDash admin, go to Plugins, then Registry. Install **Propcore catalog** and approve the capability (network access to `*.propcore.page`).
3. Open **Propcore** in the admin sidebar, enter the slug and the key, Save, then **Sync now**. The plugin syncs every hour after that.

## FAQ

**Is the key exposed?** No. It is stored encrypted, sent only to your Propcore site, and never returned by a route.

**A unit disappeared from Propcore but is still on my site.** The hourly sync adds and updates units. Units removed in Propcore are not deleted from the site's cache yet; this is planned.

**Which Propcore plan?** Any workspace with storefronts.

**Does "Sync now" differ from the hourly sync?** No, it runs the same sync immediately.

## Troubleshooting

**Save fails, or the key is not stored.** The site needs the `EMDASH_ENCRYPTION_KEY` environment variable (format `emdash_enc_v1_...`) to store secret settings. Set it in the site's environment. With `astro dev`, a `.env` file is not loaded into the process, so export it first: `set -a; . ./.env; set +a; pnpm dev`.

**The sandboxed plugin does not start.** Sandboxed plugins run on the `workerd` package. With pnpm, allow its build script (`allowBuilds: { workerd: true }`) and install it.

**A local `pnpm add file:` install is out of date.** `file:` copies the plugin instead of linking it. Add it again after each build.

**Status shows `401 ...`.** The source key was rotated or revoked. Paste the new key and Save.

**Which slug do I enter?** The part before `.propcore.page`, for example `astra-demo.demo`. A pasted address is shortened for you.
