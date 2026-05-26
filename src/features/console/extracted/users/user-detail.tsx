import { consoleQueryKeys } from '@/lib/api/console-query-keys'
import {
  banUser,
  deleteUser,
  deleteUserPasskey,
  getUser,
  getUserSecurity,
  listUserApplications,
  listUserLinkedAccounts,
  listUserPasskeys,
  listUserSessions,
  requestUserPasswordReset,
  revokeUserSession,
  revokeUserSessions,
  unbanUser,
  updateUser,
} from '@/lib/api/management'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type managementUpdateUserRequestSchema,
  SettingRow,
  Trash2,
  tt,
  Undo2,
  type UserDetailSection,
  useEffect,
  useMutation,
  useNavigate,
  useQuery,
  useQueryClient,
  useState,
  type z,
} from '../../console-shared'
import { BanUserDialog, DangerConfirmDialog, MutationError } from '../../helpers/helpers-dialogs'
import {
  DetailTabs,
  navigateConsoleTab,
  ObjectHeader,
  ResourcePage,
  userDetailTabs,
} from '../../helpers/helpers-resource'
import { formatDate, userDisplayName } from '../../helpers/helpers-utils'

export function UserDetailPage({ userId, section = 'profile' }: { userId: string; section?: UserDetailSection }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState<UserDetailSection>(section)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false)
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null)
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null)
  const userQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId],
    queryFn: () => getUser(userId),
  })
  const sessionsQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId, 'sessions'],
    queryFn: () => listUserSessions(userId),
    enabled: selectedTab === 'sessions',
  })
  const linkedAccountsQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId, 'linked-accounts'],
    queryFn: () => listUserLinkedAccounts(userId),
    enabled: selectedTab === 'linked-accounts',
  })
  const applicationsQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId, 'applications'],
    queryFn: () => listUserApplications(userId),
    enabled: selectedTab === 'applications',
  })
  const securityQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId, 'security'],
    queryFn: () => getUserSecurity(userId),
    enabled: selectedTab === 'security',
  })
  const passkeysQuery = useQuery({
    queryKey: [...consoleQueryKeys.users, userId, 'passkeys'],
    queryFn: () => listUserPasskeys(userId),
    enabled: selectedTab === 'security',
  })
  const updateMutation = useMutation({
    mutationFn: (input: z.infer<typeof managementUpdateUserRequestSchema>) => updateUser(userId, input),
    onSuccess: async (response) => {
      queryClient.setQueryData([...consoleQueryKeys.users, userId], response)
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.users,
      })
    },
  })
  const resetMutation = useMutation({
    mutationFn: () => requestUserPasswordReset(userId),
  })
  const banMutation = useMutation({
    mutationFn: (input: { reason?: string }) => banUser(userId, input),
    onSuccess: async () => {
      setBanDialogOpen(false)
      await queryClient.invalidateQueries({
        queryKey: [...consoleQueryKeys.users, userId],
      })
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.users,
      })
    },
  })
  const unbanMutation = useMutation({
    mutationFn: () => unbanUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...consoleQueryKeys.users, userId],
      })
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.users,
      })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.users,
      })
      await navigate({ href: '/console/users' })
    },
  })
  const revokeAllMutation = useMutation({
    mutationFn: () => revokeUserSessions(userId),
    onSuccess: async () => {
      setRevokeAllDialogOpen(false)
      await sessionsQuery.refetch()
    },
  })
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => revokeUserSession(userId, sessionId),
    onSuccess: () => sessionsQuery.refetch(),
  })
  const deletePasskeyMutation = useMutation({
    mutationFn: (passkeyId: string) => deleteUserPasskey(userId, passkeyId),
    onSuccess: () => Promise.all([passkeysQuery.refetch(), securityQuery.refetch()]),
  })
  useEffect(() => setSelectedTab(section), [section])
  const user = userQuery.data?.user
  return (
    <ResourcePage
      title={user ? userDisplayName(user) : tt('User')}
      description={tt(
        'Inspect profile, access state, linked accounts, MFA, passkeys, sessions, and account operations.',
      )}
      framed={false}
      error={userQuery.error}
      loading={userQuery.isLoading}
      onRetry={() => userQuery.refetch()}
    >
      {user ? (
        <div className="consoleDetailStack">
          <a className="consoleBackLink" href="/console/users">
            <Undo2 data-icon="inline-start" /> {tt('Back to users')}{' '}
          </a>
          <ObjectHeader
            badge={user.banned ? 'Banned' : 'Active'}
            id={user.email ?? user.id}
            title={userDisplayName(user)}
          />
          <DetailTabs
            label={tt('User detail sections')}
            onChange={(value) => {
              const next = value as UserDetailSection
              setSelectedTab(next)
              navigateConsoleTab(navigate, `/console/users/${userId}/${next}`)
            }}
            tabs={userDetailTabs()}
            value={selectedTab}
          />
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            {selectedTab === 'profile' ? (
              <UserProfileCard
                error={updateMutation.error}
                pending={updateMutation.isPending}
                user={user}
                onSubmit={updateMutation.mutate}
              />
            ) : null}
            {selectedTab === 'operations' ? (
              <Card>
                <CardHeader>
                  <CardTitle>{tt('Account operations')}</CardTitle>
                  <CardDescription>
                    {tt('Use confirmations for destructive or security-sensitive actions.')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <SettingRow label={tt('Status')} value={user.banned ? 'Banned' : 'Active'} />
                  <SettingRow label={tt('Ban reason')} value={user.banReason ?? 'Not set'} />
                  <SettingRow label={tt('Ban expires')} value={formatDate(user.banExpires ?? undefined)} />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={resetMutation.isPending}
                      onClick={() => resetMutation.mutate()}
                      type="button"
                      variant="secondary"
                    >
                      {' '}
                      {tt('Send password reset')}{' '}
                    </Button>
                    {user.banned ? (
                      <Button
                        disabled={unbanMutation.isPending}
                        onClick={() => unbanMutation.mutate()}
                        type="button"
                        variant="secondary"
                      >
                        {' '}
                        {tt('Unban user')}{' '}
                      </Button>
                    ) : (
                      <Button onClick={() => setBanDialogOpen(true)} type="button" variant="danger">
                        {' '}
                        {tt('Ban user')}{' '}
                      </Button>
                    )}
                    <Button onClick={() => setDeleteDialogOpen(true)} type="button" variant="danger">
                      <Trash2 data-icon="inline-start" /> {tt('Delete user')}{' '}
                    </Button>
                  </div>
                  <MutationError
                    error={resetMutation.error ?? banMutation.error ?? unbanMutation.error ?? deleteMutation.error}
                  />
                  {resetMutation.isSuccess ? (
                    <p className="text-sm text-muted-foreground">{tt('Password reset requested.')}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
            {selectedTab === 'security' ? (
              <UserSecurityCard
                error={securityQuery.error ?? passkeysQuery.error ?? deletePasskeyMutation.error}
                passkeys={passkeysQuery.data?.passkeys ?? []}
                security={securityQuery.data?.security}
                onDeletePasskey={setPasskeyToDelete}
              />
            ) : null}
            {selectedTab === 'sessions' ? (
              <UserSessionsCard
                error={sessionsQuery.error ?? revokeAllMutation.error ?? revokeSessionMutation.error}
                onRevokeAll={() => setRevokeAllDialogOpen(true)}
                onRevokeSession={setSessionToRevoke}
                pending={revokeAllMutation.isPending || revokeSessionMutation.isPending}
                sessions={sessionsQuery.data?.sessions ?? []}
              />
            ) : null}
            {selectedTab === 'linked-accounts' ? (
              <UserLinkedAccountsCard
                accounts={linkedAccountsQuery.data?.accounts ?? []}
                error={linkedAccountsQuery.error}
              />
            ) : null}
            {selectedTab === 'applications' ? (
              <UserApplicationsCard
                applications={applicationsQuery.data?.applications ?? []}
                error={applicationsQuery.error}
              />
            ) : null}
            <UserIdentitySummaryCard
              applicationsCount={applicationsQuery.data?.applications.length ?? 0}
              linkedAccountsCount={linkedAccountsQuery.data?.accounts.length ?? 0}
              sessionsCount={sessionsQuery.data?.sessions.length ?? 0}
              user={user}
            />
          </div>
          <BanUserDialog
            error={banMutation.error}
            onClose={() => setBanDialogOpen(false)}
            onConfirm={(reason) =>
              banMutation.mutate(
                reason
                  ? {
                      reason,
                    }
                  : {},
              )
            }
            open={banDialogOpen}
            pending={banMutation.isPending}
            userName={userDisplayName(user)}
          />
          <DangerConfirmDialog
            actionLabel="Delete user"
            description={`Deleting ${userDisplayName(user)} removes the account and cannot be undone.`}
            error={deleteMutation.error}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={() => deleteMutation.mutate()}
            open={deleteDialogOpen}
            pending={deleteMutation.isPending}
            title={tt('Delete user')}
          />
          <DangerConfirmDialog
            actionLabel="Revoke sessions"
            description={`Revoke every active session for ${userDisplayName(user)}.`}
            error={revokeAllMutation.error}
            onClose={() => setRevokeAllDialogOpen(false)}
            onConfirm={() => revokeAllMutation.mutate()}
            open={revokeAllDialogOpen}
            pending={revokeAllMutation.isPending}
            title={tt('Revoke all sessions')}
          />
          <DangerConfirmDialog
            actionLabel="Revoke session"
            description={`Revoke session ${sessionToRevoke ?? ''} for ${userDisplayName(user)}.`}
            error={revokeSessionMutation.error}
            onClose={() => setSessionToRevoke(null)}
            onConfirm={() => {
              if (sessionToRevoke) revokeSessionMutation.mutate(sessionToRevoke)
              setSessionToRevoke(null)
            }}
            open={sessionToRevoke !== null}
            pending={revokeSessionMutation.isPending}
            title={tt('Revoke session')}
          />
          <DangerConfirmDialog
            actionLabel="Delete passkey"
            description={`Delete passkey ${passkeyToDelete ?? ''} for ${userDisplayName(user)}.`}
            error={deletePasskeyMutation.error}
            onClose={() => setPasskeyToDelete(null)}
            onConfirm={() => {
              if (passkeyToDelete) deletePasskeyMutation.mutate(passkeyToDelete)
              setPasskeyToDelete(null)
            }}
            open={passkeyToDelete !== null}
            pending={deletePasskeyMutation.isPending}
            title={tt('Delete passkey')}
          />
        </div>
      ) : null}
    </ResourcePage>
  )
}

import {
  UserApplicationsCard,
  UserIdentitySummaryCard,
  UserLinkedAccountsCard,
  UserProfileCard,
  UserSecurityCard,
  UserSessionsCard,
} from './user-cards'
