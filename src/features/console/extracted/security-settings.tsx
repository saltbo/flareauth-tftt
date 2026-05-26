import { consoleQueryKeys, getSecurityPolicy, updateSecurityPolicy } from '@/lib/api/management'
import {
  Field,
  KeyRound,
  LifeBuoy,
  Mail,
  type ReactNode,
  SelectInput,
  SettingRow,
  Smartphone,
  Switch,
  TextArea,
  TextInput,
  tt,
  useEffect,
  useMutation,
  useQuery,
  useQueryClient,
  useState,
} from '../console-shared'
import { MutationError, SwitchRow } from '../helpers/helpers-dialogs'
import { ChangesSection, SettingsSection, SettingsSections } from '../helpers/helpers-preview'
import { lines, ResourcePage, SecuritySectionTabs } from '../helpers/helpers-resource'
import { shallowEqual } from '../helpers/helpers-utils'
import { SignInSettingsPage } from './sign-in-settings'

export function MfaPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'optional' | 'required'>('optional')
  const [passkeysEnabled, setPasskeysEnabled] = useState(true)
  const [authenticatorAppEnabled, setAuthenticatorAppEnabled] = useState(true)
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false)
  const [backupCodesEnabled, setBackupCodesEnabled] = useState(true)
  const updateMutation = useMutation({
    mutationFn: () =>
      updateSecurityPolicy({
        policy: {
          mfa: {
            mode,
            authenticatorAppEnabled,
            emailOtpEnabled,
            backupCodesEnabled,
          },
          passkeys: {
            enabled: passkeysEnabled,
          },
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.security,
      })
    },
  })
  useEffect(() => {
    if (!query.data) return
    setMode(query.data.policy.mfa.mode)
    setPasskeysEnabled(query.data.policy.passkeys.enabled)
    setAuthenticatorAppEnabled(query.data.policy.mfa.authenticatorAppEnabled ?? true)
    setEmailOtpEnabled(query.data.policy.mfa.emailOtpEnabled ?? false)
    setBackupCodesEnabled(query.data.policy.mfa.backupCodesEnabled ?? true)
  }, [query.data])
  const loadedPolicy = query.data
    ? {
        mode: query.data.policy.mfa.mode,
        passkeysEnabled: query.data.policy.passkeys.enabled,
        authenticatorAppEnabled: query.data.policy.mfa.authenticatorAppEnabled ?? true,
        emailOtpEnabled: query.data.policy.mfa.emailOtpEnabled ?? false,
        backupCodesEnabled: query.data.policy.mfa.backupCodesEnabled ?? true,
      }
    : null
  const hasChanges = loadedPolicy
    ? !shallowEqual(
        {
          mode,
          passkeysEnabled,
          authenticatorAppEnabled,
          emailOtpEnabled,
          backupCodesEnabled,
        },
        loadedPolicy,
      )
    : false
  return (
    <ResourcePage
      title={tt('Multi-factor authentication')}
      description={tt('Review tenant MFA factors and deployment policy for hosted account protection.')}
      error={query.error}
      framed={false}
      loading={query.isLoading}
      onRetry={() => query.refetch()}
    >
      {query.data ? (
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            updateMutation.mutate()
          }}
        >
          <SettingsSections>
            <SettingsSection
              title={tt('Factors')}
              description={tt('Available second factors surfaced by account and deployment support.')}
            >
              <div className="grid gap-3">
                <MfaFactorSwitch
                  checked={passkeysEnabled}
                  description={`Use WebAuthn passkeys for this tenant (${query.data.policy.passkeys.rpName}).`}
                  icon={<KeyRound size={18} />}
                  label={tt('Passkeys')}
                  onCheckedChange={setPasskeysEnabled}
                />
                <MfaFactorSwitch
                  checked={authenticatorAppEnabled}
                  description={tt('Allow users to enroll an authenticator app and verify time-based codes.')}
                  icon={<Smartphone size={18} />}
                  label={tt('Authenticator app')}
                  onCheckedChange={setAuthenticatorAppEnabled}
                />
                <MfaFactorSwitch
                  checked={emailOtpEnabled}
                  description={tt(
                    'Allow email verification codes as a second factor when email delivery is configured.',
                  )}
                  icon={<Mail size={18} />}
                  label={tt('Email verification code')}
                  onCheckedChange={setEmailOtpEnabled}
                />
                <MfaFactorSwitch
                  checked={backupCodesEnabled}
                  description={tt('Allow recovery backup codes generated during authenticator enrollment.')}
                  icon={<LifeBuoy size={18} />}
                  label={tt('Backup codes')}
                  onCheckedChange={setBackupCodesEnabled}
                />
              </div>
            </SettingsSection>
            <SettingsSection
              title={tt('Policy controls')}
              description={tt('Prompt policy is persisted for hosted account access.')}
            >
              <div className="grid gap-4">
                <Field label={tt('Prompt policy')}>
                  <SelectInput
                    aria-label={tt('Prompt policy')}
                    onChange={(event) => setMode(event.target.value as 'optional' | 'required')}
                    value={mode}
                  >
                    <option value="required">{tt('Required')}</option>
                    <option value="optional">{tt('Optional')}</option>
                  </SelectInput>
                </Field>
                <SettingRow label={tt('Persisted mode')} value={query.data.policy.mfa.mode} />
              </div>
            </SettingsSection>
            <ChangesSection
              description={tt('Save or reset tenant MFA policy changes.')}
              error={<MutationError error={updateMutation.error} />}
              onDiscard={() => {
                if (!loadedPolicy) return
                setMode(loadedPolicy.mode)
                setPasskeysEnabled(loadedPolicy.passkeysEnabled)
                setAuthenticatorAppEnabled(loadedPolicy.authenticatorAppEnabled)
                setEmailOtpEnabled(loadedPolicy.emailOtpEnabled)
                setBackupCodesEnabled(loadedPolicy.backupCodesEnabled)
              }}
              pending={updateMutation.isPending}
              saveLabel="Save changes"
              visible={hasChanges}
            />
          </SettingsSections>
        </form>
      ) : null}
    </ResourcePage>
  )
}
function MfaFactorSwitch({
  checked,
  description,
  icon,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  icon: ReactNode
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border p-3">
      <div
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-muted text-primary"
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold leading-5">{label}</div>
        <p className="m-0 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch aria-label={label} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
export function SecurityPasswordPolicyPage() {
  return <SignInSettingsPage />
}
export function SecurityCaptchaPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(false)
  const [siteKey, setSiteKey] = useState('')
  const [secretBinding, setSecretBinding] = useState('')
  const updateMutation = useMutation({
    mutationFn: () =>
      updateSecurityPolicy({
        policy: {
          captcha: {
            enabled,
            provider: 'turnstile',
            siteKey,
            secretBinding,
          },
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.security,
      })
    },
  })
  useEffect(() => {
    if (!query.data) return
    setEnabled(query.data.policy.captcha.enabled)
    setSiteKey(query.data.policy.captcha.siteKey)
    setSecretBinding(query.data.policy.captcha.secretBinding)
  }, [query.data])
  const loadedPolicy = query.data
    ? {
        enabled: query.data.policy.captcha.enabled,
        siteKey: query.data.policy.captcha.siteKey,
        secretBinding: query.data.policy.captcha.secretBinding,
      }
    : null
  const hasChanges = loadedPolicy
    ? !shallowEqual(
        {
          enabled,
          siteKey,
          secretBinding,
        },
        loadedPolicy,
      )
    : false
  return (
    <ResourcePage
      title={tt('CAPTCHA')}
      description={tt('Review CAPTCHA provider setup for hosted sign-up, sign-in, and password recovery flows.')}
      error={query.error}
      framed={false}
      loading={query.isLoading}
      onRetry={() => query.refetch()}
    >
      <SecuritySectionTabs active="captcha" />
      {query.data ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            updateMutation.mutate()
          }}
        >
          <SettingsSections>
            <SettingsSection
              title={tt('Provider setup')}
              description={tt('Configure Turnstile verification for hosted flows.')}
            >
              <div className="grid gap-4">
                <SwitchRow checked={enabled} label={tt('Enable CAPTCHA')} onCheckedChange={setEnabled} />
                <Field label={tt('Provider')}>
                  <SelectInput aria-label={tt('Provider')} onChange={() => undefined} value="turnstile">
                    <option value="turnstile">{tt('Turnstile')}</option>
                  </SelectInput>
                </Field>
                <Field label={tt('Site key')}>
                  <TextInput
                    aria-label={tt('Site key')}
                    onChange={(event) => setSiteKey(event.target.value)}
                    value={siteKey}
                  />
                </Field>
                <Field label={tt('Client secret')}>
                  <TextInput
                    aria-label={tt('Client secret')}
                    onChange={(event) => setSecretBinding(event.target.value)}
                    placeholder={tt('TURNSTILE_SECRET')}
                    value={secretBinding}
                  />
                </Field>
              </div>
            </SettingsSection>
            <ChangesSection
              description={tt('Save or reset CAPTCHA policy changes.')}
              error={<MutationError error={updateMutation.error} />}
              onDiscard={() => {
                if (!loadedPolicy) return
                setEnabled(loadedPolicy.enabled)
                setSiteKey(loadedPolicy.siteKey)
                setSecretBinding(loadedPolicy.secretBinding)
              }}
              pending={updateMutation.isPending}
              saveLabel="Save changes"
              visible={hasChanges}
            />
          </SettingsSections>
        </form>
      ) : null}
    </ResourcePage>
  )
}
export function SecurityBlocklistPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  const queryClient = useQueryClient()
  const [blockSubaddressing, setBlockSubaddressing] = useState(false)
  const [entries, setEntries] = useState('')
  const updateMutation = useMutation({
    mutationFn: () =>
      updateSecurityPolicy({
        policy: {
          blocklist: {
            blockSubaddressing,
            entries: lines(entries),
          },
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.security,
      })
    },
  })
  useEffect(() => {
    if (!query.data) return
    setBlockSubaddressing(query.data.policy.blocklist.blockSubaddressing)
    setEntries(query.data.policy.blocklist.entries.join('\n'))
  }, [query.data])
  const loadedPolicy = query.data
    ? {
        blockSubaddressing: query.data.policy.blocklist.blockSubaddressing,
        entries: query.data.policy.blocklist.entries.join('\n'),
      }
    : null
  const hasChanges = loadedPolicy
    ? !shallowEqual(
        {
          blockSubaddressing,
          entries,
        },
        loadedPolicy,
      )
    : false
  return (
    <ResourcePage
      title={tt('Blocklist')}
      description={tt('Review sign-up blocklist settings for email aliases, addresses, and domains.')}
      error={query.error}
      framed={false}
      loading={query.isLoading}
      onRetry={() => query.refetch()}
    >
      <SecuritySectionTabs active="blocklist" />
      {query.data ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            updateMutation.mutate()
          }}
        >
          <SettingsSections>
            <SettingsSection title={tt('Email blocklist')} description={tt('Persist blocked email and domain rules.')}>
              <div className="grid gap-4">
                <SwitchRow
                  checked={blockSubaddressing}
                  label={tt('Block email subaddressing')}
                  onCheckedChange={setBlockSubaddressing}
                />
                <Field
                  label={tt('Custom email and domain blocklist')}
                  help={tt('One email address or domain per line.')}
                >
                  <TextArea
                    aria-label={tt('Custom email and domain blocklist')}
                    onChange={(event) => setEntries(event.target.value)}
                    placeholder={tt('blocked@example.com\nexample.org')}
                    value={entries}
                  />
                </Field>
              </div>
            </SettingsSection>
            <ChangesSection
              description={tt('Save or reset blocklist changes.')}
              error={<MutationError error={updateMutation.error} />}
              onDiscard={() => {
                if (!loadedPolicy) return
                setBlockSubaddressing(loadedPolicy.blockSubaddressing)
                setEntries(loadedPolicy.entries)
              }}
              pending={updateMutation.isPending}
              saveLabel="Save changes"
              visible={hasChanges}
            />
          </SettingsSections>
        </form>
      ) : null}
    </ResourcePage>
  )
}
export function SecurityGeneralPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  return (
    <ResourcePage
      title={tt('General security')}
      description={tt('Review general protections tied to current deployment security policy.')}
      error={query.error}
      framed={false}
      loading={query.isLoading}
      onRetry={() => query.refetch()}
    >
      <SecuritySectionTabs active="general" />
      {query.data ? (
        <SettingsSections>
          <SettingsSection
            title={tt('Protection')}
            description={tt('Tenant sign-in protections from persisted policy.')}
          >
            <div className="grid gap-3">
              <SettingRow label={tt('MFA enforcement')} value={query.data.policy.mfa.mode} />
              <SettingRow label={tt('Passkeys')} value={query.data.policy.passkeys.enabled ? 'Enabled' : 'Disabled'} />
              <SettingRow
                label={tt('CAPTCHA')}
                value={query.data.policy.captcha.enabled ? 'Enabled for hosted flows' : 'Disabled'}
              />
              <SettingRow
                label={tt('Email blocklist entries')}
                value={String(query.data.policy.blocklist.entries.length)}
              />
              <SettingRow label={tt('Password minimum')} value={`${query.data.policy.password.minLength} characters`} />
            </div>
          </SettingsSection>
          <SettingsSection
            title={tt('Session policy')}
            description={tt('Session lifetime values currently active in runtime.')}
          >
            <div className="grid gap-3">
              <SettingRow label={tt('Session TTL')} value={`${query.data.policy.sessions.expiresInSeconds}s`} />
              <SettingRow label={tt('Fresh age')} value={`${query.data.policy.sessions.freshAgeSeconds}s`} />
            </div>
          </SettingsSection>
          <SettingsSection
            title={tt('Headers and cookies')}
            description={tt('Runtime-managed browser protection settings.')}
          >
            <div className="grid gap-3">
              <SettingRow label={tt('Security headers')} value="Managed by Worker middleware" />
              <SettingRow label={tt('Cookie cache')} value={`${query.data.policy.sessions.cookieCacheSeconds}s`} />
            </div>
          </SettingsSection>
        </SettingsSections>
      ) : null}
    </ResourcePage>
  )
}
