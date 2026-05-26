import { expect, vi } from 'vitest'
import type { ApplicationResponse, CreateConsentRequest } from '../shared/api/applications'
import type {
  ApiPermissionResponse,
  ApiResourceResponse,
  ApiScopeResponse,
  AssignRoleRequest,
  MemberResponse,
  OrganizationResponse,
  RoleResponse,
} from '../shared/api/authorization'
import type { SecurityPolicy } from '../shared/api/security'
import type { UserRepository } from './modules/users/repository'

const releaseState = vi.hoisted(() => ({
  applications: null as ReturnType<typeof createApplicationServiceDouble> | null,
  authorization: null as ReturnType<typeof createAuthorizationServiceDouble> | null,
}))

vi.mock('./modules/applications/context', () => ({
  createApplicationService: () => releaseState.applications,
}))

vi.mock('./modules/authorization/context', () => ({
  createAuthorizationService: () => releaseState.authorization,
}))

export function resetReleaseState() {
  releaseState.applications = createApplicationServiceDouble()
  releaseState.authorization = createAuthorizationServiceDouble()
}

export function getAuthorizationServiceDouble() {
  return releaseState.authorization
}

export function createAuthDouble() {
  const api = {
    getOAuthServerConfig: vi.fn(),
    getOpenIdConfig: vi.fn(),
    getSession: vi.fn().mockImplementation(({ headers }: { headers: Headers }) => {
      const id = headers.get('x-user-id')
      if (!id) return null
      return {
        session: { id: 'session-1' },
        user: {
          id,
          email: `${id}@example.com`,
          name: id === 'user-1' ? 'User One' : 'Admin User',
          role: headers.get('x-user-role'),
        },
      }
    }),
    listUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
    getUser: vi.fn().mockResolvedValue({ id: 'user-2' }),
    createUser: vi.fn().mockResolvedValue({ user: { id: 'user-2' } }),
    adminUpdateUser: vi.fn().mockResolvedValue({ id: 'user-2' }),
    banUser: vi.fn().mockResolvedValue({ user: { id: 'user-2', banned: true } }),
    unbanUser: vi.fn().mockResolvedValue({ user: { id: 'user-2', banned: false } }),
    removeUser: vi.fn().mockResolvedValue({ success: true }),
    requestPasswordReset: vi.fn().mockResolvedValue({ status: true }),
    sendVerificationEmail: vi.fn().mockResolvedValue({ status: true }),
    changeEmail: vi.fn().mockResolvedValue({ status: true }),
    changePassword: vi.fn().mockResolvedValue({ status: true }),
    linkSocialAccount: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com/oauth' }),
    oAuth2LinkAccount: vi.fn().mockResolvedValue({ url: 'https://idp.example.com/oauth' }),
    unlinkAccount: vi.fn().mockResolvedValue({ success: true }),
    revokeUserSession: vi.fn().mockResolvedValue({ success: true }),
    revokeUserSessions: vi.fn().mockResolvedValue({ success: true }),
    revokeSession: vi.fn().mockResolvedValue({ success: true }),
    revokeSessions: vi.fn().mockResolvedValue({ success: true }),
    enableTwoFactor: vi.fn().mockResolvedValue({ mfa: { secret: 'totp-secret' } }),
    verifyTOTP: vi.fn().mockResolvedValue({ success: true }),
    disableTwoFactor: vi.fn().mockResolvedValue({ success: true }),
  }

  return {
    api,
    handler: async (request: Request) => {
      const url = new URL(request.url)
      if (url.pathname === '/api/auth/sign-in/email') {
        return Response.json(
          { user: { id: 'user-1', email: 'user-1@example.com' } },
          {
            headers: { 'set-cookie': 'flareauth.session=session-1; Path=/; HttpOnly' },
          },
        )
      }
      if (url.pathname === '/api/auth/oauth2/authorize') {
        if (!request.headers.get('x-user-id')) return Response.redirect(`${url.origin}/auth/sign-in`, 302)
        const redirectUri = new URL(url.searchParams.get('redirect_uri') ?? '')
        redirectUri.searchParams.set('code', 'code-1')
        redirectUri.searchParams.set('state', url.searchParams.get('state') ?? '')
        return Response.redirect(redirectUri, 302)
      }
      if (url.pathname === '/api/auth/oauth2/token') {
        const body = await request.formData()
        const claims = await releaseState.authorization?.buildTokenClaims({
          userId: 'user-1',
          applicationId: 'app-1',
          organizationId: 'org-1',
          resource: body.get('resource')?.toString(),
          scopes: ['openid', 'profile', 'email'],
        })
        return Response.json({
          access_token: 'access-token-1',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email',
          authorization: claims?.authorization,
        })
      }
      if (url.pathname === '/api/auth/oauth2/userinfo') {
        if (request.headers.get('authorization') !== 'Bearer access-token-1') {
          return Response.json({ error: 'invalid_token' }, { status: 401 })
        }
        return Response.json({ sub: 'user-1', email: 'user-1@example.com', name: 'User One' })
      }
      return new Response(null, { status: 204 })
    },
  }
}

