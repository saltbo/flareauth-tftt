import { Fingerprint, Laptop, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deletePasskey, revokeOtherSessions, revokeSession } from '@/lib/api/account'
import { signOut } from '@/lib/auth-client'
import { tt } from '@/lib/i18n'
import { AccountPageError, AccountPageLoading, AccountPageShell } from './account-shell'
import {
  DestructiveConfirmationDialog,
  ItemList,
  PanelTitle,
  SettingsAction,
  useDestructiveConfirmation,
} from './primitives'
import { ProfilePasswordPanel } from './profile-page'
import {
  accountQueryKeys,
  useAccountConfig,
  useAccountMutation,
  useAccountPasskeys,
  useAccountProfile,
  useAccountSecurity,
  useAccountSessions,
} from './queries'
import { PasskeyDialog, TotpDialogs } from './security-dialogs'
import { defaultAccountCenterSettings } from './settings'
import type { ConfirmDestructiveHandler, MutationHandler, Passkey, SecurityState, UserSessionDevice } from './types'
import { formatDate, formatSessionDevice, type TotpEnrollmentDisplay } from './utils'

export function AccountSecurityPage() {
  const configQuery = useAccountConfig()
  const profileQuery = useAccountProfile()
  const securityQuery = useAccountSecurity()
  const passkeysQuery = useAccountPasskeys()
  const config = configQuery.data ?? null
  const accountCenter = config?.accountCenter ?? defaultAccountCenterSettings
  const sessionsQuery = useAccountSessions(accountCenter.sessionsViewEnabled)
  const mutate = useAccountMutation()
  const [confirmation, setConfirmation] = useDestructiveConfirmation()
  const queries = [configQuery, profileQuery, securityQuery, passkeysQuery, sessionsQuery]
  const error = queries.find((query) => query.error)?.error
  if (queries.some((query) => query.isLoading)) return <AccountPageLoading config={config} />
  if (error)
    return <AccountPageError config={config} message={error instanceof Error ? error.message : tt('Unable to load.')} />
  const profile = profileQuery.data?.user ?? null
  if (!profile) return <AccountPageError config={config} message={tt('Unable to load account center.')} />
  return (
    <AccountPageShell accountCenter={accountCenter} config={config} profile={profile} section="security">
      <div className="accountSectionStackFlat">
        {accountCenter.passwordChangeEnabled ? <ProfilePasswordPanel profile={profile} /> : null}
        <section className="accountPanelGroup" aria-label={tt('Security settings')}>
          <div className="accountPanelHeader">
            <PanelTitle
              description={tt('Second-factor controls and passwordless sign-in.')}
              icon={<ShieldCheck size={18} />}
              title={tt('Multi-factor and passkeys')}
            />
          </div>
          <SecuritySections
            confirm={setConfirmation}
            mutate={mutate}
            passkeys={passkeysQuery.data?.passkeys ?? []}
            profileEmail={profile.email}
            security={securityQuery.data?.security ?? null}
          />
        </section>
        {accountCenter.sessionsViewEnabled ? (
          <SessionsPanel confirm={setConfirmation} mutate={mutate} sessions={sessionsQuery.data?.sessions ?? []} />
        ) : null}
      </div>
      <DestructiveConfirmationDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />
    </AccountPageShell>
  )
}

function SecuritySections({
  confirm,
  mutate,
  passkeys,
  profileEmail,
  security,
}: {
  confirm: ConfirmDestructiveHandler
  mutate: MutationHandler
  passkeys: Passkey[]
  profileEmail: string
  security: SecurityState | null
}) {
  const [dialog, setDialog] = useState<'mfa-enroll' | 'mfa-verify' | 'mfa-disable' | 'passkey' | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [passkeyName, setPasskeyName] = useState('')
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollmentDisplay | null>(null)
  const mfaRequired = security?.policy.mfa.mode === 'required'
  const mfaEnabled = Boolean(security?.mfa.enabled)
  return (
    <>
      <MfaPanel mfaEnabled={mfaEnabled} mfaRequired={mfaRequired} security={security} setDialog={setDialog} />
      <PasskeysPanel confirm={confirm} mutate={mutate} passkeys={passkeys} security={security} setDialog={setDialog} />
      <TotpDialogs
        code={code}
        dialog={dialog}
        mfaRequired={mfaRequired}
        mutate={mutate}
        password={password}
        profileEmail={profileEmail}
        setCode={setCode}
        setDialog={setDialog}
        setPassword={setPassword}
        setTotpEnrollment={setTotpEnrollment}
        totpEnrollment={totpEnrollment}
      />
      <PasskeyDialog
        dialog={dialog}
        mutate={mutate}
        passkeyName={passkeyName}
        security={security}
        setDialog={setDialog}
        setPasskeyName={setPasskeyName}
      />
    </>
  )
}

