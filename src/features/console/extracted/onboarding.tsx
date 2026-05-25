import {
  ApplicationTypeCards,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Copy,
  consoleQueryKeys,
  createApplication,
  createApplicationRequestSchema,
  Field,
  getAdminReadiness,
  Plus,
  parseForm,
  ResourcePage,
  SettingRow,
  SetupChecklist,
  TextArea,
  TextInput,
  tt,
  useAdminMutation,
  useQuery,
  useQueryClient,
  useState,
} from '../console'

export function ConsoleOnboardingPage() {
  const queryClient = useQueryClient()
  const readinessQuery = useQuery({
    queryKey: consoleQueryKeys.readiness,
    queryFn: getAdminReadiness,
  })
  const [form, setForm] = useState({
    name: 'Customer portal',
    slug: 'customer-portal',
    clientType: 'public_spa',
    redirectUris: `${window.location.origin}/oidc/callback`,
  })
  const createMutation = useAdminMutation({
    mutationFn: createApplication,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQueryKeys.applications,
        }),
        queryClient.invalidateQueries({
          queryKey: consoleQueryKeys.readiness,
        }),
      ]),
  })
  const application = createMutation.data
  return (
    <ResourcePage
      title={tt('Console setup')}
      description={tt(
        'Complete required setup gates, then review production recommendations without blocking the Console.',
      )}
      error={readinessQuery.error ?? createMutation.error}
      framed={false}
      loading={readinessQuery.isLoading}
      onRetry={() => readinessQuery.refetch()}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{tt('Setup checklist')}</CardTitle>
                <CardDescription>
                  {' '}
                  {tt('Required items unlock Console routes. Recommended items prepare production.')}{' '}
                </CardDescription>
              </div>
              <Badge variant={readinessQuery.data?.admin?.setupRequired ? 'outline' : 'secondary'}>
                {readinessQuery.data?.admin?.setupRequired ? 'Action needed' : 'Ready'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5">
            <SetupChecklist items={readinessQuery.data?.required ?? []} title={tt('Required')} />
            <SetupChecklist items={readinessQuery.data?.recommended ?? []} title={tt('Recommended')} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tt('First OIDC application')}</CardTitle>
            <CardDescription>
              {tt('Use a localhost or review-environment callback while validating the flow.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="formStack applicationCreateForm"
              onSubmit={(event) => {
                event.preventDefault()
                createMutation.mutate(
                  parseForm(createApplicationRequestSchema, {
                    name: form.name,
                    slug: form.slug,
                    clientType: form.clientType,
                    firstParty: true,
                    redirectUris: form.redirectUris.split('\n').filter(Boolean),
                  }),
                )
              }}
            >
              <ApplicationTypeCards
                onChange={(clientType) =>
                  setForm((value) => ({
                    ...value,
                    clientType,
                  }))
                }
                value={form.clientType}
              />
              <Field label={tt('Application name')}>
                <TextInput
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={form.name}
                />
              </Field>
              <Field label={tt('Slug')}>
                <TextInput
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      slug: event.target.value,
                    }))
                  }
                  required
                  value={form.slug}
                />
              </Field>
              <Field label={tt('Redirect URIs')}>
                <TextArea
                  onChange={(event) =>
                    setForm((value) => ({
                      ...value,
                      redirectUris: event.target.value,
                    }))
                  }
                  required
                  value={form.redirectUris}
                />
              </Field>
              <Button disabled={createMutation.isPending} type="submit">
                <Plus data-icon="inline-start" /> {tt('Create OIDC client')}{' '}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{tt('Client integration')}</CardTitle>
            <CardDescription>{tt('Use OIDC discovery with authorization code and PKCE.')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <SettingRow
              label={tt('Discovery')}
              value={`${window.location.origin}/api/auth/.well-known/openid-configuration`}
            />
            <SettingRow label={tt('Issuer')} value={`${window.location.origin}/api/auth`} />
            <SettingRow label={tt('Callback')} value={form.redirectUris.split('\n')[0] ?? ''} />
            {application ? (
              <>
                <SettingRow label={tt('Client ID')} value={application.clientId} />
                <SettingRow label={tt('Auth method')} value={application.tokenEndpointAuthMethod} />
                <SettingRow label={tt('Scopes')} value={application.allowedScopes.join(' ')} />
              </>
            ) : null}
            <Button
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      issuer: `${window.location.origin}/api/auth`,
                      discoveryUrl: `${window.location.origin}/api/auth/.well-known/openid-configuration`,
                      clientId: application?.clientId ?? '<create-client-first>',
                      redirectUri: form.redirectUris.split('\n')[0] ?? '',
                      scopes: 'openid profile email',
                    },
                    null,
                    2,
                  ),
                )
              }
              type="button"
              variant="secondary"
            >
              <Copy data-icon="inline-start" /> {tt('Copy details')}{' '}
            </Button>
          </CardContent>
        </Card>
      </div>
    </ResourcePage>
  )
}
