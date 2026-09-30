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
