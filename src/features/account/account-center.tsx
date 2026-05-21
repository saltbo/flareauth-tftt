import { useNavigate } from '@tanstack/react-router'
import {
  Fingerprint,
  KeyRound,
  Laptop,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Pencil,
  ShieldCheck,
  Upload,
  UserRound,
  Wallet,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createSiweMessage } from 'viem/siwe'
import { BrandIdentity, brandingStyle } from '@/components/layout/auth-layout'
import { ProviderIcon } from '@/components/provider-icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, TextInput } from '@/components/ui/field'
import { Status } from '@/components/ui/status'
import { useConfigz } from '@/features/auth/hooks'
import {
  changeAccountPassword,
  confirmAccountEmailChange,
  createPasskeyRegistrationOptions,
  deletePasskey,
  disableTotp,
  getAccountProfile,
  getAccountSecurity,
  linkAccount,
  linkWalletAddress,
  listAccountSessions,
  listConsentedApplications,
  listLinkedAccounts,
  listPasskeys,
  requestAccountEmailChange,
  revokeApplicationConsent,
  revokeOtherSessions,
  revokeSession,
  startTotpEnrollment,
  unlinkAccount,
  unlinkWalletAddress,
  updateAccountProfile,
  uploadAccountAvatar,
  verifyPasskeyRegistration,
  verifyTotp,
} from '@/lib/api/account'
import { requestWalletNonce, signOut } from '@/lib/auth-client'

type UserProfile = {
  id: string
  email: string
  emailVerified: boolean
  displayName: string
  username: string | null
  avatarAssetId: string | null
  image: string | null
}

type LinkedAccount = {
  id: string
  accountId: string
  providerId: string
  createdAt: string
}

type IdentityProvider = {
  slug: string
  providerType: string
  providerId: string
  displayName: string
  icon: string
}

type ConsentedApplication = {
  id: string
  applicationName: string
  applicationSlug: string
  scopes: string[]
  grantedAt: string
  expiresAt: string | null
}

type UserSessionDevice = {
  id: string
  expiresAt: string
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
  current?: boolean
}

type SecurityState = {
  mfa: { enabled: boolean; factors: Array<{ id: string; type: string; verified: boolean | null }> }
  passkeys: { enabled: boolean; count: number }
  policy: { mfa: { mode: 'optional' | 'required' }; passkeys: { enabled: boolean; rpName: string } }
}

type Passkey = {
  id: string
  name: string | null
  deviceType: string
  backedUp: boolean
  createdAt: string | null
}

type TotpEnrollmentDisplay = {
  qrCode: string | null
  otpAuthUri: string | null
  secret: string | null
  backupCodes: string[]
}

type AccountData = {
  profile: UserProfile | null
  linkedAccounts: LinkedAccount[]
  applications: ConsentedApplication[]
  sessions: UserSessionDevice[]
  security: SecurityState | null
  passkeys: Passkey[]
}

const emptyAccountData: AccountData = {
  profile: null,
  linkedAccounts: [],
  applications: [],
  sessions: [],
  security: null,
  passkeys: [],
}

export function AccountCenterPage() {
  return <AccountCenter />
}

