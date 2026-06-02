# OIDC Client Guide

Use this guide when configuring product OIDC clients in FlareAuth. This is
separate from Restish Management API automation through the system-managed
`flareauth-cli` client.

## Shared OIDC Metadata

Given a FlareAuth deployment origin:

```text
AUTH_ORIGIN=https://auth.example.com
```

Use this issuer:

```text
https://auth.example.com/api/auth
```

Use discovery instead of hard-coding endpoints whenever the client library
supports it:

```text
https://auth.example.com/api/auth/.well-known/openid-configuration
```

Common scopes:

```text
openid profile email
```

Add `offline_access` only when the client needs refresh tokens.

Management scopes are reserved for the system CLI client and are not accepted on
ordinary product clients.

## Client Type Matrix

| Client type | Use for | Secret | Typical grants |
| --- | --- | --- | --- |
| `public_spa` | Browser apps that cannot hold secrets | No | `authorization_code`, `refresh_token` |
| `public_native` | Mobile, desktop, CLI, runner, daemon clients | No | `authorization_code`, `refresh_token`, device-code grant |
| `confidential_web` | Server-side web apps and backends that can hold secrets | Yes | `authorization_code`, `refresh_token`, `client_credentials` when needed |

All authorization-code clients should use PKCE where their OIDC library
supports it. Public clients use `tokenEndpointAuthMethod: none`; confidential
clients use a client secret.

## Creating Clients With Restish

Use the Restish command reference to authorize and sync a `PROFILE_NAME` before
running these examples. Distinguish the FlareAuth deployment origin from the
consuming product origin. `AUTH_ORIGIN` is where the Management API lives;
`APP_ORIGIN` is the product application's origin used in OIDC redirect URIs.

Create a public SPA application:

```bash
restish PROFILE_NAME create-application \
  -H "Content-Type: application/json" \
  -o json <<'JSON'
{
  "name": "Customer Portal",
  "slug": "customer-portal",
  "clientType": "public_spa",
  "redirectUris": ["https://APP_ORIGIN/oidc/callback"],
  "postLogoutRedirectUris": ["https://APP_ORIGIN/signed-out"],
  "corsOrigins": ["https://APP_ORIGIN"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
JSON
```

Create a public native authorization-code application:

```bash
restish PROFILE_NAME create-application \
  -H "Content-Type: application/json" \
  -o json <<'JSON'
{
  "name": "Desktop App",
  "slug": "desktop-app",
  "clientType": "public_native",
  "redirectUris": ["com.example.desktop:/callback", "http://127.0.0.1:8484/callback"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
JSON
```

Create a public native device-login application:

```bash
restish PROFILE_NAME create-application \
  -H "Content-Type: application/json" \
  -o json <<'JSON'
{
  "name": "Runner CLI",
  "slug": "runner-cli",
  "clientType": "public_native",
  "redirectUris": ["com.example.runner:/callback"],
  "allowedGrantTypes": ["urn:ietf:params:oauth:grant-type:device_code"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
JSON
```

Create a confidential web application:

```bash
restish PROFILE_NAME create-application \
  -H "Content-Type: application/json" \
  -o json <<'JSON'
{
  "name": "Admin Backend",
  "slug": "admin-backend",
  "clientType": "confidential_web",
  "redirectUris": ["https://ADMIN_ORIGIN/oidc/callback"],
  "postLogoutRedirectUris": ["https://ADMIN_ORIGIN/signed-out"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
JSON
```

## Public SPA

Use `public_spa` for browser-only products.

Create request:

```json
{
  "name": "Customer Portal",
  "slug": "customer-portal",
  "clientType": "public_spa",
  "redirectUris": ["https://app.example.com/oidc/callback"],
  "postLogoutRedirectUris": ["https://app.example.com/signed-out"],
  "corsOrigins": ["https://app.example.com"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
```

Notes:

