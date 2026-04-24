# Viva Voce AI Monorepo

This repository now uses Turborepo with PNPM workspaces.

## Apps

- `apps/web`: TanStack Start app with Supabase auth

## Commands

From the repo root:

```sh
pnpm install
pnpm dev
```

Useful variants:

```sh
pnpm dev:web
pnpm build
pnpm preview
```

## Cloudflare Deploy

The TanStack Start app in `apps/web` is configured for Cloudflare Workers via Wrangler.

Local deploy commands:

```sh
pnpm deploy:web
pnpm cf-typegen:web
```

GitHub Actions deploys on pushes to `main` using Wrangler. Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

`SUPABASE_URL` is defined in `apps/web/wrangler.jsonc` using Cloudflare `vars`, following the same pattern as `Snapdish`.

Set `SUPABASE_ANON_KEY` as a Cloudflare Worker secret before the first deploy:

```sh
cd apps/web
pnpm wrangler secret put SUPABASE_ANON_KEY
```
