# FlareAuth

Cloudflare-native identity provider built on Better Auth.

## Stack

- Cloudflare Workers and Assets
- Cloudflare D1
- Hono API
- Better Auth with OIDC provider
- React and Vite
- Drizzle ORM

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
```

Create the D1 database before the first deploy:

```bash
wrangler d1 create flareauth-db
npm run db:generate
npm run db:migrate
```

## Cloudflare Environments

The repository uses one Cloudflare Worker and two D1 databases:

- Worker `flareauth`
- Production D1 `flareauth-db`
- Staging preview D1 `flareauth-db-staging`

Deploy production manually:

```bash
npm run deploy:prod
```

Cloudflare Dashboard should own deployments for this repository.

Connect the repository in Cloudflare Dashboard and use:

- Production branch: `main`
- Build command: `npm run build`
- Production Worker: `flareauth`
- Preview deployments: enabled for pull requests and non-main branches
- Production D1 binding `DB`: `flareauth-db`
- Preview D1 binding `DB`: `flareauth-db-staging`

`npm run build` follows the same pattern as zpan: Cloudflare preview branch builds
use the preview Wrangler config, while `main` and local builds use production
config. Pull requests still run GitHub CI for typecheck, lint, tests, and build,
but deployment and preview URLs come from Cloudflare Dashboard, not GitHub Actions.