- Do not configure `client_credentials`.
- Do not configure the device-code grant.
- Use authorization code with PKCE through the OIDC client library.

## Public Native

Use `public_native` for mobile, desktop, CLI, runner, and daemon clients.

Authorization-code native client:

```json
{
  "name": "Desktop App",
  "slug": "desktop-app",
  "clientType": "public_native",
  "redirectUris": ["com.example.desktop:/callback", "http://127.0.0.1:8484/callback"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
```

Device-login native client:

```json
{
  "name": "Runner CLI",
  "slug": "runner-cli",
  "clientType": "public_native",
  "redirectUris": ["com.example.runner:/callback"],
  "allowedGrantTypes": ["urn:ietf:params:oauth:grant-type:device_code"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
```

Notes:

- The device-code grant is only valid for `public_native`.
- Use `offline_access` when the CLI or runner needs refresh tokens.
- Native redirect URIs may use a private-use app scheme, HTTPS, or localhost
  HTTP loopback.
- For generic OIDC client libraries, prefer discovery metadata and the library's
  device authorization support.

## Confidential Web

Use `confidential_web` for server-side applications that can protect a client
secret.

Create request:

```json
{
  "name": "Admin Backend",
  "slug": "admin-backend",
  "clientType": "confidential_web",
  "redirectUris": ["https://admin.example.com/oidc/callback"],
  "postLogoutRedirectUris": ["https://admin.example.com/signed-out"],
  "allowedGrantTypes": ["authorization_code", "refresh_token"],
  "allowedScopes": ["openid", "profile", "email", "offline_access"],
  "firstParty": true,
  "trusted": true
}
```

If the backend also needs machine-to-machine API access, include
`client_credentials` only when that backend is intended to act without a user:

```json
{
  "allowedGrantTypes": ["authorization_code", "refresh_token", "client_credentials"]
}
```

Notes:

- Store the returned `clientSecret` immediately. It is shown only once.
- Do not configure the device-code grant for confidential web clients.
- Use client secret authentication at the token endpoint.

## Device Authorization Flow

The OIDC discovery document advertises the device authorization endpoint and
the device-code grant when supported:

```text
device_authorization_endpoint: AUTH_ORIGIN/api/auth/device/code
token_endpoint: AUTH_ORIGIN/api/auth/oauth2/token
grant_type: urn:ietf:params:oauth:grant-type:device_code
```

Device flow:

1. Request a device code from `/api/auth/device/code` with `client_id` and
   scopes such as `openid profile email offline_access`.
2. Show `user_code` and `verification_uri` to the user.
3. The user opens `/device`, signs in, and approves or denies the request.
4. Poll `/api/auth/oauth2/token` with the device-code grant.
5. Handle RFC 8628 polling errors: `authorization_pending`, `slow_down`,
   `access_denied`, and `expired_token`.
6. On success, consume the OAuth/OIDC token response. `openid` returns an
   `id_token`; `offline_access` returns a `refresh_token`.

Device-code request:

```bash
curl -sS -X POST "$AUTH_ORIGIN/api/auth/device/code" \
  -H "content-type: application/json" \
  --data '{"client_id":"CLIENT_ID","scope":"openid profile email offline_access"}'
```

Token polling request:

```bash
curl -sS -X POST "$AUTH_ORIGIN/api/auth/oauth2/token" \
  -H "content-type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
  --data-urlencode "client_id=CLIENT_ID" \
  --data-urlencode "device_code=DEVICE_CODE"
```

## Temporary BetterAuth Patch

FlareAuth currently carries a temporary pnpm patch for
`@better-auth/oauth-provider` to provide OAuth Provider device-code token
exchange. Track removal through the FlareAuth issue that references the
upstream BetterAuth oauth-provider conformance issue. Do not remove the patch
until upstream BetterAuth ships equivalent device-code token endpoint and
discovery behavior and FlareAuth CI passes without the patch.
