import { KeyRound, LockKeyhole, Mail, Pencil, UserRound } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  changeAccountPassword,
  confirmAccountEmailChange,
  requestAccountEmailChange,
  updateAccountProfile,
  uploadAccountAvatar,
} from '@/lib/api/account'
import { tt } from '@/lib/i18n'
import { AccountPageError, AccountPageLoading, AccountPageShell } from './account-shell'
import { PanelTitle, SettingsAction, UnavailableSection } from './primitives'
import { ProfileDialogs } from './profile-dialogs'
import { accountQueryKeys, useAccountConfig, useAccountMutation, useAccountProfile } from './queries'
import { defaultAccountCenterSettings } from './settings'
import type { MutationHandler, UserProfile } from './types'

export function AccountProfilePage() {
  const configQuery = useAccountConfig()
  const profileQuery = useAccountProfile()
  const mutate = useAccountMutation()
  const config = configQuery.data ?? null
  const accountCenter = config?.accountCenter ?? defaultAccountCenterSettings
  const error = configQuery.error ?? profileQuery.error
  if (configQuery.isLoading || profileQuery.isLoading) return <AccountPageLoading config={config} />
  if (error)
    return <AccountPageError config={config} message={error instanceof Error ? error.message : tt('Unable to load.')} />
  const profile = profileQuery.data?.user ?? null
  return (
    <AccountPageShell accountCenter={accountCenter} config={config} profile={profile} section="profile">
      <div className="accountProfilePage">
        {profile ? <h1 className="accountPageTitle">{profile.displayName}</h1> : null}
        <section className="accountPanelGroup accountProfileDetails" aria-label={tt('Profile settings')}>
          {profile && accountCenter.profileEditingEnabled ? (
            <ProfileSections accountCenter={accountCenter} profile={profile} mutate={mutate} />
          ) : (
            <UnavailableSection message={tt('Profile editing is disabled for this account center.')} />
          )}
        </section>
      </div>
    </AccountPageShell>
  )
}

export function ProfilePasswordPanel({ profile }: { profile: UserProfile }) {
  const mutate = useAccountMutation()
  const accountCenter = defaultAccountCenterSettings
  return (
    <section className="accountPanelGroup" aria-label={tt('Password settings')}>
      <div className="accountPanelHeader">
        <PanelTitle
          description={tt('Hosted sign-in credential rotation.')}
          icon={<KeyRound size={18} />}
          title={tt('Password')}
        />
      </div>
      <ProfileSections accountCenter={accountCenter} mode="password" profile={profile} mutate={mutate} />
    </section>
  )
}

function ProfileSections({
  accountCenter,
  mode = 'profile-account',
  profile,
  mutate,
}: {
  accountCenter: typeof defaultAccountCenterSettings
  mode?: 'profile-account' | 'password'
  profile: UserProfile
  mutate: MutationHandler
}) {
  const [dialog, setDialog] = useState<'avatar' | 'displayName' | 'username' | 'email' | 'password' | null>(null)
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
    const result = await mutate(
      'Profile updated.',
      () => updateAccountProfile({ displayName, username: username || null, avatarAssetId: avatarAssetId || null }),
      { invalidate: [accountQueryKeys.profile] },
    )
    if (result) setDialog(null)
  }
  async function changeEmail(event: FormEvent) {
    event.preventDefault()
    if (emailStep === 'request') {
      const result = await mutate('Verification code sent.', () => requestAccountEmailChange({ email }))
      if (result) {
        setEmailOtp('')
        setEmailStep('confirm')
      }
      return
    }
    const result = await mutate('Email changed.', () => confirmAccountEmailChange({ email, otp: emailOtp }), {
      invalidate: [accountQueryKeys.profile],
    })
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
      { invalidate: [accountQueryKeys.sessions], onError: setPasswordError },
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
    return mutate('Avatar uploaded.', () => uploadAccountAvatar(file)).then((response) => {
      if (response) {
        setAvatarAssetId(response.asset.id)
        setAvatarPreview(response.asset.publicUrl)
      }
      return response
    })
  }
  return (
    <>
      {mode === 'profile-account' ? (
        <>
          <ProfileIdentityRows accountCenter={accountCenter} profile={profile} setDialog={setDialog} />
          <ProfileIdentifierRows accountCenter={accountCenter} profile={profile} setDialog={setDialog} />
        </>
      ) : null}
      {accountCenter.passwordChangeEnabled && mode === 'password' ? (
        <section className="settingsPanel">
          <SettingsAction
            action={
              <Button onClick={() => setDialog('password')} type="button" variant="secondary">
                <KeyRound size={18} /> {tt('Change password')}
              </Button>
            }
            icon={<LockKeyhole size={18} />}
            meta={tt('Use this when you need to rotate your hosted sign-in password.')}
            title={tt('Password')}
            value={tt('Hosted sign-in')}
          />
        </section>
      ) : null}
      <ProfileDialogs
        avatarPreview={avatarPreview}
        changeEmail={changeEmail}
        changePassword={changePassword}
        currentPassword={currentPassword}
        dialog={dialog}
        displayName={displayName}
        email={email}
        emailOtp={emailOtp}
        emailStep={emailStep}
        newPassword={newPassword}
        passwordError={passwordError}
        profile={profile}
        saveProfile={saveProfile}
        setCurrentPassword={setCurrentPassword}
        setDialog={setDialog}
        setDisplayName={setDisplayName}
        setEmail={setEmail}
        setEmailOtp={setEmailOtp}
        setEmailStep={setEmailStep}
        setNewPassword={setNewPassword}
        setUsername={setUsername}
        uploadAvatar={uploadAvatar}
        username={username}
      />
    </>
  )
}

