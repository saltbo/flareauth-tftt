import { Card, CardContent, CardDescription, CardHeader, CardTitle, SettingRow, tt } from '../console'

export function RoleSummaryCard({
  permissionCount,
  role,
}: {
  permissionCount: number
  role: {
    id: string
    key: string
    name: string
    system: boolean
    applicationId: string | null
    organizationId: string | null
    resourceId: string | null
    tokenClaimName: string | null
    tokenClaimValue: string | null
  }
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tt('Role summary')}</CardTitle>
        <CardDescription>{tt('Read-only role scope and token claim context.')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <SettingRow label={tt('Role ID')} value={role.id} />
        <SettingRow label={tt('Key')} value={role.key} />
        <SettingRow label={tt('Type')} value={role.system ? 'System role' : 'Custom role'} />
        <SettingRow label={tt('Scope')} value={roleScopeLabel(role)} />
        <SettingRow label={tt('Permissions')} value={String(permissionCount)} />
        <SettingRow label={tt('Token claim')} value={role.tokenClaimName ?? 'Not set'} />
        <SettingRow label={tt('Token value')} value={role.tokenClaimValue ?? 'Not set'} />
      </CardContent>
    </Card>
  )
}
function roleScopeLabel(role: {
  applicationId: string | null
  organizationId: string | null
  resourceId: string | null
}) {
  if (role.resourceId) return `API resource ${role.resourceId}`
  if (role.organizationId) return `Organization ${role.organizationId}`
  if (role.applicationId) return `Application ${role.applicationId}`
  return 'Tenant'
}
