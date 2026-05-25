import { createRoute, redirect } from '@tanstack/react-router'
import {
  AccountCenterSettingsPage,
  AgentsPage,
  ApiResourceDetailPage,
  ApiResourcesPage,
  ApplicationBrandingPage,
  ApplicationSettingsPage,
  ApplicationsPage,
  BrandingPage,
  ConnectorsPage,
  ContentSettingsPage,
  CustomizeJwtPage,
  DeploymentSettingsPage,
  MfaPage,
  OrganizationDetailPage,
  OrganizationsPage,
  OrganizationTemplatePage,
  RoleDetailPage,
  RolesPage,
  SecurityBlocklistPage,
  SecurityCaptchaPage,
  SecurityGeneralPage,
  SignInSettingsPage,
  UserApplicationsPage,
  UserLinkedAccountsPage,
  UserOperationsPage,
  UserProfilePage,
  UserSecurityPage,
  UserSessionsPage,
  UsersPage,
  WebhooksPage,
} from '@/features/console/console'

// biome-ignore lint/suspicious/noExplicitAny: TanStack keeps parent route identity in the route instance type across modules.
export function createConsoleRoutes(consoleRoute: any) {
  const consoleApplicationsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/applications',
    component: ApplicationsPage,
  })

  const consoleApplicationDetailRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/applications/{$applicationId}',
    beforeLoad: ({ params }) => {
      throw redirect({ href: `/console/applications/${params.applicationId}/settings` })
    },
  })

  const consoleApplicationDetailSettingsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/applications/{$applicationId}/settings',
    component: () => {
      const params = consoleApplicationDetailSettingsRoute.useParams() as { applicationId: string }
      return <ApplicationSettingsPage applicationId={params.applicationId} />
    },
  })

  const consoleApplicationDetailBrandingRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/applications/{$applicationId}/branding',
    component: () => {
      const params = consoleApplicationDetailBrandingRoute.useParams() as { applicationId: string }
      return <ApplicationBrandingPage applicationId={params.applicationId} />
    },
  })

  const consoleUsersRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users',
    component: UsersPage,
  })

  const consoleAgentsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/agents',
    component: AgentsPage,
  })

  const consoleUserDetailRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}',
    beforeLoad: ({ params }) => {
      throw redirect({ href: `/console/users/${params.userId}/profile` })
    },
  })

  const consoleUserDetailProfileRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/profile',
    component: () => {
      const params = consoleUserDetailProfileRoute.useParams() as { userId: string }
      return <UserProfilePage userId={params.userId} />
    },
  })

  const consoleUserDetailSecurityRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/security',
    component: () => {
      const params = consoleUserDetailSecurityRoute.useParams() as { userId: string }
      return <UserSecurityPage userId={params.userId} />
    },
  })

  const consoleUserDetailSessionsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/sessions',
    component: () => {
      const params = consoleUserDetailSessionsRoute.useParams() as { userId: string }
      return <UserSessionsPage userId={params.userId} />
    },
  })

  const consoleUserDetailLinkedAccountsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/linked-accounts',
    component: () => {
      const params = consoleUserDetailLinkedAccountsRoute.useParams() as { userId: string }
      return <UserLinkedAccountsPage userId={params.userId} />
    },
  })

  const consoleUserDetailApplicationsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/applications',
    component: () => {
      const params = consoleUserDetailApplicationsRoute.useParams() as { userId: string }
      return <UserApplicationsPage userId={params.userId} />
    },
  })

  const consoleUserDetailOperationsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/users/{$userId}/operations',
    component: () => {
      const params = consoleUserDetailOperationsRoute.useParams() as { userId: string }
      return <UserOperationsPage userId={params.userId} />
    },
  })

  const consoleConnectorsIndexRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/connectors',
    component: ConnectorsPage,
  })

  const consoleSignInExperienceIndexRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/sign-in-experience',
    beforeLoad: () => {
      throw redirect({ href: '/console/sign-in-experience/sign-up-and-sign-in' })
    },
  })

  const consoleSignInSignUpAndSignInRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/sign-in-experience/sign-up-and-sign-in',
    component: SignInSettingsPage,
  })

  const consoleSignInBrandingRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/sign-in-experience/branding',
    component: BrandingPage,
  })

  const consoleSignInAccountCenterRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/sign-in-experience/account-center',
    component: AccountCenterSettingsPage,
  })

  const consoleSignInContentRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/sign-in-experience/content',
    component: ContentSettingsPage,
  })

  const consoleMultiFactorAuthRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/mfa',
    component: MfaPage,
  })

  const consoleSecurityIndexRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/security',
    beforeLoad: () => {
      throw redirect({ href: '/console/security/captcha' })
    },
  })

  const consoleSecurityCaptchaRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/security/captcha',
    component: SecurityCaptchaPage,
  })

  const consoleSecurityBlocklistRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/security/blocklist',
    component: SecurityBlocklistPage,
  })

  const consoleSecurityGeneralRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/security/general',
    component: SecurityGeneralPage,
  })

  const consoleOrganizationsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organizations',
    component: OrganizationsPage,
  })

  const consoleOrganizationDetailRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organizations/{$organizationId}',
    beforeLoad: ({ params }) => {
      throw redirect({ href: `/console/organizations/${params.organizationId}/settings` })
    },
  })

  const consoleOrganizationDetailSettingsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organizations/{$organizationId}/settings',
    component: () => {
      const params = consoleOrganizationDetailSettingsRoute.useParams() as { organizationId: string }
      return <OrganizationDetailPage organizationId={params.organizationId} section="settings" />
    },
  })

  const consoleOrganizationDetailAuthorizationRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organizations/{$organizationId}/authorization',
    component: () => {
      const params = consoleOrganizationDetailAuthorizationRoute.useParams() as { organizationId: string }
      return <OrganizationDetailPage organizationId={params.organizationId} section="authorization" />
    },
  })

  const consoleRolesRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/roles',
    component: RolesPage,
  })

  const consoleRoleDetailRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/roles/{$roleId}',
    beforeLoad: ({ params }) => {
      throw redirect({ href: `/console/roles/${params.roleId}/settings` })
    },
  })

  const consoleRoleDetailSettingsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/roles/{$roleId}/settings',
    component: () => {
      const params = consoleRoleDetailSettingsRoute.useParams() as { roleId: string }
      return <RoleDetailPage roleId={params.roleId} section="settings" />
    },
  })

  const consoleRoleDetailPermissionsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/roles/{$roleId}/permissions',
    component: () => {
      const params = consoleRoleDetailPermissionsRoute.useParams() as { roleId: string }
      return <RoleDetailPage roleId={params.roleId} section="permissions" />
    },
  })

  const consoleRoleDetailAssignmentsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/roles/{$roleId}/assignments',
    component: () => {
      const params = consoleRoleDetailAssignmentsRoute.useParams() as { roleId: string }
      return <RoleDetailPage roleId={params.roleId} section="assignments" />
    },
  })

  const consoleApiResourcesRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/api-resources',
    component: ApiResourcesPage,
  })

  const consoleApiResourceDetailRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/api-resources/{$resourceId}',
    beforeLoad: ({ params }) => {
      throw redirect({ href: `/console/api-resources/${params.resourceId}/settings` })
    },
  })

  const consoleApiResourceDetailSettingsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/api-resources/{$resourceId}/settings',
    component: () => {
      const params = consoleApiResourceDetailSettingsRoute.useParams() as { resourceId: string }
      return <ApiResourceDetailPage resourceId={params.resourceId} section="settings" />
    },
  })

  const consoleApiResourceDetailScopesRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/api-resources/{$resourceId}/scopes',
    component: () => {
      const params = consoleApiResourceDetailScopesRoute.useParams() as { resourceId: string }
      return <ApiResourceDetailPage resourceId={params.resourceId} section="scopes" />
    },
  })

  const consoleApiResourceDetailPermissionsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/api-resources/{$resourceId}/permissions',
    component: () => {
      const params = consoleApiResourceDetailPermissionsRoute.useParams() as { resourceId: string }
      return <ApiResourceDetailPage resourceId={params.resourceId} section="permissions" />
    },
  })

  const consoleOrganizationTemplateIndexRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organization-template',
    beforeLoad: () => {
      throw redirect({ href: '/console/organization-template/organization-roles' })
    },
  })

  const consoleOrganizationTemplateRolesRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organization-template/organization-roles',
    component: () => <OrganizationTemplatePage section="organization-roles" />,
  })

  const consoleOrganizationTemplatePermissionsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/organization-template/organization-permissions',
    component: () => <OrganizationTemplatePage section="organization-permissions" />,
  })

  const consoleCustomJwtRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/customize-jwt',
    component: CustomizeJwtPage,
  })

  const consoleWebhooksRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/webhooks',
    beforeLoad: () => {
      throw redirect({ href: '/console/webhooks/endpoints' })
    },
  })

  const consoleWebhooksEndpointsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/webhooks/endpoints',
    component: () => <WebhooksPage section="endpoints" />,
  })

  const consoleWebhooksRequestsRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/webhooks/requests',
    component: () => <WebhooksPage section="requests" />,
  })

  const consoleTenantSettingsIndexRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/tenant-settings',
    beforeLoad: () => {
      throw redirect({ href: '/console/tenant-settings/oidc-configs' })
    },
  })

  const consoleTenantSettingsOidcRoute = createRoute({
    getParentRoute: () => consoleRoute,
    path: '/tenant-settings/oidc-configs',
    component: DeploymentSettingsPage,
  })

  return [
    consoleApplicationsRoute,
    consoleApplicationDetailRoute,
    consoleApplicationDetailSettingsRoute,
    consoleApplicationDetailBrandingRoute,
    consoleUsersRoute,
    consoleAgentsRoute,
    consoleUserDetailRoute,
    consoleUserDetailProfileRoute,
    consoleUserDetailSecurityRoute,
    consoleUserDetailSessionsRoute,
    consoleUserDetailLinkedAccountsRoute,
    consoleUserDetailApplicationsRoute,
    consoleUserDetailOperationsRoute,
    consoleConnectorsIndexRoute,
    consoleSignInExperienceIndexRoute,
    consoleSignInSignUpAndSignInRoute,
    consoleSignInBrandingRoute,
    consoleSignInAccountCenterRoute,
    consoleSignInContentRoute,
    consoleMultiFactorAuthRoute,
    consoleSecurityIndexRoute,
    consoleSecurityCaptchaRoute,
    consoleSecurityBlocklistRoute,
    consoleSecurityGeneralRoute,
    consoleOrganizationsRoute,
    consoleOrganizationDetailRoute,
    consoleOrganizationDetailSettingsRoute,
    consoleOrganizationDetailAuthorizationRoute,
    consoleRolesRoute,
    consoleRoleDetailRoute,
    consoleRoleDetailSettingsRoute,
    consoleRoleDetailPermissionsRoute,
    consoleRoleDetailAssignmentsRoute,
    consoleApiResourcesRoute,
    consoleApiResourceDetailRoute,
    consoleApiResourceDetailSettingsRoute,
    consoleApiResourceDetailScopesRoute,
    consoleApiResourceDetailPermissionsRoute,
    consoleOrganizationTemplateIndexRoute,
    consoleOrganizationTemplateRolesRoute,
    consoleOrganizationTemplatePermissionsRoute,
    consoleCustomJwtRoute,
    consoleWebhooksRoute,
    consoleWebhooksEndpointsRoute,
    consoleWebhooksRequestsRoute,
    consoleTenantSettingsIndexRoute,
    consoleTenantSettingsOidcRoute,
  ]
}