function ProfileIdentityRows({
  accountCenter,
  profile,
  setDialog,
}: {
  accountCenter: typeof defaultAccountCenterSettings
  profile: UserProfile
  setDialog: (dialog: 'avatar' | 'displayName') => void
}) {
  return (
    <section className="settingsPanel">
      {accountCenter.avatarEditable ? (
        <SettingsAction
          action={
            <Button onClick={() => setDialog('avatar')} type="button" variant="secondary">
              <Pencil size={16} /> {tt('Change avatar')}
            </Button>
          }
          icon={
            profile.image ? (
              <img alt="" className="accountProfileRowAvatar" src={profile.image} width="36" height="36" />
            ) : (
              <UserRound size={18} />
            )
          }
          meta={tt('Shown across trusted applications.')}
          title={tt('Avatar')}
          value={profile.image ? tt('Custom image') : tt('Default avatar')}
        />
      ) : null}
      {accountCenter.displayNameEditable ? (
        <SettingsAction
          action={
            <Button onClick={() => setDialog('displayName')} type="button" variant="secondary">
              <Pencil size={16} /> {tt('Edit display name')}
            </Button>
          }
          icon={<UserRound size={18} />}
          meta={tt('Shown across trusted applications.')}
          title={tt('Display name')}
          value={profile.displayName}
        />
      ) : null}
    </section>
  )
}

function ProfileIdentifierRows({
  accountCenter,
  profile,
  setDialog,
}: {
  accountCenter: typeof defaultAccountCenterSettings
  profile: UserProfile
  setDialog: (dialog: 'username' | 'email') => void
}) {
  if (!accountCenter.usernameEditable && !accountCenter.emailChangeEnabled) return null
  return (
    <section className="settingsPanel">
      {accountCenter.usernameEditable ? (
        <SettingsAction
          action={
            <Button onClick={() => setDialog('username')} type="button" variant="secondary">
              {tt('Edit username')}
            </Button>
          }
          icon={<UserRound size={18} />}
          meta={tt('Public account handle.')}
          title={tt('Username')}
          value={profile.username ? `@${profile.username}` : tt('No username set')}
        />
      ) : null}
      {accountCenter.emailChangeEnabled ? (
        <SettingsAction
          action={
            <Button onClick={() => setDialog('email')} type="button" variant="secondary">
              <Mail size={18} /> {tt('Change email')}
            </Button>
          }
          icon={<Mail size={18} />}
          meta={tt('Used for sign-in and account notifications.')}
          status={profile.emailVerified ? tt('Verified') : tt('Unverified')}
          title={tt('Email')}
          value={profile.email}
        />
      ) : null}
    </section>
  )
}