export function createOnboardingRepositoryDouble() {
  let hasUsers = false
  return {
    hasUsers: vi.fn(async () => hasUsers),
    createBootstrapAdmin: vi.fn(async () => {
      hasUsers = true
      return { id: 'admin-1', email: 'admin@example.com', role: 'admin' }
    }),
  }
}

export function createApplicationServiceDouble() {
  let consent: { id: string; scopes: string[]; grantedAt: string } | null = null
  const application: ApplicationResponse & { clientSecret: string } = {
    id: 'app-1',
    slug: 'acme-portal',
    name: 'Acme Portal',
    description: null,
    homepageUrl: null,
    iconUrl: null,
    clientId: 'client-1',
    clientSecret: 'secret-1',
    clientType: 'confidential_web',
    public: false,
    firstParty: false,
    trusted: true,
    systemManaged: false,
    disabled: false,
    disabledReason: null,
    redirectUris: ['https://app.example.com/callback'],
    postLogoutRedirectUris: [],
    corsOrigins: [],
    customData: {},
    allowedGrantTypes: ['authorization_code', 'refresh_token'],
    allowedScopes: ['openid', 'profile', 'email'],
    requirePkce: false,
    tokenEndpointAuthMethod: 'client_secret_basic',
    oidcClaims: {
      accessToken: {
        authorization: true,
        roles: true,
        permissions: true,
      },
      idToken: {},
      userInfo: {},
    },
    secretMetadata: [
      {
        id: 'secret-1',
        version: 1,
        prefix: 'fas_secret_1',
        status: 'active',
        createdAt: now(),
        expiresAt: null,
        revokedAt: null,
      },
    ],
    oidc: {
      issuer: 'https://auth.example.com/api/auth',
      authorizationEndpoint: 'https://auth.example.com/api/auth/oauth2/authorize',
      tokenEndpoint: 'https://auth.example.com/api/auth/oauth2/token',
      jwksUri: 'https://auth.example.com/api/auth/jwks',
      userInfoEndpoint: 'https://auth.example.com/api/auth/oauth2/userinfo',
      endSessionEndpoint: 'https://auth.example.com/api/auth/oauth2/end-session',
    },
    createdAt: now(),
    updatedAt: now(),
  }

  return {
    create: vi.fn(async () => application),
    list: vi.fn(async () => ({ applications: [application], pagination: page(1) })),
    get: vi.fn(async () => application),
    loadConsentRequest: vi.fn(async (input: { scope?: string; state?: string }) => ({
      application,
      requestedScopes: input.scope?.split(' ') ?? ['openid'],
      existingConsent: consent,
      state: input.state ?? null,
    })),
    createConsent: vi.fn(async (input: Pick<CreateConsentRequest, 'clientId' | 'scopes'>) => {
      consent = { id: 'consent-1', scopes: input.scopes, grantedAt: now() }
      return consent
    }),
  }
}

