import { consoleQueryKeys } from '@/lib/api/console-query-keys'
import {
  deleteApplication,
  getApplication,
  listApplicationClientSecrets,
  rotateApplicationClientSecret,
  updateApplication,
  uploadApplicationLogo,
} from '@/lib/api/management'
import {
  type ApplicationDetailSection,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConsoleActionBar,
  ConsoleDetailStack,
  Field,
  Save,
  SettingRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextArea,
  TextInput,
  Trash2,
  tt,
  Undo2,
  updateApplicationRequestSchema,
  useEffect,
  useMutation,
  useNavigate,
  useQuery,
  useQueryClient,
  useState,
  type z,
} from '../../console-shared'
import {
  CopyButton,
  clientConfig,
  clientTypeLabel,
  DeleteApplicationDialog,
  listValue,
  MutationError,
  SecretDisclosureDialog,
} from '../../helpers/helpers-dialogs'
import { navigateConsoleTab, ObjectHeader, ResourcePage } from '../../helpers/helpers-resource'
import {
  formatDate,
  nullableString,
  parseCustomData,
  parseForm,
  parseLineList,
  useAdminMutation,
} from '../../helpers/helpers-utils'
import { ApplicationBrandingCard } from './application-branding-card'

export function ApplicationDetailPage({
  applicationId,
  section = 'settings',
}: {
  applicationId: string
  section?: ApplicationDetailSection
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<ApplicationDetailSection>(section)
  const [redirectFormError, setRedirectFormError] = useState<string | null>(null)
  const [customDataFormError, setCustomDataFormError] = useState<string | null>(null)
  useEffect(() => setSelectedTab(section), [section])
  const query = useQuery({
    queryKey: [...consoleQueryKeys.applications, applicationId],
    queryFn: () => getApplication(applicationId),
  })
  const secretsQuery = useQuery({
    queryKey: [...consoleQueryKeys.applications, applicationId, 'client-secrets'],
    queryFn: () => listApplicationClientSecrets(applicationId),
    enabled: selectedTab === 'settings' && query.data?.public === false,
  })
  const updateMutation = useMutation({
    mutationFn: (input: z.infer<typeof updateApplicationRequestSchema>) => updateApplication(applicationId, input),
    onSuccess: (application) => {
      queryClient.setQueryData([...consoleQueryKeys.applications, applicationId], application)
      return queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.applications,
      })
    },
  })
  const rotateMutation = useMutation({
    mutationFn: () => rotateApplicationClientSecret(applicationId),
    onSuccess: (result) => {
      setRotatedSecret(result.clientSecret)
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...consoleQueryKeys.applications, applicationId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...consoleQueryKeys.applications, applicationId, 'client-secrets'],
        }),
      ])
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteApplication(applicationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: consoleQueryKeys.applications,
        }),
        queryClient.invalidateQueries({
          queryKey: consoleQueryKeys.readiness,
        }),
      ])
      await navigate({ href: '/console/applications' })
    },
  })
  const logoMutation = useAdminMutation({
    mutationFn: (file: File) => uploadApplicationLogo(applicationId, file),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...consoleQueryKeys.applications, applicationId],
        }),
        queryClient.invalidateQueries({
          queryKey: consoleQueryKeys.applications,
        }),
      ]),
  })
  const application = query.data
  const redirectUris = listValue(application?.redirectUris, '\n')
  const postLogoutRedirectUris = listValue(application?.postLogoutRedirectUris, '\n')
  const corsOrigins = listValue(application?.corsOrigins, '\n')
  return (
    <ResourcePage
      title={application?.name ?? tt('Application')}
      description={tt(
        'Review client configuration, manage redirect URIs, rotate confidential secrets, and copy standard OIDC integration details.',
      )}
      framed={false}
      error={query.error}
      loading={query.isLoading}
      onRetry={() => query.refetch()}
    >
      {application ? (
        <ConsoleDetailStack>
          <a className="consoleBackLink" href="/console/applications">
            <Undo2 data-icon="inline-start" /> {tt('Back to applications')}{' '}
          </a>
          <ObjectHeader
            badge={clientTypeLabel(application.clientType)}
            id={application.clientId}
            title={application.name}
          />
          <Tabs
            setValue={(value) => {
              const next = value as ApplicationDetailSection
              setSelectedTab(next)
              navigateConsoleTab(navigate, `/console/applications/${applicationId}/${next}`)
            }}
            value={selectedTab}
          >
            <TabsList aria-label={tt('Application detail sections')}>
              <TabsTrigger value="settings">{tt('Settings')}</TabsTrigger>
              <TabsTrigger value="branding">{tt('Branding')}</TabsTrigger>
            </TabsList>
            <TabsContent className="mt-4" value="settings">
              <div className="applicationSettingsStack">
                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('General settings')}</CardTitle>
                    <CardDescription>{tt('Required display metadata and client classification.')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="formStack"
                      key={`${application.id}-${application.updatedAt}`}
                      onSubmit={(event) => {
                        event.preventDefault()
                        const form = new FormData(event.currentTarget)
                        updateMutation.mutate(
                          parseForm(updateApplicationRequestSchema, {
                            name: form.get('name'),
                            description: nullableString(String(form.get('description') ?? '')),
                          }),
                        )
                      }}
                    >
                      <Field label={tt('Application name')}>
                        <TextInput defaultValue={application.name} name="name" required />
                      </Field>
                      <Field label={tt('Description')}>
                        <TextArea defaultValue={application.description ?? ''} name="description" rows={3} />
                      </Field>
                      <SettingRow label={tt('App ID')} value={application.clientId} />
                      <SettingRow label={tt('Type')} value={clientTypeLabel(application.clientType)} />
                      <SettingRow label={tt('Status')} value={application.disabled ? 'Disabled' : 'Enabled'} />
                      <ConsoleActionBar>
                        <Button disabled={updateMutation.isPending} type="submit">
                          <Save data-icon="inline-start" /> {tt('Save changes')}{' '}
                        </Button>
                        <Button disabled={updateMutation.isPending} type="reset" variant="secondary">
                          {' '}
                          {tt('Discard')}{' '}
                        </Button>
                      </ConsoleActionBar>
                      <MutationError error={updateMutation.error} />
                    </form>
                  </CardContent>
                </Card>

                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('Redirects and origins')}</CardTitle>
                    <CardDescription>{tt('Callbacks and browser origins accepted by this client.')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="formStack"
                      id="application-redirect-uris-form"
                      key={`redirects-${application.id}-${application.updatedAt}`}
                      onSubmit={(event) => {
                        event.preventDefault()
                        try {
                          setRedirectFormError(null)
                          const form = new FormData(event.currentTarget)
                          updateMutation.mutate(
                            parseForm(updateApplicationRequestSchema, {
                              redirectUris: parseLineList(form.get('redirectUris') as string),
                              postLogoutRedirectUris: parseLineList(form.get('postLogoutRedirectUris') as string),
                              corsOrigins: parseLineList(form.get('corsOrigins') as string),
                            }),
                          )
                        } catch (submitError) {
                          setRedirectFormError((submitError as Error).message)
                        }
                      }}
                    >
                      <Field label={tt('Redirect URIs')} help={tt('One URI per line.')}>
                        <TextArea defaultValue={redirectUris} name="redirectUris" required rows={5} />
                      </Field>
                      <Field label={tt('Post sign-out redirect URIs')} help={tt('One URI per line.')}>
                        <TextArea
                          defaultValue={postLogoutRedirectUris}
                          name="postLogoutRedirectUris"
                          placeholder="https://app.example.com/signed-out"
                          rows={3}
                        />
                      </Field>
                      <Field
                        label={tt('CORS origins')}
                        help={tt('One origin per line. Include scheme, host, and optional port.')}
                      >
                        <TextArea
                          defaultValue={corsOrigins}
                          name="corsOrigins"
                          placeholder="https://app.example.com"
                          rows={3}
                        />
                      </Field>
                      <ConsoleActionBar>
                        <Button disabled={updateMutation.isPending} type="submit">
                          {' '}
                          {tt('Save redirects and origins')}{' '}
                        </Button>
                        <Button disabled={updateMutation.isPending} type="reset" variant="secondary">
                          {' '}
                          {tt('Discard')}{' '}
                        </Button>
                      </ConsoleActionBar>
                      {redirectFormError ? <p className="text-sm text-destructive">{redirectFormError}</p> : null}
                      <MutationError error={updateMutation.error} />
                    </form>
                  </CardContent>
                </Card>

                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('Endpoints and credentials')}</CardTitle>
                    <CardDescription>{tt('Use these values with any standards-compliant OIDC SDK.')}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <SettingRow label={tt('Auth method')} value={application.tokenEndpointAuthMethod} />
                    <SettingRow label={tt('PKCE')} value={application.requirePkce ? 'Required' : 'Optional'} />
                    <SettingRow label={tt('Issuer')} value={application.oidc.issuer} />
                    <SettingRow
                      label={tt('Discovery')}
                      value={`${application.oidc.issuer}/.well-known/openid-configuration`}
                    />
                    <SettingRow label={tt('Authorization endpoint')} value={application.oidc.authorizationEndpoint} />
                    <SettingRow label={tt('Token endpoint')} value={application.oidc.tokenEndpoint} />
                    <SettingRow label={tt('UserInfo endpoint')} value={application.oidc.userInfoEndpoint} />
                    <SettingRow label={tt('JWKS URI')} value={application.oidc.jwksUri} />
                    <CopyButton label={tt('Copy client config')} value={clientConfig(application, rotatedSecret)} />
                  </CardContent>
                </Card>

                <ApplicationOidcClaimsForm
                  claims={application.oidcClaims}
                  error={updateMutation.error}
                  onSave={(oidcClaims) => updateMutation.mutate({ oidcClaims })}
                  pending={updateMutation.isPending}
                />

                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('Client secrets')}</CardTitle>
                    <CardDescription>
                      {' '}
                      {tt('Raw secrets are only shown once immediately after creation or rotation.')}{' '}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {application.public ? (
                      <SettingRow
                        label={tt('Secret behavior')}
                        value="No client secret is issued for public clients."
                      />
                    ) : (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{tt('Version')}</TableHead>
                              <TableHead>{tt('Prefix')}</TableHead>
                              <TableHead>{tt('Status')}</TableHead>
                              <TableHead>{tt('Created')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {secretsQuery.data?.secrets.map((secret) => (
                              <TableRow key={secret.id}>
                                <TableCell>{secret.version}</TableCell>
                                <TableCell>{secret.prefix ?? 'Hidden'}</TableCell>
                                <TableCell>{secret.status}</TableCell>
                                <TableCell>{formatDate(secret.createdAt)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Button
                          disabled={rotateMutation.isPending}
                          onClick={() => rotateMutation.mutate()}
                          type="button"
                        >
                          {' '}
                          {tt('Rotate client secret')}{' '}
                        </Button>
                        <MutationError error={secretsQuery.error ?? rotateMutation.error} />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('Advanced options')}</CardTitle>
                    <CardDescription>
                      {tt('Grant, scope, and custom metadata included with this client.')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="formStack">
                    <SettingRow label={tt('Grant types')} value={application.allowedGrantTypes.join(', ')} />
                    <SettingRow label={tt('Scopes')} value={application.allowedScopes.join(' ')} />
                    <SettingRow
                      label={tt('Refresh tokens')}
                      value={application.allowedScopes.includes('offline_access') ? 'Allowed by scope' : 'Not enabled'}
                    />
                    <form
                      className="formStack"
                      key={`custom-data-${application.id}-${application.updatedAt}`}
                      onSubmit={(event) => {
                        event.preventDefault()
                        try {
                          setCustomDataFormError(null)
                          const form = new FormData(event.currentTarget)
                          updateMutation.mutate(
                            parseForm(updateApplicationRequestSchema, {
                              customData: parseCustomData(form.get('customData') as string),
                            }),
                          )
                        } catch (submitError) {
                          setCustomDataFormError((submitError as Error).message)
                        }
                      }}
                    >
                      <Field label={tt('Custom data JSON')} help={tt('JSON object stored with this application.')}>
                        <TextArea
                          defaultValue={JSON.stringify(application.customData, null, 2)}
                          name="customData"
                          rows={5}
                        />
                      </Field>
                      <ConsoleActionBar>
                        <Button disabled={updateMutation.isPending} type="submit">
                          {' '}
                          {tt('Save custom data')}{' '}
                        </Button>
                        <Button disabled={updateMutation.isPending} type="reset" variant="secondary">
                          {' '}
                          {tt('Discard')}{' '}
                        </Button>
                      </ConsoleActionBar>
                      {customDataFormError ? <p className="text-sm text-destructive">{customDataFormError}</p> : null}
                      <MutationError error={updateMutation.error} />
                    </form>
                  </CardContent>
                </Card>

                <Card className="applicationSettingsPanel">
                  <CardHeader>
                    <CardTitle>{tt('Lifecycle')}</CardTitle>
                    <CardDescription>
                      {' '}
                      {tt('Disable clients before deleting them when integrations are still active.')}{' '}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <SettingRow label={tt('Reason')} value={application.disabledReason ?? 'Not set'} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            disabled: !application.disabled,
                            disabledReason: application.disabled ? null : 'Disabled from Console',
                          })
                        }
                        type="button"
                        variant="secondary"
                      >
                        {application.disabled ? 'Enable application' : 'Disable application'}
                      </Button>
                      <Button
                        disabled={deleteMutation.isPending}
                        onClick={() => setDeleteDialogOpen(true)}
                        type="button"
                        variant="danger"
                      >
                        <Trash2 data-icon="inline-start" /> {tt('Delete application')}{' '}
                      </Button>
                    </div>
                    <MutationError error={updateMutation.error ?? deleteMutation.error} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent className="mt-4" value="branding">
              <ApplicationBrandingCard
                application={application}
                error={logoMutation.error}
                errorMessage={logoMutation.errorMessage}
                onLogo={(file) => logoMutation.mutate(file)}
              />
            </TabsContent>
          </Tabs>
        </ConsoleDetailStack>
      ) : null}
      <SecretDisclosureDialog
        clientId={application?.clientId ?? null}
        clientSecret={rotatedSecret}
        onClose={() => setRotatedSecret(null)}
        open={rotatedSecret !== null}
      />
      <DeleteApplicationDialog
        applicationName={application?.name ?? ''}
        error={deleteMutation.error}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        open={deleteDialogOpen}
        pending={deleteMutation.isPending}
      />
    </ResourcePage>
  )
}

import { ApplicationOidcClaimsForm } from './application-detail-sections'
