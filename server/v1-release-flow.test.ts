import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ApplicationResponse } from '../shared/api/applications'
import type {
  ApiPermissionResponse,
  ApiResourceResponse,
  ApiScopeResponse,
  MemberResponse,
  OrganizationResponse,
  RoleResponse,
} from '../shared/api/authorization'
import {
  adminHeaders,
  createAuthDouble,
  createConnectorServiceDouble,
  createOnboardingRepositoryDouble,
  createSecurityRepositoryDouble,
  createUserRepositoryDouble,
  expectJson,
  getAuthorizationServiceDouble,
  resetReleaseState,
  securityPolicy,
  userHeaders,
} from './v1-release-flow.test-utils'

describe('v1.0 release product journey', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    resetReleaseState()
  })

  it('covers onboarding, OAuth, admin, account, connector, MFA/passkey, RBAC claims, and deployment boundaries', async () => {
    const onboarding = createOnboardingRepositoryDouble()
    const auth = createAuthDouble()
    const users = createUserRepositoryDouble()
    const security = createSecurityRepositoryDouble()
    const connectors = createConnectorServiceDouble()
    const { createApp } = await import('./app')
    const app = createApp(auth, {
      trustedOrigins: ['https://console.example.com'],
      onboardingRepository: onboarding,
      userRepository: users,
      securityRepository: security,
      securityPolicy: securityPolicy(),
      connectorServiceFactory: () => connectors,
    })

    const lockedAuth = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@example.com', password: 'password-1' }),
    })
    expect(lockedAuth.status).toBe(403)

    await expectJson(await app.request('/api/onboarding/status'), 200, { required: true })
    await expectJson(
      await app.request('/api/onboarding/admin-users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'password-1',
          name: 'Admin User',
          username: 'admin',
        }),
      }),
      201,
      {
        onboarding: { locked: true },
        user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' },
      },
    )

    const untrusted = await app.request('/api/health', { headers: { origin: 'https://evil.example.com' } })
    expect(untrusted.status).toBe(403)

    const client = await expectJson<ApplicationResponse & { clientSecret: string }>(
      await app.request('/api/management/applications', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          name: 'Acme Portal',
          clientType: 'confidential_web',
          redirectUris: ['https://app.example.com/callback'],
          allowedGrantTypes: ['authorization_code', 'refresh_token'],
          allowedScopes: ['openid', 'profile', 'email'],
          trusted: true,
        }),
      }),
      201,
      { clientId: 'client-1', clientSecret: 'secret-1', tokenEndpointAuthMethod: 'client_secret_basic' },
    )

    const signIn = await app.request('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: 'user-1@example.com', password: 'password-1' }),
    })
    expect(signIn.status).toBe(200)
    expect(signIn.headers.get('set-cookie')).toContain('flareauth.session=session-1')

    const authorizationUrl = `/api/auth/oauth2/authorize?client_id=${client.clientId}&redirect_uri=https://app.example.com/callback&response_type=code&scope=openid%20profile%20email&state=state-1`
    const hostedSignIn = await app.request(authorizationUrl)
    expect(hostedSignIn.status).toBe(302)
    expect(hostedSignIn.headers.get('location')).toBe('http://localhost/sign-in')

    await expectJson(
      await app.request(
        `/api/oauth/consent?client_id=${client.clientId}&redirect_uri=https://app.example.com/callback&scope=openid%20profile%20email&state=state-1`,
        { headers: userHeaders() },
      ),
      200,
      {
        application: { clientId: client.clientId, name: 'Acme Portal' },
        requestedScopes: ['openid', 'profile', 'email'],
        state: 'state-1',
      },
    )
    await expectJson(
      await app.request('/api/oauth/consent', {
        method: 'POST',
        headers: userHeaders(),
        body: JSON.stringify({ clientId: client.clientId, scopes: ['openid', 'profile', 'email'] }),
      }),
      201,
      { consent: { id: 'consent-1', scopes: ['openid', 'profile', 'email'] } },
    )

    const resource = await expectJson<ApiResourceResponse>(
      await app.request('/api/management/api-resources', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          identifier: 'contacts-api',
          name: 'Contacts API',
          audience: 'https://api.example.com/contacts',
          tokenClaimsNamespace: 'https://claims.example.com/contacts',
        }),
      }),
      201,
      { identifier: 'contacts-api', audience: 'https://api.example.com/contacts' },
    )
    const scope = await expectJson<ApiScopeResponse>(
      await app.request(`/api/management/api-resources/${resource.id}/scopes`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ value: 'contacts:read', includeInAccessToken: true }),
      }),
      201,
      { value: 'contacts:read' },
    )
    const permission = await expectJson<ApiPermissionResponse>(
      await app.request(`/api/management/api-resources/${resource.id}/permissions`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ scopeId: scope.id, key: 'contacts.read', tokenClaimValue: 'read' }),
      }),
      201,
      { key: 'contacts.read' },
    )
    const organization = await expectJson<OrganizationResponse>(
      await app.request('/api/management/organizations', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ slug: 'acme-workspace', name: 'Acme Workspace' }),
      }),
      201,
      { slug: 'acme-workspace' },
    )
    const member = await expectJson<MemberResponse>(
      await app.request(`/api/management/organizations/${organization.id}/members`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ userId: 'user-1', role: 'member' }),
      }),
      201,
      { userId: 'user-1', role: 'member' },
    )
    const role = await expectJson<RoleResponse>(
      await app.request('/api/management/roles', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          key: 'contacts-reader',
          name: 'Contacts Reader',
          resourceId: resource.id,
          organizationId: organization.id,
          tokenClaimName: 'contacts_role',
        }),
      }),
      201,
      { key: 'contacts-reader' },
    )
    expect(
      await app.request(`/api/management/roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ permissionIds: [permission.id] }),
      }),
    ).toMatchObject({ status: 204 })
    expect(
      await app.request('/api/management/roles/assignments/members', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ roleId: role.id, subjectId: member.id, tokenClaims: { tier: 'gold' } }),
      }),
    ).toMatchObject({ status: 204 })

    await expectJson(
      await app.request('/api/management/users', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ email: 'grace@example.com', password: 'password-1', displayName: 'Grace Hopper' }),
      }),
      201,
      { user: { id: 'user-2' } },
    )
    await expectJson(
      await app.request('/api/management/users/user-2', {
        method: 'PATCH',
        headers: adminHeaders(),
        body: JSON.stringify({ displayName: 'Grace H.' }),
      }),
      200,
      { user: { id: 'user-2' } },
    )
    await expectJson(
      await app.request('/api/management/users/user-2/ban', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ reason: 'security review' }),
      }),
      200,
      { user: { id: 'user-2', banned: true } },
    )
    await expectJson(
      await app.request('/api/management/users/user-2/unban', { method: 'POST', headers: adminHeaders() }),
      200,
      { user: { id: 'user-2', banned: false } },
    )
    await expectJson(
      await app.request('/api/management/users/password-reset', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ email: 'grace@example.com' }),
      }),
      200,
      { status: true },
    )

    await expectJson(
      await app.request('/api/account/profile', {
        method: 'PATCH',
        headers: userHeaders(),
        body: JSON.stringify({ displayName: 'User One', username: 'UserOne' }),
      }),
      200,
      { user: { id: 'user-1', username: 'userone' } },
    )
    await expectJson(
      await app.request('/api/account/security/mfa/totp-enrollment', {
        method: 'POST',
        headers: userHeaders(),
        body: JSON.stringify({ password: 'password-1' }),
      }),
      201,
      { mfa: { secret: 'totp-secret' } },
    )
    await expectJson(
      await app.request('/api/management/connectors', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          providerType: 'generic_oauth',
          providerId: 'okta-main',
          displayName: 'Okta',
          clientId: 'okta-client',
          clientSecret: 'secret://okta',
          authorizationEndpoint: 'https://idp.example.com/oauth2/v1/authorize',
          tokenEndpoint: 'https://idp.example.com/oauth2/v1/token',
          userInfoEndpoint: 'https://idp.example.com/oauth2/v1/userinfo',
        }),
      }),
      201,
      { providerId: 'okta-main', enabled: true },
    )

    const redirect = await app.request(`${authorizationUrl}&resource=https://api.example.com/contacts`, {
      headers: userHeaders(),
    })
    expect(redirect.status).toBe(302)
    expect(redirect.headers.get('location')).toBe('https://app.example.com/callback?code=code-1&state=state-1')
    const token = await expectJson<{ access_token: string; authorization: Record<string, unknown> }>(
      await app.request('/api/auth/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: 'code-1',
          client_id: client.clientId,
          client_secret: client.clientSecret,
          resource: 'https://api.example.com/contacts',
        }),
      }),
      200,
      {
        access_token: 'access-token-1',
        authorization: {
          roles: ['contacts-reader'],
          permissions: ['contacts.read'],
          organization_id: organization.id,
          resource: 'contacts-api',
          audience: 'https://api.example.com/contacts',
        },
      },
    )
    await expectJson(
      await app.request('/api/auth/oauth2/userinfo', { headers: { authorization: `Bearer ${token.access_token}` } }),
      200,
      { sub: 'user-1', email: 'user-1@example.com', name: 'User One' },
    )

    expect(auth.api.createUser).toHaveBeenCalled()
    expect(auth.api.adminUpdateUser).toHaveBeenCalledWith({
      body: {
        userId: 'user-2',
        data: { name: 'Grace H.' },
      },
      headers: expect.any(Headers),
    })
    expect(auth.api.banUser).toHaveBeenCalled()
    expect(auth.api.unbanUser).toHaveBeenCalled()
    expect(auth.api.requestPasswordReset).toHaveBeenCalledWith({
      body: {
        email: 'grace@example.com',
        redirectTo: undefined,
      },
      headers: expect.any(Headers),
    })
    expect(getAuthorizationServiceDouble()?.buildTokenClaims).toHaveBeenCalledWith({
      userId: 'user-1',
      applicationId: 'app-1',
      organizationId: 'org-1',
      resource: 'https://api.example.com/contacts',
      scopes: ['openid', 'profile', 'email'],
    })
    expect(users.updateProfile).toHaveBeenCalledWith('user-1', { displayName: 'User One', username: 'userone' })
    expect(auth.api.enableTwoFactor).toHaveBeenCalled()
    expect(connectors.create).toHaveBeenCalled()
  })
})
