import {
  Button,
  consoleQueryKeys,
  createWebhookEndpoint,
  createWebhookEndpointRequestSchema,
  deleteWebhookEndpoint,
  Field,
  type FormEvent,
  formatDate,
  ListToolbar,
  listWebhookEndpoints,
  listWebhookRequests,
  Plus,
  RefreshCw,
  ResourcePage,
  RoutedSettingsTabs,
  retryWebhookRequest,
  rotateWebhookEndpointSecret,
  SelectInput,
  SettingsSection,
  SettingsSections,
  StatusBadge,
  SwitchRow,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
  tt,
  updateWebhookEndpoint,
  useAdminMutation,
  useQuery,
  useQueryClient,
  useState,
  WebhookEndpointRow,
  type WebhookEvent,
  type WebhookRequest,
  WebhookRequestDialog,
  WebhookSecretDisclosureDialog,
  type WebhooksSection,
  webhookEvents,
} from '../../console'

export function WebhooksPage({ section = 'endpoints' }: { section?: WebhooksSection }) {
  const selectedTab = section
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>(['user.created'])
  const [secretDisclosure, setSecretDisclosure] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<WebhookRequest | null>(null)
  const endpointsQuery = useQuery({
    queryKey: [...consoleQueryKeys.webhookEndpoints, search, status],
    queryFn: () =>
      listWebhookEndpoints({
        search: search || undefined,
        status: status === 'enabled' || status === 'disabled' ? status : undefined,
      }),
    enabled: selectedTab === 'endpoints',
  })
  const requestsQuery = useQuery({
    queryKey: [...consoleQueryKeys.webhookRequests, search, status],
    queryFn: () =>
      listWebhookRequests({
        search: search || undefined,
        status: status === 'pending' || status === 'delivered' || status === 'failed' ? status : undefined,
      }),
    enabled: selectedTab === 'requests',
  })
  const queryClient = useQueryClient()
  const createMutation = useAdminMutation({
    mutationFn: createWebhookEndpoint,
    onSuccess: async (response) => {
      setEndpointUrl('')
      setSelectedEvents(['user.created'])
      setSecretDisclosure(response.signingSecret)
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.webhookEndpoints,
      })
    },
  })
  const updateMutation = useAdminMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: {
        enabled?: boolean
      }
    }) => updateWebhookEndpoint(id, input),
    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.webhookEndpoints,
      }),
  })
  const deleteMutation = useAdminMutation({
    mutationFn: deleteWebhookEndpoint,
    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.webhookEndpoints,
      }),
  })
  const rotateMutation = useAdminMutation({
    mutationFn: rotateWebhookEndpointSecret,
    onSuccess: async (response) => {
      setSecretDisclosure(response.signingSecret)
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.webhookEndpoints,
      })
    },
  })
  const retryMutation = useAdminMutation({
    mutationFn: retryWebhookRequest,
    onSuccess: async () =>
      queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.webhookRequests,
      }),
  })
  function toggleEvent(event: WebhookEvent, checked: boolean) {
    setSelectedEvents((events) => (checked ? [...events, event] : events.filter((value) => value !== event)))
  }
  function createEndpoint(event: FormEvent) {
    event.preventDefault()
    const parsed = createWebhookEndpointRequestSchema.safeParse({
      url: endpointUrl,
      events: selectedEvents,
      enabled: true,
    })
    if (!parsed.success) return
    createMutation.mutate(parsed.data)
  }
  return (
    <ResourcePage
      title={tt('Webhooks')}
      description={tt('Configure signed event endpoints and inspect persisted delivery requests.')}
      framed={false}
      action={
        selectedTab === 'endpoints' ? (
          <Button form="webhook-create-form" type="submit">
            <Plus data-icon="inline-start" /> {tt('Create endpoint')}{' '}
          </Button>
        ) : (
          <a className="uiButton uiButton-primary" href="/console/webhooks/endpoints">
            <Plus data-icon="inline-start" /> {tt('Create endpoint')}{' '}
          </a>
        )
      }
      toolbar={
        <RoutedSettingsTabs
          active={selectedTab}
          ariaLabel="Webhook sections"
          tabs={[
            ['endpoints', 'Endpoints', '/console/webhooks/endpoints'],
            ['requests', 'Requests', '/console/webhooks/requests'],
          ]}
        />
      }
    >
      <div className="consoleDetailStack">
        <ListToolbar>
          <TextInput
            aria-label={tt('Search webhooks')}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tt('Search endpoints or events')}
            value={search}
          />
          <SelectInput
            aria-label={tt('Filter webhook status')}
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            <option value="">{tt('Any status')}</option>
            {selectedTab === 'endpoints' ? (
              <>
                <option value="enabled">{tt('Enabled')}</option>
                <option value="disabled">{tt('Disabled')}</option>
              </>
            ) : (
              <>
                <option value="pending">{tt('Pending')}</option>
                <option value="delivered">{tt('Delivered')}</option>
                <option value="failed">{tt('Failed')}</option>
              </>
            )}
          </SelectInput>
        </ListToolbar>
        {selectedTab === 'endpoints' ? (
          <SettingsSections>
            <SettingsSection
              title={tt('Create endpoint')}
              description={tt('Create a signed HTTPS endpoint for selected events.')}
            >
              <form className="formStack" id="webhook-create-form" onSubmit={createEndpoint}>
                <Field label={tt('Endpoint URL')}>
                  <TextInput
                    onChange={(event) => setEndpointUrl(event.target.value)}
                    placeholder="https://example.com/webhooks/auth"
                    required
                    type="url"
                    value={endpointUrl}
                  />
                </Field>
                <div className="grid gap-2 sm:grid-cols-2">
                  {webhookEvents.map((event) => (
                    <SwitchRow
                      checked={selectedEvents.includes(event)}
                      key={event}
                      label={event}
                      onCheckedChange={(checked) => toggleEvent(event, checked)}
                    />
                  ))}
                </div>
                {createMutation.errorMessage ? (
                  <StatusBadge active={false} activeLabel="" inactiveLabel={createMutation.errorMessage} />
                ) : null}
                <Button
                  disabled={createMutation.isPending || selectedEvents.length === 0}
                  type="submit"
                  variant="secondary"
                >
                  <Plus data-icon="inline-start" /> {tt('Create endpoint')}{' '}
                </Button>
              </form>
            </SettingsSection>
            <SettingsSection
              title={tt('Endpoints')}
              description={tt('Manage enabled state, signing secret rotation, and endpoint deletion.')}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt('Endpoint')}</TableHead>
                    <TableHead>{tt('Events')}</TableHead>
                    <TableHead>{tt('Status')}</TableHead>
                    <TableHead>{tt('Secret')}</TableHead>
                    <TableHead>{tt('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpointsQuery.data?.endpoints?.map((endpoint) => (
                    <WebhookEndpointRow
                      endpoint={endpoint}
                      key={endpoint.id}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onRotate={(id) => rotateMutation.mutate(id)}
                      onToggle={(id, enabled) =>
                        updateMutation.mutate({
                          id,
                          input: {
                            enabled,
                          },
                        })
                      }
                    />
                  ))}
                  {endpointsQuery.data?.endpoints?.length === 0 ? (
                    <TableEmptyRow
                      colSpan={5}
                      description={tt('Create an HTTPS endpoint to receive signed events.')}
                      title={tt('No webhook endpoints')}
                    />
                  ) : null}
                </TableBody>
              </Table>
            </SettingsSection>
          </SettingsSections>
        ) : null}
        {selectedTab === 'requests' ? (
          <SettingsSections>
            <SettingsSection
              title={tt('Recent requests')}
              description={tt('Inspect persisted delivery attempts and retry failed requests.')}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tt('Request')}</TableHead>
                    <TableHead>{tt('Endpoint')}</TableHead>
                    <TableHead>{tt('Status')}</TableHead>
                    <TableHead>{tt('Created')}</TableHead>
                    <TableHead>{tt('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsQuery.data?.requests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <button
                          className="font-medium hover:underline"
                          onClick={() => setSelectedRequest(request)}
                          type="button"
                        >
                          {request.event}
                        </button>
                        <div className="text-xs text-muted-foreground">{request.id}</div>
                      </TableCell>
                      <TableCell>{request.endpointUrl}</TableCell>
                      <TableCell>
                        <StatusBadge
                          active={request.status === 'delivered'}
                          activeLabel="Delivered"
                          inactiveLabel={request.status === 'pending' ? 'Pending' : 'Failed'}
                        />
                      </TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell>
                        <Button
                          disabled={request.status === 'delivered' || retryMutation.isPending}
                          onClick={() => retryMutation.mutate(request.id)}
                          type="button"
                          variant="secondary"
                        >
                          <RefreshCw data-icon="inline-start" /> {tt('Retry')}{' '}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {requestsQuery.data?.requests?.length === 0 ? (
                    <TableEmptyRow
                      colSpan={5}
                      description={tt('Signed delivery attempts are recorded here when webhook events are dispatched.')}
                      title={tt('No webhook requests')}
                    />
                  ) : null}
                </TableBody>
              </Table>
            </SettingsSection>
          </SettingsSections>
        ) : null}
      </div>
      <WebhookSecretDisclosureDialog secret={secretDisclosure} onClose={() => setSecretDisclosure(null)} />
      <WebhookRequestDialog request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </ResourcePage>
  )
}