function MfaPanel({
  mfaEnabled,
  mfaRequired,
  security,
  setDialog,
}: {
  mfaEnabled: boolean
  mfaRequired: boolean
  security: SecurityState | null
  setDialog: (dialog: 'mfa-enroll' | 'mfa-verify' | 'mfa-disable') => void
}) {
  return (
    <section className="settingsPanel">
      <SettingsAction
        action={
          <div className="settingsActionButtons">
            {mfaEnabled ? (
              <>
                <Button onClick={() => setDialog('mfa-verify')} type="button" variant="secondary">
                  {tt('Verify code')}
                </Button>
                <Button disabled={mfaRequired} onClick={() => setDialog('mfa-disable')} type="button" variant="danger">
                  {tt('Disable MFA')}
                </Button>
              </>
            ) : (
              <Button onClick={() => setDialog('mfa-enroll')} type="button" variant="secondary">
                {tt('Enroll authenticator app')}
              </Button>
            )}
          </div>
        }
        icon={<ShieldCheck size={18} />}
        meta={security?.mfa.enabled ? tt('Authenticator app is enabled.') : tt('No authenticator factor enrolled.')}
        title={tt('Multi-factor authentication')}
      />
    </section>
  )
}

function PasskeysPanel({
  confirm,
  mutate,
  passkeys,
  security,
  setDialog,
}: {
  confirm: ConfirmDestructiveHandler
  mutate: MutationHandler
  passkeys: Passkey[]
  security: SecurityState | null
  setDialog: (dialog: 'passkey') => void
}) {
  return (
    <section className="settingsPanel">
      <SettingsAction
        action={
          <Button
            disabled={!security?.policy.passkeys.enabled}
            onClick={() => setDialog('passkey')}
            type="button"
            variant="secondary"
          >
            <Fingerprint size={18} /> {tt('Add passkey')}
          </Button>
        }
        icon={<Fingerprint size={18} />}
        meta={
          passkeys.length === 1
            ? tt('1 passkey added for passwordless sign-in.')
            : tt('{{count}} passkeys added for passwordless sign-in.', { count: passkeys.length })
        }
        title={tt('Passkeys')}
      />
      <ItemList
        empty={tt('No passkeys have been added yet.')}
        items={passkeys.map((passkey) => ({
          id: passkey.id,
          icon: <Fingerprint size={16} />,
          title: passkey.name ?? tt('Unnamed passkey'),
          meta: `${passkey.deviceType}${passkey.backedUp ? tt(' / backed up') : tt(' / not backed up')}${passkey.createdAt ? tt(' / added {{date}}', { date: formatDate(passkey.createdAt) }) : ''}`,
          action: (
            <Button
              onClick={() =>
                confirm({
                  title: tt('Remove passkey'),
                  description: tt('This passkey will no longer sign in to your account.'),
                  actionLabel: tt('Remove passkey'),
                  onConfirm: () =>
                    mutate('Passkey removed.', () => deletePasskey(passkey.id), {
                      invalidate: [accountQueryKeys.passkeys, accountQueryKeys.security],
                    }),
                })
              }
              type="button"
              variant="ghost"
            >
              {tt('Remove')}
            </Button>
          ),
        }))}
      />
    </section>
  )
}

function SessionsPanel({
  confirm,
  mutate,
  sessions,
}: {
  confirm: ConfirmDestructiveHandler
  mutate: MutationHandler
  sessions: UserSessionDevice[]
}) {
  return (
    <section className="accountPanelGroup" aria-label={tt('Session management')}>
      <div className="accountPanelHeader">
        <PanelTitle
          action={
            <Button
              onClick={() =>
                confirm({
                  title: tt('Revoke other sessions'),
                  description: tt('Every other active session for this account will be signed out.'),
                  actionLabel: tt('Revoke sessions'),
                  onConfirm: () =>
                    mutate('Other sessions revoked.', revokeOtherSessions, { invalidate: [accountQueryKeys.sessions] }),
                })
              }
              type="button"
              variant="secondary"
            >
              {tt('Revoke other sessions')}
            </Button>
          }
          description={tt('Devices currently signed in to this account.')}
          icon={<Laptop size={18} />}
          title={tt('Active sessions')}
        />
      </div>
      <section className="settingsPanel">
        <div className="settingsBody">
          <ItemList
            empty={tt('No active sessions.')}
            items={sessions.map((session) => ({
              id: session.id,
              icon: <Laptop size={16} />,
              title: formatSessionDevice(session.userAgent),
              meta: `${session.ipAddress ?? tt('No IP')} ${tt('/ expires {{date}}', { date: formatDate(session.expiresAt) })}`,
              action: (
                <Button
                  onClick={() =>
                    confirm({
                      title: tt('Revoke session'),
                      description: tt('This device session will be signed out.'),
                      actionLabel: tt('Revoke session'),
                      onConfirm: () => revokeUserSession(session, mutate),
                    })
                  }
                  type="button"
                  variant="ghost"
                >
                  {tt('Revoke')}
                </Button>
              ),
            }))}
          />
        </div>
      </section>
    </section>
  )
}

async function revokeUserSession(session: UserSessionDevice, mutate: MutationHandler) {
  const result = await mutate('Session revoked.', () => revokeSession(session.id), {
    invalidate: session.current ? [] : [accountQueryKeys.sessions],
  })
  if (result && session.current) {
    try {
      await signOut()
    } finally {
      window.location.assign('/auth/sign-in')
    }
  }
}