export function AccountCenter() {
  const navigate = useNavigate()
  const configState = useConfigz()
  const config = configState.data
  const accountCenter = config?.accountCenter ?? defaultAccountCenterSettings
  const [data, setData] = useState(emptyAccountData)
  const [loading, setLoading] = useState(true)
  const [confirmation, setConfirmation] = useState<DestructiveConfirmation | null>(null)

  const reload = useCallback(async () => {
    if (!config) return
    setLoading(true)
    try {
      const [profile, linkedAccounts, applications, sessions, security, passkeys] = await Promise.all([
        getAccountProfile(),
        accountCenter.connectedAccountsEnabled ? listLinkedAccounts() : Promise.resolve({ accounts: [] }),
        accountCenter.connectedAccountsEnabled ? listConsentedApplications() : Promise.resolve({ applications: [] }),
        accountCenter.sessionsViewEnabled ? listAccountSessions() : Promise.resolve({ sessions: [] }),
        getAccountSecurity(),
        listPasskeys(),
      ])
      setData({
        profile: profile.user,
        linkedAccounts: linkedAccounts.accounts,
        applications: applications.applications,
        sessions: sessions.sessions,
        security: security.security,
        passkeys: passkeys.passkeys,
      })
    } catch (loadError) {
      toast.error(loadError instanceof Error ? loadError.message : 'Unable to load account center.')
    } finally {
      setLoading(false)
    }
  }, [accountCenter.connectedAccountsEnabled, accountCenter.sessionsViewEnabled, config])

  useEffect(() => {
    if (configState.loading) return
    if (configState.error) {
      toast.error(configState.error)
      setLoading(false)
      return
    }
    void reload()
  }, [configState.error, configState.loading, reload])

  async function mutate<T>(
    label: string,
    operation: () => Promise<T>,
    options: { onError?: (message: string) => void; reload?: boolean } = {},
  ): Promise<T | undefined> {
    try {
      const result = await operation()
      toast.success(label)
      if (options.reload !== false) await reload()
      return result
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : 'Account update failed.'
      options.onError?.(message)
      toast.error(message)
      return undefined
    }
  }

  async function signOutFromAccount() {
    try {
      await signOut()
      setData(emptyAccountData)
      setLoading(false)
      setConfirmation(null)
      toast.success('Signed out.')
      await navigate({ to: '/sign-in' })
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Account update failed.')
    }
  }

  return (
    <main className="accountShell" style={brandingStyle(config)}>
      <div className="accountChrome">
        <BrandIdentity config={config} />
        <section className="accountContent">
          {!data.profile ? (
            <div className="accountHeader">
              <div>
                <p className="eyebrow">Account settings</p>
                <h1>Your account</h1>
              </div>
            </div>
          ) : null}
          {loading ? (
            <Status>
              <LoaderCircle className="spin" size={18} />
              Loading account
            </Status>
          ) : null}
          {!loading && data.profile ? (
            <div className="accountSectionStack">
              <section className="accountHero" aria-label="Profile summary">
                <div className="accountHeroIdentity">
                  {data.profile.image ? (
                    <img alt="" className="accountHeaderAvatar" src={data.profile.image} width="64" height="64" />
                  ) : (
                    <div className="accountHeaderAvatar" aria-hidden="true">
                      <UserRound size={30} />
                    </div>
                  )}
                  <div className="accountHeaderMeta">
                    <p className="eyebrow">Profile</p>
                    <h1>{data.profile.displayName}</h1>
                    <p>{data.profile.email}</p>
                  </div>
                </div>
                <div className="accountSummaryStrip">
                  <StatusPill label={data.profile.emailVerified ? 'Verified' : 'Required'} value="Email" />
                  <StatusPill label={data.security?.mfa.enabled ? 'Enabled' : 'Off'} value="MFA" />
                  <StatusPill label={String(data.passkeys.length)} value="Passkeys" />
                  <StatusPill label={String(data.sessions.length)} value="Sessions" />
                </div>
                <Button onClick={() => void signOutFromAccount()} variant="secondary">
                  Sign out
                </Button>
              </section>
              <div className="accountDashboardGrid">
                {accountCenter.profileEditingEnabled || accountCenter.passwordChangeEnabled ? (
                  <section className="accountPanelGroup accountDashboardPanel" aria-label="Profile settings">
                    <div className="accountPanelHeader">
                      <PanelTitle
                        description="Profile information and sign-in identifiers."
                        icon={<UserRound size={18} />}
                        title="Account details"
                      />
                    </div>
                    <ProfileSections accountCenter={accountCenter} profile={data.profile} mutate={mutate} />
                  </section>
                ) : null}
                <section className="accountPanelGroup accountDashboardPanel" aria-label="Security settings">
                  <div className="accountPanelHeader">
                    <PanelTitle
                      description="Credentials and second-factor controls."
                      icon={<ShieldCheck size={18} />}
                      title="Sign-in security"
                    />
                  </div>
                  <SecuritySections
                    confirm={setConfirmation}
                    data={data}
                    mutate={mutate}
                    profileEmail={data.profile.email}
                  />
                </section>
                {accountCenter.connectedAccountsEnabled ? (
                  <section className="accountPanelGroup accountDashboardPanel" aria-label="Social and app access">
                    <div className="accountPanelHeader">
                      <PanelTitle
                        description="Linked identities and authorized applications."
                        icon={<Link2 size={18} />}
                        title="Connections and apps"
                      />
                    </div>
                    <ConnectionsSection
                      accounts={data.linkedAccounts}
                      confirm={setConfirmation}
                      mutate={mutate}
                      providers={config?.identityProviders ?? []}
                      walletProvider={config?.builtInProviders.web3Wallet}
                    />
                    <ApplicationsSection applications={data.applications} confirm={setConfirmation} mutate={mutate} />
                  </section>
                ) : null}
                {accountCenter.sessionsViewEnabled ? (
                  <section
                    className="accountPanelGroup accountDashboardPanel accountDashboardPanelWide"
                    aria-label="Session management"
                  >
                    <div className="accountPanelHeader">
                      <PanelTitle
                        action={
                          <Button
                            onClick={() =>
                              setConfirmation({
                                title: 'Revoke other sessions',
                                description: 'Every other active session for this account will be signed out.',
                                actionLabel: 'Revoke sessions',
                                onConfirm: () => mutate('Other sessions revoked.', revokeOtherSessions),
                              })
                            }
                            type="button"
                            variant="secondary"
                          >
                            Revoke other sessions
                          </Button>
                        }
                        description="Devices currently signed in to this account."
                        icon={<Laptop size={18} />}
                        title="Active sessions"
                      />
                    </div>
                    <SessionsSection confirm={setConfirmation} sessions={data.sessions} mutate={mutate} />
                  </section>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
      <DestructiveConfirmationDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </main>
  )
}

const defaultAccountCenterSettings = {
  profileEditingEnabled: true,
  displayNameEditable: true,
  usernameEditable: true,
  avatarEditable: true,
  emailChangeEnabled: true,
  passwordChangeEnabled: true,
  connectedAccountsEnabled: true,
  sessionsViewEnabled: true,
  dangerZoneEnabled: false,
}

function ProfileSections({
  accountCenter,
  profile,
  mutate,
}: {
  accountCenter: typeof defaultAccountCenterSettings
  profile: UserProfile
  mutate: MutationHandler
}) {
  const [dialog, setDialog] = useState<'profile' | 'username' | 'email' | 'password' | null>(null)
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [username, setUsername] = useState(profile.username ?? '')
  const [avatarAssetId, setAvatarAssetId] = useState(profile.avatarAssetId ?? '')
  const [avatarPreview, setAvatarPreview] = useState(profile.image ?? '')
  const [email, setEmail] = useState(profile.email)
  const [emailOtp, setEmailOtp] = useState('')
  const [emailStep, setEmailStep] = useState<'request' | 'confirm'>('request')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile.displayName)
    setUsername(profile.username ?? '')
    setAvatarAssetId(profile.avatarAssetId ?? '')
    setAvatarPreview(profile.image ?? '')
    setEmail(profile.email)
    setEmailOtp('')
    setEmailStep('request')
  }, [profile])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    const result = await mutate('Profile updated.', () =>
      updateAccountProfile({
        displayName,
        username: username || null,
        avatarAssetId: avatarAssetId || null,
      }),
    )
    if (result) setDialog(null)
  }

  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    if (emailStep === 'request') {
      const result = await mutate('Verification code sent.', () => requestAccountEmailChange({ email }), {
        reload: false,
      })
      if (result) {
        setEmailOtp('')
        setEmailStep('confirm')
      }
      return
    }

    const result = await mutate('Email changed.', () => confirmAccountEmailChange({ email, otp: emailOtp }))
    if (result) {
      setEmailOtp('')
      setEmailStep('request')
      setDialog(null)
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    const result = await mutate(
      'Password changed.',
      () => changeAccountPassword({ currentPassword, newPassword, revokeOtherSessions: true }),
      { onError: setPasswordError },
    )
    if (result) {
      setCurrentPassword('')
      setNewPassword('')
      setPasswordError(null)
      setDialog(null)
    }
  }

  function uploadAvatar(file: File | undefined) {
    if (!file) return
    return mutate('Avatar uploaded.', () => uploadAccountAvatar(file), { reload: false }).then((response) => {
      if (response) {
        setAvatarAssetId(response.asset.id)
        setAvatarPreview(response.asset.publicUrl)
      }
      return response
    })
  }

  return (
    <>
      {accountCenter.profileEditingEnabled ? (
        <section className="settingsPanel">
          <SettingsAction
            action={
              accountCenter.displayNameEditable || accountCenter.avatarEditable ? (
                <Button onClick={() => setDialog('profile')} type="button" variant="secondary">
                  <Pencil size={16} />
                  Edit profile
                </Button>
              ) : null
            }
            icon={<UserRound size={18} />}
            meta={
              accountCenter.avatarEditable ? 'Avatar can be updated in the edit dialog.' : 'Profile editing is limited.'
            }
            title="Profile"
            value={profile.displayName}
          />
        </section>
      ) : null}
      {accountCenter.profileEditingEnabled && (accountCenter.usernameEditable || accountCenter.emailChangeEnabled) ? (
        <section className="settingsPanel">
          {accountCenter.usernameEditable ? (
            <SettingsAction
              action={
                <Button onClick={() => setDialog('username')} type="button" variant="secondary">
                  Edit username
                </Button>
              }
              icon={<UserRound size={18} />}
              meta={profile.username ? `@${profile.username}` : 'No username set'}
              title="Username"
            />
          ) : null}
          {accountCenter.emailChangeEnabled ? (
            <SettingsAction
              action={
                <Button onClick={() => setDialog('email')} type="button" variant="secondary">
                  <Mail size={18} />
                  Change email
                </Button>
              }
              icon={<Mail size={18} />}
              meta={profile.email}
              title="Email"
            />
          ) : null}
        </section>
      ) : null}
      {accountCenter.passwordChangeEnabled ? (
        <section className="settingsPanel">
          <SettingsAction
            action={
              <Button onClick={() => setDialog('password')} type="button" variant="secondary">
                <KeyRound size={18} />
                Change password
              </Button>
            }
            icon={<LockKeyhole size={18} />}
            meta="Use this when you need to rotate your hosted sign-in password."
            title="Password"
            value="Hosted sign-in"
          />
        </section>
      ) : null}
      <Dialog open={dialog === 'profile'}>
        <DialogContent>
          <form onSubmit={saveProfile}>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>Update the name and avatar shown across trusted applications.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              {accountCenter.avatarEditable ? (
                <div className="avatarUploadControl">
                  {avatarPreview ? (
                    <img alt="" className="assetPreview" src={avatarPreview} width="56" height="56" />
                  ) : (
                    <div className="assetPreview" aria-hidden="true">
                      <UserRound size={28} />
                    </div>
                  )}
                  <div className="avatarUploadMeta">
                    <span className="avatarUploadLabel">Avatar image</span>
                    <span className="avatarUploadHelp">PNG, JPEG, or WebP up to 2 MB.</span>
                    <button
                      className="avatarUploadButton"
                      onClick={() => document.getElementById('account-avatar-upload')?.click()}
                      type="button"
                    >
                      <Upload size={16} />
                      Upload image
                    </button>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      aria-label="Avatar image"
                      className="visuallyHidden"
                      id="account-avatar-upload"
                      onChange={(event) => uploadAvatar(event.currentTarget.files?.[0])}
                      tabIndex={-1}
                      type="file"
                    />
                  </div>
                </div>
              ) : null}
              {accountCenter.displayNameEditable ? (
                <Field label="Display name">
                  <TextInput
                    autoComplete="name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    value={displayName}
                  />
                </Field>
              ) : null}
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit">Save profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'username'}>
        <DialogContent>
          <form onSubmit={saveProfile}>
            <DialogHeader>
              <DialogTitle>Edit username</DialogTitle>
              <DialogDescription>Choose the username associated with this hosted account.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              <Field label="Username">
                <TextInput
                  autoComplete="username"
                  onChange={(event) => setUsername(event.target.value)}
                  value={username}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                Save identifiers
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'email'}>
        <DialogContent>
          <form onSubmit={changeEmail}>
            <DialogHeader>
              <DialogTitle>Change email</DialogTitle>
              <DialogDescription>
                {emailStep === 'request'
                  ? 'A verification code will be sent to the new email address.'
                  : `Enter the verification code sent to ${email}.`}
              </DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              {emailStep === 'request' ? (
                <Field label="Email">
                  <TextInput
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    type="email"
                    value={email}
                  />
                </Field>
              ) : (
                <Field label="Verification code">
                  <TextInput
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    onChange={(event) => setEmailOtp(event.target.value)}
                    required
                    value={emailOtp}
                  />
                </Field>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setDialog(null)
                  setEmailStep('request')
                  setEmailOtp('')
                }}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              {emailStep === 'confirm' ? (
                <Button
                  onClick={() => {
                    setEmailStep('request')
                    setEmailOtp('')
                  }}
                  type="button"
                  variant="secondary"
                >
                  Back
                </Button>
              ) : null}
              <Button type="submit" variant="secondary">
                <Mail size={18} />
                {emailStep === 'request' ? 'Send code' : 'Verify code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'password'}>
        <DialogContent>
          <form onSubmit={changePassword}>
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>Rotates the hosted sign-in password and revokes other sessions.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              {passwordError ? <Status tone="error">{passwordError}</Status> : null}
              <input autoComplete="username" hidden readOnly type="text" value={profile.email} />
              <Field label="Current password">
                <TextInput
                  autoComplete="current-password"
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </Field>
              <Field label="New password">
                <TextInput
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                <KeyRound size={18} />
                Change password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SecuritySections({
  confirm,
  data,
  mutate,
  profileEmail,
}: {
  confirm: ConfirmDestructiveHandler
  data: AccountData
  mutate: MutationHandler
  profileEmail: string
}) {
  const [dialog, setDialog] = useState<'mfa-enroll' | 'mfa-verify' | 'mfa-disable' | 'passkey' | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [passkeyName, setPasskeyName] = useState('')
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollmentDisplay | null>(null)
  const mfaRequired = data.security?.policy.mfa.mode === 'required'
  const mfaEnabled = Boolean(data.security?.mfa.enabled)

  return (
    <>
      <section className="settingsPanel">
        <SettingsAction
          action={
            <div className="settingsActionButtons">
              {mfaEnabled ? (
                <>
                  <Button onClick={() => setDialog('mfa-verify')} type="button" variant="secondary">
                    Verify code
                  </Button>
                  <Button
                    disabled={mfaRequired}
                    onClick={() => setDialog('mfa-disable')}
                    type="button"
                    variant="danger"
                  >
                    Disable MFA
                  </Button>
                </>
              ) : (
                <Button onClick={() => setDialog('mfa-enroll')} type="button" variant="secondary">
                  Enroll authenticator app
                </Button>
              )}
            </div>
          }
          icon={<ShieldCheck size={18} />}
          meta={data.security?.mfa.enabled ? 'Authenticator app is enabled.' : 'No authenticator factor enrolled.'}
          title="Multi-factor authentication"
        />
      </section>
      <section className="settingsPanel">
        <SettingsAction
          action={
            <Button
              disabled={!data.security?.policy.passkeys.enabled}
              onClick={() => setDialog('passkey')}
              type="button"
              variant="secondary"
            >
              <Fingerprint size={18} />
              Add passkey
            </Button>
          }
          icon={<Fingerprint size={18} />}
          meta={
            data.passkeys.length === 1
              ? '1 passkey added for passwordless sign-in.'
              : `${data.passkeys.length} passkeys added for passwordless sign-in.`
          }
          title="Passkeys"
        />
        <ItemList
          empty="No passkeys have been added yet."
          items={data.passkeys.map((passkey) => ({
            id: passkey.id,
            icon: <Fingerprint size={16} />,
            title: passkey.name ?? 'Unnamed passkey',
            meta: `${passkey.deviceType}${passkey.backedUp ? ' / backed up' : ' / not backed up'}${
              passkey.createdAt ? ` / added ${formatDate(passkey.createdAt)}` : ''
            }`,
            action: (
              <Button
                onClick={() =>
                  confirm({
                    title: 'Remove passkey',
                    description: 'This passkey will no longer sign in to your account.',
                    actionLabel: 'Remove passkey',
                    onConfirm: () => mutate('Passkey removed.', () => deletePasskey(passkey.id)),
                  })
                }
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            ),
          }))}
        />
      </section>
      <Dialog open={dialog === 'mfa-enroll'}>
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              if (totpEnrollment) {
                const result = await mutate('MFA enabled.', () => verifyTotp({ code, trustDevice: true }))
                if (result) {
                  setCode('')
                  setPassword('')
                  setTotpEnrollment(null)
                  setDialog(null)
                }
                return
              }

              await mutate(
                'TOTP enrollment started.',
                async () => {
                  const enrollment = await startTotpEnrollment({ password })
                  setTotpEnrollment(readTotpEnrollment(enrollment))
                  return enrollment
                },
                { reload: false },
              )
            }}
          >
            <DialogHeader>
              <DialogTitle>Enroll authenticator app</DialogTitle>
              <DialogDescription>Confirm your password, then scan the generated setup code.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              <input autoComplete="username" hidden readOnly type="text" value={profileEmail} />
              <Field label="Password">
                <TextInput
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </Field>
              {totpEnrollment ? (
                <>
                  <TotpEnrollmentDetails enrollment={totpEnrollment} />
                  <Field label="Authenticator code">
                    <TextInput inputMode="numeric" onChange={(event) => setCode(event.target.value)} value={code} />
                  </Field>
                </>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setTotpEnrollment(null)
                  setDialog(null)
                }}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                {totpEnrollment ? 'Verify code' : 'Enroll authenticator app'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'mfa-verify'}>
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              const result = await mutate('MFA challenge verified.', () => verifyTotp({ code, trustDevice: true }))
              if (result) setDialog(null)
            }}
          >
            <DialogHeader>
              <DialogTitle>Verify authenticator code</DialogTitle>
              <DialogDescription>Enter the current code from your authenticator app.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              <Field label="Authenticator code">
                <TextInput inputMode="numeric" onChange={(event) => setCode(event.target.value)} value={code} />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button type="submit" variant="secondary">
                Verify code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'mfa-disable'}>
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              const result = await mutate('MFA disabled.', () => disableTotp({ password }))
              if (result) {
                setPassword('')
                setDialog(null)
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Disable MFA</DialogTitle>
              <DialogDescription>Confirm your password to remove authenticator app protection.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              <input autoComplete="username" hidden readOnly type="text" value={profileEmail} />
              <Field label="Password">
                <TextInput
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button disabled={mfaRequired} type="submit" variant="danger">
                Disable authenticator app
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === 'passkey'}>
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault()
              const result = await mutate('Passkey enrolled.', () => enrollPasskey(passkeyName))
              if (result) {
                setPasskeyName('')
                setDialog(null)
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Add passkey</DialogTitle>
              <DialogDescription>Create a hardware-backed passkey for this account.</DialogDescription>
            </DialogHeader>
            <div className="dialogFormBody formStack">
              <Field label="Passkey name">
                <TextInput onChange={(event) => setPasskeyName(event.target.value)} value={passkeyName} />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={() => setDialog(null)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button disabled={!data.security?.policy.passkeys.enabled} type="submit" variant="secondary">
                <Fingerprint size={18} />
                Add passkey
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ConnectionsSection({
  accounts,
  confirm,
  mutate,
  providers,
  walletProvider,
}: {
  accounts: LinkedAccount[]
  confirm: ConfirmDestructiveHandler
  mutate: MutationHandler
  providers: IdentityProvider[]
  walletProvider?: { enabled: boolean; allowSignUp?: boolean; chains: number[] }
}) {
  const externalAccounts = accounts.filter((account) => account.providerId !== 'credential')
  const accountByProvider = new Map(externalAccounts.map((account) => [account.providerId, account]))
  const walletAccounts = externalAccounts.filter((account) => account.providerId === 'siwe')
  const walletEnabled = Boolean(walletProvider?.enabled)

  async function connectProvider(provider: IdentityProvider) {
    const result = await mutate(
      `Redirecting to ${provider.displayName}.`,
      () =>
        linkAccount({
          providerType: provider.providerType === 'generic_oauth' ? 'generic_oauth' : 'social',
          providerId: provider.providerId,
          callbackURL: `${window.location.origin}/profile/linked-accounts`,
          errorCallbackURL: `${window.location.origin}/profile`,
        }),
      { reload: false },
    )
    const redirectUrl = readRedirectUrl(result)
    if (redirectUrl) window.location.assign(redirectUrl)
  }

  async function connectWallet() {
    await mutate('Wallet linked.', () => enrollWallet(walletProvider?.chains ?? [1]))
  }

  return (
    <section className="settingsPanel">
      <SubsectionTitle title="Linked accounts" description="External sign-in identities connected to this account." />
      <ItemList
        empty="No sign-in connectors are available."
        emptyDescription="Enable a social or OAuth connector before users can link one here."
        items={[
          ...providers.map((provider) => {
            const account = accountByProvider.get(provider.providerId)
            return {
              id: provider.slug,
              icon: <ProviderIcon className="providerIcon providerIconLarge" provider={provider} />,
              title: provider.displayName,
              meta: account ? `Linked ${formatDate(account.createdAt)}` : 'Not linked to this account.',
              status: account ? 'Linked' : 'Available',
              action: account ? (
                <Button
                  onClick={() =>
                    confirm({
                      title: 'Unlink account',
                      description: `${provider.displayName} will no longer be connected to your account.`,
                      actionLabel: 'Unlink account',
                      onConfirm: () =>
                        mutate('Linked account removed.', () => unlinkAccount(provider.providerId, account.accountId)),
                    })
                  }
                  type="button"
                  variant="ghost"
                >
                  Unlink
                </Button>
              ) : (
                <Button onClick={() => void connectProvider(provider)} type="button" variant="secondary">
                  Connect
                </Button>
              ),
            }
          }),
          ...(walletEnabled
            ? [
                {
                  id: 'web3-wallet',
                  icon: <Wallet size={16} />,
                  title: 'Web3 wallet',
                  meta: walletAccounts.length
                    ? `${walletAccounts.length} wallet${walletAccounts.length === 1 ? '' : 's'} linked.`
                    : 'Link a wallet after signing in with an email-based account.',
                  status: walletAccounts.length ? 'Linked' : 'Available',
                  action: walletAccounts.length ? (
                    <Button
                      onClick={() => {
                        const account = walletAccounts[0]
                        confirm({
                          title: 'Unlink wallet',
                          description: 'This wallet will no longer sign in to your account.',
                          actionLabel: 'Unlink wallet',
                          onConfirm: () => mutate('Wallet removed.', () => unlinkWalletAddress(account.accountId)),
                        })
                      }}
                      type="button"
                      variant="ghost"
                    >
                      Unlink
                    </Button>
                  ) : (
                    <Button onClick={() => void connectWallet()} type="button" variant="secondary">
                      Connect
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </section>
  )
}

function SessionsSection({
  confirm,
  sessions,
  mutate,
}: {
  confirm: ConfirmDestructiveHandler
  sessions: UserSessionDevice[]
  mutate: MutationHandler
}) {
  return (
    <section className="settingsPanel">
      <div className="settingsBody">
        <ItemList
          empty="No active sessions."
          items={sessions.map((session) => ({
            id: session.id,
            icon: <Laptop size={16} />,
            title: formatSessionDevice(session.userAgent),
            meta: `${session.ipAddress ?? 'No IP'} / expires ${formatDate(session.expiresAt)}`,
            action: (
              <Button
                onClick={() =>
                  confirm({
                    title: 'Revoke session',
                    description: 'This device session will be signed out.',
                    actionLabel: 'Revoke session',
                    onConfirm: async () => {
                      const result = await mutate('Session revoked.', () => revokeSession(session.id), {
                        reload: !session.current,
                      })
                      if (result && session.current) {
                        try {
                          await signOut()
                        } finally {
                          window.location.assign('/sign-in')
                        }
                      }
                    },
                  })
                }
                type="button"
                variant="ghost"
              >
                Revoke
              </Button>
            ),
          }))}
        />
      </div>
    </section>
  )
}

function ApplicationsSection({
  applications,
  confirm,
  mutate,
}: {
  applications: ConsentedApplication[]
  confirm: ConfirmDestructiveHandler
  mutate: MutationHandler
}) {
  return (
    <section className="settingsPanel">
      <SubsectionTitle title="Authorized apps" description="Applications with consent to access this account." />
      <ItemList
        empty="No authorized applications yet."
        items={applications.map((application) => ({
          id: application.id,
          icon: <Link2 size={16} />,
          title: application.applicationName,
          meta: `Scopes: ${application.scopes.join(', ')} / Granted ${formatDate(application.grantedAt)}`,
          action: (
            <Button
              onClick={() =>
                confirm({
                  title: 'Revoke application access',
                  description: `${application.applicationName} will lose access to this account until you approve it again.`,
                  actionLabel: 'Revoke access',
                  onConfirm: () =>
                    mutate('Application access revoked.', () => revokeApplicationConsent(application.id)),
                })
              }
              type="button"
              variant="ghost"
            >
              Revoke
            </Button>
          ),
        }))}
      />
    </section>
  )
}

function SubsectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="subsectionTitle">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

function PanelTitle({
  action,
  title,
  description,
  icon,
}: {
  action?: ReactNode
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <div className="panelTitle">
      <div className="panelTitleMain">
        <div className="panelTitleIcon" aria-hidden="true">
          {icon}
        </div>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="statusPill">
      <span>{value}</span>
      <strong>{label}</strong>
    </div>
  )
}

function SettingsAction({
  action,
  icon,
  meta,
  title,
  value,
}: {
  action?: ReactNode
  icon: ReactNode
  meta: string
  title: string
  value?: string
}) {
  return (
    <article className="settingsAction">
      <div className="settingsActionMain">
        <div className="settingsActionIcon" aria-hidden="true">
          {icon}
        </div>
        <div>
          <h3>{title}</h3>
          {value ? <strong>{value}</strong> : null}
          <p>{meta}</p>
        </div>
      </div>
      {action}
    </article>
  )
}

type MutationHandler = <T>(
  label: string,
  operation: () => Promise<T>,
  options?: { onError?: (message: string) => void; reload?: boolean },
) => Promise<T | undefined>

type DestructiveConfirmation = {
  title: string
  description: string
  actionLabel: string
  onConfirm: () => unknown
}

type ConfirmDestructiveHandler = (confirmation: DestructiveConfirmation) => void

function DestructiveConfirmationDialog({
  confirmation,
  onClose,
}: {
  confirmation: DestructiveConfirmation | null
  onClose: () => void
}) {
  if (!confirmation) return null

  return (
    <Dialog open={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{confirmation.title}</DialogTitle>
          <DialogDescription>{confirmation.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              const confirmed = confirmation
              onClose()
              void confirmed.onConfirm()
            }}
            type="button"
            variant="danger"
          >
            {confirmation.actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ListItem = {
  id: string
  icon?: ReactNode
  title: string
  meta: string
  action?: ReactNode
  status?: string
}

function ItemList({
  empty,
  emptyDescription = 'Nothing needs attention here.',
  items,
}: {
  empty: string
  emptyDescription?: string
  items: ListItem[]
}) {
  return (
    <div className="itemList">
      {items.length === 0 ? (
        <article className="itemRow itemRowEmpty">
          <div>
            <h3>{empty}</h3>
            <p>{emptyDescription}</p>
          </div>
        </article>
      ) : (
        items.map((item) => (
          <article className="itemRow" key={item.id}>
            <div className="itemRowMain">
              {item.icon ? (
                <div className="itemRowIcon" aria-hidden="true">
                  {item.icon}
                </div>
              ) : null}
              <div>
                <div className="itemRowTitle">
                  <h3>{item.title}</h3>
                  {item.status ? <span>{item.status}</span> : null}
                </div>
                <p>{item.meta}</p>
              </div>
            </div>
            {item.action}
          </article>
        ))
      )}
    </div>
  )
}

function TotpEnrollmentDetails({ enrollment }: { enrollment: TotpEnrollmentDisplay }) {
  return (
    <div className="setupPanel">
      <h3>Authenticator setup</h3>
      {enrollment.qrCode ? (
        <img className="setupQr" src={enrollment.qrCode} alt="Authenticator app QR code" width="168" height="168" />
      ) : null}
      {enrollment.otpAuthUri ? (
        <p>
          <strong>Enrollment URI</strong>
          <code>{enrollment.otpAuthUri}</code>
        </p>
      ) : null}
      {enrollment.secret ? (
        <p>
          <strong>Secret</strong>
          <code>{enrollment.secret}</code>
        </p>
      ) : null}
      {enrollment.backupCodes.length ? (
        <div>
          <strong>Backup codes</strong>
          <div className="backupCodeGrid">
            {enrollment.backupCodes.map((code) => (
              <code key={code}>{code}</code>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function readTotpEnrollment(value: unknown): TotpEnrollmentDisplay {
  const record = asRecord(value)
  return {
    qrCode: readString(record.qrCode) ?? readString(record.qrCodeUrl) ?? readString(record.qr),
    otpAuthUri:
      readString(record.otpAuthUri) ??
      readString(record.otpAuthURI) ??
      readString(record.totpURI) ??
      readString(record.totpUri) ??
      readString(record.uri),
    secret: readString(record.secret),
    backupCodes: readStringArray(record.backupCodes),
  }
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

async function enrollPasskey(name: string) {
  const options = await createPasskeyRegistrationOptions({ name: name || undefined })
  const credential = await createPasskeyCredential(options)
  return verifyPasskeyRegistration({ response: credential, name: name || undefined })
}

async function enrollWallet(enabledChains: number[]) {
  const ethereum = window.ethereum
  if (!ethereum) throw new Error('No wallet provider was found in this browser.')

  const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
  const walletAddress = readFirstString(accounts)
  if (!walletAddress) throw new Error('No wallet account was selected.')

  const chainValue = await ethereum.request({ method: 'eth_chainId' })
  const chainId = readChainId(chainValue)
  if (!enabledChains.includes(chainId)) {
    throw new Error(`This wallet network is not enabled. Switch to chain ${enabledChains[0]}.`)
  }

  const { nonce } = await requestWalletNonce({ walletAddress, chainId })
  const message = createSiweMessage({
    address: walletAddress as `0x${string}`,
    chainId,
    domain: window.location.host,
    nonce,
    statement: 'Link this wallet to FlareAuth.',
    uri: window.location.origin,
    version: '1',
  })
  const signature = readString(
    await ethereum.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    }),
  )
  if (!signature) throw new Error('Wallet did not return a signature.')

  return linkWalletAddress({ message, signature, walletAddress, chainId })
}

async function createPasskeyCredential(optionsResponse: unknown) {
  if (!navigator.credentials?.create) {
    throw new Error('Passkey registration is not supported by this browser.')
  }

  const credential = await navigator.credentials.create({
    publicKey: passkeyCreationOptions(optionsResponse),
  })

  if (!credential) {
    throw new Error('Passkey registration was cancelled.')
  }

  return serializePasskeyCredential(credential)
}

function passkeyCreationOptions(optionsResponse: unknown): PublicKeyCredentialCreationOptions {
  const response = asRecord(optionsResponse)
  const options = asRecord(
    response.publicKey ?? asRecord(response.options).publicKey ?? response.options ?? optionsResponse,
  )
  const user = asRecord(options.user)

  return {
    ...options,
    challenge: base64UrlToBuffer(readRequiredString(options.challenge, 'challenge')),
    user: {
      ...user,
      id: base64UrlToBuffer(readRequiredString(user.id, 'user.id')),
      name: readRequiredString(user.name, 'user.name'),
      displayName: readRequiredString(user.displayName, 'user.displayName'),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((credential) => {
          const credentialRecord = asRecord(credential)
          return {
            ...credentialRecord,
            id: base64UrlToBuffer(readRequiredString(credentialRecord.id, 'excludeCredentials.id')),
          } as PublicKeyCredentialDescriptor
        })
      : undefined,
  } as PublicKeyCredentialCreationOptions
}

function serializePasskeyCredential(credential: Credential) {
  const publicKeyCredential = credential as PublicKeyCredential
  const response = publicKeyCredential.response as AuthenticatorAttestationResponse
  return {
    id: publicKeyCredential.id,
    rawId: bufferToBase64Url(publicKeyCredential.rawId),
    type: publicKeyCredential.type,
    response: {
      attestationObject: bufferToBase64Url(response.attestationObject),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      transports: response.getTransports?.() ?? [],
    },
    clientExtensionResults: publicKeyCredential.getClientExtensionResults?.() ?? {},
  }
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function readString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readFirstString(value: unknown) {
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null
}

function readChainId(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.startsWith('0x')) return Number.parseInt(value, 16)
  if (typeof value === 'string') return Number(value)
  throw new Error('Wallet did not return a chain ID.')
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Passkey registration option ${field} is required.`)
  }
  return value
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function readRedirectUrl(response: unknown) {
  if (typeof response !== 'object' || response === null) return null
  if ('url' in response && typeof response.url === 'string') return response.url
  if ('redirectTo' in response && typeof response.redirectTo === 'string') return response.redirectTo
  if ('callbackURL' in response && typeof response.callbackURL === 'string') return response.callbackURL
  return null
}

function formatSessionDevice(userAgent: string | null) {
  if (!userAgent) return 'Unknown device'
  if (!userAgent.includes('/')) return userAgent

  const browser = userAgent.includes('Edg/')
    ? 'Edge'
    : userAgent.includes('Chrome/')
      ? 'Chrome'
      : userAgent.includes('Firefox/')
        ? 'Firefox'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Browser'
  const platform = userAgent.includes('Mac OS X')
    ? 'macOS'
    : userAgent.includes('Windows')
      ? 'Windows'
      : userAgent.includes('Android')
        ? 'Android'
        : userAgent.includes('iPhone') || userAgent.includes('iPad')
          ? 'iOS'
          : null

  return platform ? `${browser} on ${platform}` : `${browser} session`
}
