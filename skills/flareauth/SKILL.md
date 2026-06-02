---
name: flareauth
description: Operate a FlareAuth deployment and guide product OIDC client integration. Use this when an agent needs to inspect or change FlareAuth applications, connectors, users, roles, organizations, API resources, webhooks, security settings, branding, sign-in settings, readiness, or configure public SPA, public native, confidential web, or device-authorization OIDC clients.
---

# FlareAuth

Use this skill for two related tasks:

- Operating a FlareAuth deployment through the Management API.
- Guiding product OIDC clients that integrate with FlareAuth.

For Management API command details, read `references/restish-commands.md`.
For OIDC client type and device-login guidance, read
`references/oidc-client-guide.md`.

## Setup

First identify the deployment origin you are operating. Use the exact auth
origin from the user, deployment repository, Cloudflare Worker, or `/api/configz`
response. Do not guess a production domain from the product name.

On first use, an agent must establish the FlareAuth deployment origin before it
changes anything. `AUTH_ORIGIN` is the FlareAuth deployment origin, such as a
production custom domain or a `workers.dev` origin.

If the user did not provide `AUTH_ORIGIN`, inspect the deployment repository or
Cloudflare Worker configuration when available. If neither is available, ask for
the deployment origin before continuing.

For deployment operations, authorize a Restish profile first. The command
sequence is in `references/restish-commands.md`; use that reference rather than
reconstructing Restish commands from memory.

## Authentication

FlareAuth has a built-in public native client named `flareauth-cli` for Restish
Management API automation. It is not the product OIDC device-login client, and
system-managed applications such as `flareauth-cli` must not be modified.

Ask the user to complete browser login when Restish authorization starts. Do not
ask the user to copy or paste bearer tokens. The authorization helper suppresses
token output and lets Restish store OAuth tokens in its local auth cache.

Do not use product OIDC client credentials for Management API automation. The
Management API accepts an admin browser session or a bearer token issued to
`flareauth-cli`; non-admin users receive `403`.

If the user has already authorized this Restish profile, they can rerun the same
authorization script to refresh the local profile and cached auth.

## OIDC Client Integration

When asked how a product OIDC client should integrate with FlareAuth, which
client type to create, or how device login works, read
`references/oidc-client-guide.md`. Keep that guide as the source of truth for
public SPA, public native, confidential web, and device authorization client
configuration.

## Guardrails

- Always sync before operating a deployment you have not used recently.
- Always confirm the deployment origin and profile name before making changes.
- Prefer resource nouns and real IDs from list/get responses; do not infer IDs
  from names.
- System-managed applications such as `flareauth-cli` must not be deleted or modified.
- Asset upload endpoints use `multipart/form-data` with a single `file` field.
- Raw secrets are returned only once on creation or rotation; never expect list/detail responses to reveal secret material.
- For large changes, read current state first, apply the smallest patch, then read back the resource to verify.