export function createAuthorizationServiceDouble() {
  const resource: ApiResourceResponse = {
    id: 'res-1',
    identifier: 'contacts-api',
    name: 'Contacts API',
    audience: 'https://api.example.com/contacts',
    description: null,
    enabled: true,
    tokenClaimsNamespace: 'https://claims.example.com/contacts',
    createdAt: now(),
    updatedAt: now(),
  }
  const scope: ApiScopeResponse = {
    id: 'scope-1',
    resourceId: resource.id,
    value: 'contacts:read',
    description: null,
    required: false,
    tokenClaimName: null,
    includeInAccessToken: true,
    includeInIdToken: false,
  }
  const permission: ApiPermissionResponse = {
    id: 'perm-1',
    resourceId: resource.id,
    scopeId: scope.id,
    key: 'contacts.read',
    description: null,
    tokenClaimValue: 'read',
  }
  const organization: OrganizationResponse = {
    id: 'org-1',
    slug: 'acme-workspace',
    name: 'Acme Workspace',
    displayName: null,
    logo: null,
    disabled: false,
    disabledReason: null,
    createdAt: now(),
    updatedAt: now(),
  }
  const member: MemberResponse = {
    id: 'mem-1',
    organizationId: organization.id,
    userId: 'user-1',
    role: 'member',
    title: null,
    createdAt: now(),
    updatedAt: now(),
  }
  const role: RoleResponse = {
    id: 'role-1',
    key: 'contacts-reader',
    name: 'Contacts Reader',
    description: null,
    resourceId: resource.id,
    organizationId: organization.id,
    applicationId: null,
    system: false,
    tokenClaimName: 'contacts_role',
    tokenClaimValue: null,
    createdAt: now(),
    updatedAt: now(),
  }
  let assignment: AssignRoleRequest | null = null

  return {
    createOrganization: vi.fn(async () => organization),
    listOrganizations: vi.fn(async () => ({ organizations: [organization], pagination: page(1) })),
    addMember: vi.fn(async () => member),
    createResource: vi.fn(async () => resource),
    createScope: vi.fn(async () => scope),
    createPermission: vi.fn(async () => permission),
    createRole: vi.fn(async () => role),
    replaceRolePermissions: vi.fn(async () => undefined),
    assignMemberRole: vi.fn(async (input: AssignRoleRequest) => {
      assignment = input
    }),
    assignApplicationRole: vi.fn(async () => undefined),
    buildTokenClaims: vi.fn(
      async (_input: {
        userId?: string | null
        applicationId?: string | null
        organizationId?: string
        resource?: string
        scopes: string[]
      }) => ({
        authorization: {
          scopes: ['openid', 'profile', 'email'],
          roles: assignment ? [role.key] : [],
          permissions: assignment ? [permission.key] : [],
          organization_id: organization.id,
          resource: resource.identifier,
          audience: resource.audience,
        },
        roles: assignment ? [role.key] : [],
        permissions: assignment ? [permission.key] : [],
        tier: assignment?.tokenClaims?.tier,
        'https://claims.example.com/contacts': {
          contacts_role: role.key,
        },
      }),
    ),
  }
}

export function createUserRepositoryDouble(): UserRepository {
  const profile = {
    id: 'user-1',
    email: 'user-1@example.com',
    emailVerified: true,
    displayName: 'User One',
    username: 'userone',
    avatarAssetId: null,
    image: null,
    role: 'user',
    banned: false,
    banReason: null,
    banExpires: null,
    createdAt: new Date(now()),
    updatedAt: new Date(now()),
  }
  return {
    getUser: vi.fn().mockResolvedValue(profile),
    listManagedUsers: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    createManagedUser: vi.fn().mockResolvedValue(profile),
    updateManagedUser: vi.fn().mockResolvedValue(profile),
    deleteManagedUser: vi.fn().mockResolvedValue(undefined),
    updateProfile: vi.fn().mockResolvedValue(profile),
    assertAccountAvatarReference: vi.fn().mockResolvedValue(undefined),
    assertAdminAvatarReference: vi.fn().mockResolvedValue(undefined),
    listLinkedAccounts: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    listConsentedApplications: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    listSessions: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    getSessionToken: vi.fn().mockResolvedValue('session-token-1'),
  }
}

