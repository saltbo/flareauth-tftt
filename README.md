# FlareAuth

[![License](https://img.shields.io/github/license/saltbo/flareauth.svg)](LICENSE)

FlareAuth is a deployable identity platform for products that need hosted
sign-in, account management, administration, and a standard OIDC provider.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/saltbo/flareauth)

## What It Is

FlareAuth gives a product team its own auth realm: one user pool, one issuer, one
admin console, and one hosted account center. Multiple applications can share
the same realm when they should share accounts and administrators.

For products that need separate users, administrators, issuer URLs, or sign-in
policy, deploy another FlareAuth instance.

## Highlights

- Hosted sign-in, sign-up, password recovery, and OAuth consent.
- Account center for profile, credentials, sessions, MFA, passkeys, and linked
  accounts.
- Admin console for applications, users, connectors, security policy, branding,
  organizations, roles, API resources, webhooks, and deployment readiness.
- Standard OIDC integration for product applications.
- Public Management API with generated OpenAPI contract.
- Agent-operable administration through an installable FlareAuth skill.
- Cloudflare Deploy Button setup for low-cost per-product deployments.

## Core Capabilities

### Hosted Auth

Use FlareAuth as the identity provider for your product applications. Product
apps integrate through standard OIDC discovery, authorization code with PKCE,
token exchange, and callback handling.

### Account Center

Users can manage their profile, password, MFA, passkeys, active sessions, linked
accounts, and authorized applications from the hosted account center.

### Admin Console

Administrators can configure product applications, login methods, external
identity connectors, branding, security requirements, organizations, roles,
API resources, webhooks, and deployment health.

### Management API

Every admin capability is available through the Management API. The OpenAPI
contract is served by each deployment at:

```text
/api/management/openapi.json
```

## Deploy

Use the Deploy to Cloudflare button for each product auth realm:

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/saltbo/flareauth)

After deployment:

1. Open the deployed URL.
2. Complete first-admin onboarding.
3. Configure sign-in methods and product applications in the admin console.
4. Point product applications at the deployment's OIDC discovery URL.

For upgrade and operational details, see:

- [Cloudflare deployment](docs/deploy/cloudflare.md)
- [Deployment upgrades](docs/deploy/upgrades.md)
- [Fresh deployment setup](docs/deploy/setup.md)
- [Tenancy model](docs/architecture/tenancy.md)

## Use From An App

Register an application in FlareAuth, configure its redirect URI, then use the
deployment's OIDC discovery endpoint:

```text
/api/auth/.well-known/openid-configuration
```

Public browser and native clients should use authorization code with PKCE.
Server-side confidential clients should authenticate at the token endpoint using
the client credentials shown in the FlareAuth application record.

Product applications do not need to call the Management API for normal user
login. The Management API is for administration and automation.

## Use From Agents

Install the skill:

```bash
npx skills install saltbo/flareauth
```

Then tell your agent what to configure:

```text
Use FlareAuth to add a complete user system to this project.
```

The agent will ask for the FlareAuth deployment and application details it needs.

## Documentation

- [Management API](docs/api/management.md)
- [Product acceptance map](docs/product/product-acceptance.md)
- [Review environment acceptance](docs/deploy/acceptance.md)
- [Auth provider architecture](docs/architecture/auth-provider.md)
