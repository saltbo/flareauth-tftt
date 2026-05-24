# Upgrades

FlareAuth is distributed as a template repository. Deploy Button creates a
deployment repository in the operator's GitHub or GitLab account. Keep those two
repositories separate:

- upstream repository: generic FlareAuth source code, migrations, docs, and
  default Wrangler bindings
- deployment repository: one product auth realm, instance-specific domain,
  sender, Cloudflare resource IDs, and secrets

Do not put production instance values such as `id.example.com`,
`noreply@example.com`, D1 database IDs, or custom domain routes back into the
upstream repository.

## Deployment Repository Setup

After Deploy Button creates the deployment repository, add the upstream remote:

```bash
git remote add upstream https://github.com/saltbo/flareauth.git
git fetch upstream --tags
```

Keep instance configuration in the deployment repository:

- `BETTER_AUTH_URL`
- `TRUSTED_ORIGINS`
- `EMAIL_FROM`
- `[[send_email]].allowed_sender_addresses`
- `[[routes]]` or Cloudflare Dashboard custom domain settings
- generated D1, R2, Queue, and Worker names or IDs

Commit those instance settings in the deployment repository only.

## Upgrade From Upstream

Prefer tagged releases for production upgrades:

```bash
git fetch upstream --tags
git merge v1.0.3
npm ci
npm run typecheck
npm run lint
npm test
npm run deploy
```

For fast-moving internal deployments, merge `upstream/main` after checking CI:

```bash
git fetch upstream
git merge upstream/main
npm ci
npm run typecheck
npm run lint
npm test
npm run deploy
```

The deploy script applies D1 migrations through the `DB` binding before
publishing the Worker:

```bash
wrangler d1 migrations apply DB --remote
vite build
wrangler deploy
```

Using the binding name keeps upgrades compatible with Deploy Button generated
database names.

## Conflict Rules

Upgrade conflicts usually happen in `wrangler.toml`, `wrangler.preview.toml`,
or `package.json`.

- Keep deployment repository values for domains, senders, resource IDs, and
  custom routes.
- Keep upstream changes to code, migrations, shared schemas, scripts, and
  generic binding shape.
- Keep the upstream `deploy` script unless the deployment repository has a
  documented reason to override it.

If a release adds a new binding or environment variable, update the deployment
repository's Wrangler config and Cloudflare Dashboard settings before deploying.

## Release Notes Checklist

Every upstream release should state:

- whether D1 migrations are included
- whether new bindings, secrets, or environment variables are required
- whether any instance config must be changed manually
- whether the release is safe to roll back after migrations
- the recommended smoke tests after deploy

## Smoke Tests

After upgrade, verify:

```bash
curl https://AUTH_ORIGIN/api/configz
curl https://AUTH_ORIGIN/api/auth/.well-known/openid-configuration
curl https://AUTH_ORIGIN/api/management/openapi.json
```

Confirm that the issuer in both config responses matches the deployment origin.