export function createSecurityRepositoryDouble() {
  return {
    getPolicy: vi.fn().mockResolvedValue(securityPolicy()),
    updatePolicy: vi.fn().mockResolvedValue(securityPolicy()),
    getSecurityState: vi.fn().mockResolvedValue({
      userId: 'user-1',
      mfa: { enabled: false, factors: [] },
      passkeys: { enabled: true, count: 0 },
      policy: securityPolicy(),
    }),
    listPasskeys: vi.fn().mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 }),
    deletePasskey: vi.fn().mockResolvedValue(undefined),
    getSessionToken: vi.fn().mockResolvedValue('session-token-1'),
  }
}

export function createConnectorServiceDouble() {
  const connector = {
    id: 'connector-1',
    slug: 'okta-main',
    providerType: 'generic_oauth',
    providerId: 'okta-main',
    displayName: 'Okta',
    enabled: true,
    clientId: 'okta-client',
    clientSecretConfigured: true,
    clientSecret: 'secret://okta',
    issuer: null,
    authorizationEndpoint: 'https://idp.example.com/oauth2/v1/authorize',
    tokenEndpoint: 'https://idp.example.com/oauth2/v1/token',
    userInfoEndpoint: 'https://idp.example.com/oauth2/v1/userinfo',
    jwksEndpoint: null,
    scopes: [],
    providerMetadata: {},
    createdAt: now(),
    updatedAt: now(),
  }

  return {
    list: vi.fn().mockResolvedValue({ connectors: [], pagination: page(0) }),
    listTemplates: vi.fn().mockReturnValue({ templates: [] }),
    create: vi.fn().mockResolvedValue(connector),
    get: vi.fn().mockResolvedValue(connector),
    readiness: vi.fn().mockResolvedValue({ connectorId: connector.id, ready: true, checks: [] }),
    update: vi.fn().mockResolvedValue(connector),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

export async function expectJson<T>(response: Response, status: number, expected: unknown): Promise<T> {
  expect(response.status).toBe(status)
  const body = (await response.json()) as T
  expect(body).toMatchObject(expected as object)
  return body
}

export function adminHeaders() {
  return {
    'content-type': 'application/json',
    'x-user-id': 'admin-1',
    'x-user-role': 'admin',
  }
}

export function userHeaders() {
  return {
    'content-type': 'application/json',
    'x-user-id': 'user-1',
    'x-user-role': 'user',
  }
}

export function securityPolicy(): SecurityPolicy {
  return {
    mfa: {
      mode: 'optional',
      authenticatorAppEnabled: true,
      emailOtpEnabled: false,
      backupCodesEnabled: true,
    },
    passkeys: {
      enabled: true,
      rpId: 'auth.example.com',
      rpName: 'FlareAuth',
      origins: ['https://auth.example.com'],
    },
    sessions: {
      expiresInSeconds: 3600,
      updateAgeSeconds: 300,
      freshAgeSeconds: 600,
      cookieCacheSeconds: 60,
    },
    password: {
      minLength: 8,
      requiredCharacterTypes: 1,
      customWords: [],
      rejectUserInfo: true,
      rejectSequential: true,
      rejectCustomWords: false,
    },
    captcha: {
      enabled: false,
      provider: 'turnstile',
      siteKey: '',
      secretBinding: '',
    },
    blocklist: {
      blockSubaddressing: false,
      entries: [],
    },
  }
}

export function page(total: number) {
  return {
    limit: 50,
    offset: 0,
    total,
    hasMore: false,
    nextOffset: null,
  }
}

export function now() {
  return '2026-05-18T12:00:00.000Z'
}
