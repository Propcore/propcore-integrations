# Astro starter for a Propcore catalog

A small real estate site: projects, a unit grid with a rooms filter, unit pages, and a live
availability grid per project. Clone it, set two variables, deploy.

    cp .env.example .env     # PROPCORE_SITE + PROPCORE_KEY from Propcore Admin → Storefronts → AI Source
    pnpm install
    pnpm dev

Pages under `/units/…` and `/` are built statically; `/projects/[id]` is server-rendered so the
availability grid is live. Deploys to Cloudflare Pages as is (`@astrojs/cloudflare`); swap the
adapter for Node, Vercel or Netlify if you prefer.
