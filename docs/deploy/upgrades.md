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
- generated D1 `database_id`, R2 bucket name, Queue name, and Worker name

Commit those instance settings in the deployment repository only.

`BETTER_AUTH_URL` and `TRUSTED_ORIGINS` are optional for a single-domain
deployment because FlareAuth can derive them from the request origin. Set them
only when the deployment needs a canonical issuer that differs from the incoming
host or when extra trusted origins are required.

## Upgrade From Upstream

## Automated Upgrade PR

The upstream repository ships `.github/workflows/update-from-upstream.yml` for
deployment repositories. The workflow is maintained in upstream so every
deployment receives the same upgrade mechanism, but its job is disabled when it
runs in `saltbo/flareauth` itself.

In a deployment repository, open **Actions > Update From FlareAuth Upstream >
Run workflow**.

- Leave `target_ref` empty to merge the latest upstream `main`.
- Set `target_ref` to a release tag such as `v1.0.3`, a branch, or a commit SHA
  to upgrade to a specific upstream version.
- Keep `upstream_repository` as `saltbo/flareauth` unless the deployment follows
  a different FlareAuth upstream fork.
- Enable `run_e2e` when the deployment repository should run Cucumber E2E before
  opening the upgrade PR.

The workflow creates or updates a PR from `flareauth-upgrade/<target>` into the
deployment repository's `main` branch after running:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
- optionally `npm run test:e2e`

Review deployment-specific files such as `wrangler.toml`,
`wrangler.preview.toml`, and `package.json` before merging the PR. Those files
belong in the deployment repository even though the workflow templates are
maintained in upstream.

## Manual Upgrade

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

Deploy Button should replace placeholder resource fields in the deployment
repository. If a deployment repository still contains
`00000000-0000-0000-0000-000000000000`, replace it with the generated D1
database ID before running CI.

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
