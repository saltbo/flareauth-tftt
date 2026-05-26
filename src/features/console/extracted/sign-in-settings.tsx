import {
  consoleQueryKeys,
  getBrandingSettings,
  getSecurityPolicy,
  getSignInSettings,
  updateSecurityPolicy,
  updateSignInSettings,
} from '@/lib/api/management'
import {
  Field,
  type FormEvent,
  type HostedAuthPreviewState,
  SelectInput,
  Switch,
  TextArea,
  TextInput,
  tt,
  updateManagementSignInSettingsRequestSchema,
  useEffect,
  useMutation,
  useQuery,
  useQueryClient,
  useState,
} from '../console-shared'
import { SwitchRow, useConnectorPreviewProviders } from '../helpers/helpers-dialogs'
import {
  ChangesSection,
  HostedAuthPreview,
  SettingsSection,
  SettingsSections,
  SignInExperienceEditorLayout,
  SignInExperiencePage,
} from '../helpers/helpers-preview'
import { lines } from '../helpers/helpers-resource'
import { shallowEqual, useAdminMutation } from '../helpers/helpers-utils'

export function SignInSettingsPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.signIn,
    queryFn: getSignInSettings,
  })
  const brandingQuery = useQuery({
    queryKey: consoleQueryKeys.branding,
    queryFn: getBrandingSettings,
  })
  const securityQuery = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  const connectorsQuery = useConnectorPreviewProviders()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    passkeyLoginEnabled: false,
    passwordlessEnabled: false,
    phoneLoginEnabled: false,
    signupEnabled: true,
    socialLoginEnabled: true,
    web3WalletLoginEnabled: false,
  })
  const [minLength, setMinLength] = useState(8)
  const [requiredCharacterTypes, setRequiredCharacterTypes] = useState(1)
  const [customWords, setCustomWords] = useState('')
  const [rejectUserInfo, setRejectUserInfo] = useState(true)
  const [rejectSequential, setRejectSequential] = useState(true)
  const [rejectCustomWords, setRejectCustomWords] = useState(false)
  const updateMutation = useAdminMutation({
    mutationFn: updateSignInSettings,
    onSuccess: () => {
      return queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.signIn,
      })
    },
  })
  const securityMutation = useMutation({
    mutationFn: () =>
      updateSecurityPolicy({
        policy: {
          passkeys: {
            enabled: form.passkeyLoginEnabled,
          },
          password: {
            minLength,
            requiredCharacterTypes,
            customWords: lines(customWords),
            rejectUserInfo,
            rejectSequential,
            rejectCustomWords,
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
    if (!query.data?.signIn || !query.data.builtInProviders) return
    setForm({
      passkeyLoginEnabled: securityQuery.data?.policy?.passkeys?.enabled ?? false,
      passwordlessEnabled: !query.data.signIn.passwordEnabled,
      phoneLoginEnabled: query.data.builtInProviders.phone.enabled,
      signupEnabled: query.data.signIn.signupEnabled,
      socialLoginEnabled: query.data.signIn.socialLoginEnabled,
      web3WalletLoginEnabled: query.data.builtInProviders.web3Wallet.enabled,
    })
  }, [query.data, securityQuery.data])
  useEffect(() => {
    if (!securityQuery.data?.policy?.password) return
    const policy = securityQuery.data.policy.password
    setMinLength(policy.minLength)
    setRequiredCharacterTypes(policy.requiredCharacterTypes)
    setCustomWords(policy.customWords.join('\n'))
    setRejectUserInfo(policy.rejectUserInfo)
    setRejectSequential(policy.rejectSequential)
    setRejectCustomWords(policy.rejectCustomWords)
  }, [securityQuery.data])
  const loadedForm =
    query.data?.signIn && query.data.builtInProviders
      ? {
          passkeyLoginEnabled: securityQuery.data?.policy?.passkeys?.enabled ?? false,
          passwordlessEnabled: !query.data.signIn.passwordEnabled,
          phoneLoginEnabled: query.data.builtInProviders.phone.enabled,
          signupEnabled: query.data.signIn.signupEnabled,
          socialLoginEnabled: query.data.signIn.socialLoginEnabled,
          web3WalletLoginEnabled: query.data.builtInProviders.web3Wallet.enabled,
        }
      : null
  const hasChanges = loadedForm ? !shallowEqual(form, loadedForm) : false
  const signInHasChanges = loadedForm
    ? !shallowEqual(
        {
          passwordlessEnabled: form.passwordlessEnabled,
          phoneLoginEnabled: form.phoneLoginEnabled,
          signupEnabled: form.signupEnabled,
          socialLoginEnabled: form.socialLoginEnabled,
          web3WalletLoginEnabled: form.web3WalletLoginEnabled,
        },
        {
          passwordlessEnabled: loadedForm.passwordlessEnabled,
          phoneLoginEnabled: loadedForm.phoneLoginEnabled,
          signupEnabled: loadedForm.signupEnabled,
          socialLoginEnabled: loadedForm.socialLoginEnabled,
          web3WalletLoginEnabled: loadedForm.web3WalletLoginEnabled,
        },
      )
    : false
  const passkeyHasChanges = loadedForm ? form.passkeyLoginEnabled !== loadedForm.passkeyLoginEnabled : false
  const loadedPasswordPolicy = securityQuery.data?.policy?.password
    ? {
        minLength: securityQuery.data.policy.password.minLength,
        requiredCharacterTypes: securityQuery.data.policy.password.requiredCharacterTypes,
        customWords: securityQuery.data.policy.password.customWords.join('\n'),
        rejectUserInfo: securityQuery.data.policy.password.rejectUserInfo,
        rejectSequential: securityQuery.data.policy.password.rejectSequential,
        rejectCustomWords: securityQuery.data.policy.password.rejectCustomWords,
      }
    : null
  const passwordPolicyHasChanges = loadedPasswordPolicy
    ? !shallowEqual(
        {
          minLength,
          requiredCharacterTypes,
          customWords,
          rejectUserInfo,
          rejectSequential,
          rejectCustomWords,
        },
        loadedPasswordPolicy,
      )
    : false
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (signInHasChanges && query.data) {
      const payload = updateManagementSignInSettingsRequestSchema.parse({
        builtInProviders: {
          phone: {
            ...query.data.builtInProviders.phone,
            enabled: form.phoneLoginEnabled,
          },
          web3Wallet: {
            ...query.data.builtInProviders.web3Wallet,
            enabled: form.web3WalletLoginEnabled,
          },
        },
        signIn: {
          passwordEnabled: !form.passwordlessEnabled,
          signupEnabled: form.signupEnabled,
          socialLoginEnabled: form.socialLoginEnabled,
        },
      })
      updateMutation.mutate(payload)
    }
    if (passwordPolicyHasChanges || passkeyHasChanges) securityMutation.mutate()
  }
  const preview: HostedAuthPreviewState = {
    productName: query.data?.copy?.productName ?? '',
    headline: query.data?.copy?.headline ?? '',
    description: query.data?.copy?.description ?? '',
    logoUrl: brandingQuery.data?.branding?.logoUrl ?? undefined,
    primaryColor: brandingQuery.data?.branding?.primaryColor ?? undefined,
    backgroundColor: brandingQuery.data?.branding?.backgroundColor ?? undefined,
    customCss: brandingQuery.data?.branding?.customCss ?? undefined,
    passwordEnabled: !form.passwordlessEnabled,
    passkeysEnabled: form.passkeyLoginEnabled,
    phoneEnabled: form.phoneLoginEnabled,
    signupEnabled: form.signupEnabled,
    socialLoginEnabled: form.socialLoginEnabled,
    socialProviders: connectorsQuery.providers,
    oneTapEnabled: query.data?.builtInProviders?.oneTap?.enabled,
    web3WalletEnabled: form.web3WalletLoginEnabled,
    identifierFirst: false,
    usernameEnabled: query.data?.signIn?.usernameEnabled,
    emailOtpEnabled: query.data?.signIn?.emailOtpEnabled,
    termsUri: query.data?.links?.termsUri ?? '',
    privacyUri: query.data?.links?.privacyUri ?? '',
    supportEmail: query.data?.links?.supportEmail ?? '',
  }
  return (
    <SignInExperiencePage
      activeTab="sign-up-and-sign-in"
      description={tt('Configure self-service registration and hosted sign-in method visibility.')}
      error={query.error ?? brandingQuery.error ?? securityQuery.error ?? connectorsQuery.error}
      loading={query.isLoading || brandingQuery.isLoading || securityQuery.isLoading}
      onRetry={() => {
        void query.refetch()
        void brandingQuery.refetch()
        void securityQuery.refetch()
        void connectorsQuery.refetch()
      }}
      title={tt('Sign-up and sign-in')}
    >
      {query.data && securityQuery.data ? (
        <form onSubmit={onSubmit}>
          <SignInExperienceEditorLayout
            preview={<HostedAuthPreview preview={preview} />}
            settings={
              <SettingsSections>
                <SettingsSection
                  title={tt('Sign-up')}
                  description={tt('Control whether new users can create accounts.')}
                >
                  <div className="grid gap-3">
                    <SwitchRow
                      checked={form.signupEnabled}
                      label={tt('Allow sign up')}
                      onCheckedChange={(signupEnabled) =>
                        setForm((value) => ({
                          ...value,
                          signupEnabled,
                        }))
                      }
                    />
                  </div>
                </SettingsSection>
                <SettingsSection
                  title={tt('Sign-in')}
                  description={tt('Control which non-password sign-in methods are available.')}
                >
                  <div className="grid gap-3">
                    <SwitchRow
                      checked={form.socialLoginEnabled}
                      label={tt('Social login')}
                      onCheckedChange={(socialLoginEnabled) =>
                        setForm((value) => ({
                          ...value,
                          socialLoginEnabled,
                        }))
                      }
                    />
                    <SwitchRow
                      checked={form.phoneLoginEnabled}
                      label={tt('Phone login')}
                      onCheckedChange={(phoneLoginEnabled) =>
                        setForm((value) => ({
                          ...value,
                          phoneLoginEnabled,
                        }))
                      }
                    />
                    <SwitchRow
                      checked={form.passkeyLoginEnabled}
                      label={tt('Passkey login')}
                      onCheckedChange={(passkeyLoginEnabled) =>
                        setForm((value) => ({
                          ...value,
                          passkeyLoginEnabled,
                        }))
                      }
                    />
                    <SwitchRow
                      checked={form.web3WalletLoginEnabled}
                      label={tt('Web3 wallet login')}
                      onCheckedChange={(web3WalletLoginEnabled) =>
                        setForm((value) => ({
                          ...value,
                          web3WalletLoginEnabled,
                        }))
                      }
                    />
                  </div>
                </SettingsSection>
                <SettingsSection
                  title={tt('Passwordless')}
                  description={tt(
                    'Turn off password-based hosted auth. Password requirements stay visible but only apply when passwords are used.',
                  )}
                >
                  <div className="grid gap-4">
                    <Field label={tt('Passwordless')}>
                      <div className="flex min-h-10 items-center justify-between gap-4 rounded-md border border-border px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                          {form.passwordlessEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Switch
                          aria-label={tt('Passwordless')}
                          checked={form.passwordlessEnabled}
                          onCheckedChange={(passwordlessEnabled) =>
                            setForm((value) => ({
                              ...value,
                              passwordlessEnabled,
                            }))
                          }
                        />
                      </div>
                    </Field>
                    <Field label={tt('Minimum length')}>
                      <TextInput
                        aria-label={tt('Minimum length')}
                        disabled={form.passwordlessEnabled}
                        min={8}
                        max={128}
                        onChange={(event) => setMinLength(Number(event.target.value))}
                        type="number"
                        value={String(minLength)}
                      />
                    </Field>
                    <Field label={tt('Required character types')}>
                      <SelectInput
                        aria-label={tt('Required character types')}
                        disabled={form.passwordlessEnabled}
                        onChange={(event) => setRequiredCharacterTypes(Number(event.target.value))}
                        value={String(requiredCharacterTypes)}
                      >
                        <option value="1">{tt('1 required character type')}</option>
                        <option value="2">{tt('2 required character types')}</option>
                        <option value="3">{tt('3 required character types')}</option>
                        <option value="4">{tt('4 required character types')}</option>
                      </SelectInput>
                    </Field>
                    <SwitchRow
                      checked={rejectSequential}
                      disabled={form.passwordlessEnabled}
                      label={tt('Reject repetitive or sequential characters')}
                      onCheckedChange={setRejectSequential}
                    />
                    <SwitchRow
                      checked={rejectUserInfo}
                      disabled={form.passwordlessEnabled}
                      label={tt('Reject user information')}
                      onCheckedChange={setRejectUserInfo}
                    />
                    <SwitchRow
                      checked={rejectCustomWords}
                      disabled={form.passwordlessEnabled}
                      label={tt('Reject custom words')}
                      onCheckedChange={setRejectCustomWords}
                    />
                    {rejectCustomWords && !form.passwordlessEnabled ? (
                      <Field label={tt('Custom words')}>
                        <TextArea
                          aria-label={tt('Custom words')}
                          onChange={(event) => setCustomWords(event.target.value)}
                          placeholder={tt('company\nproduct')}
                          value={customWords}
                        />
                      </Field>
                    ) : null}
                  </div>
                </SettingsSection>
                <ChangesSection
                  description={tt('Save updates through the management boundary or restore the loaded values.')}
                  error={
                    updateMutation.errorMessage || securityMutation.error ? (
                      <div className="text-sm text-destructive">
                        {updateMutation.errorMessage ??
                          (securityMutation.error instanceof Error
                            ? tt(securityMutation.error.message)
                            : tt('Request failed.'))}
                      </div>
                    ) : null
                  }
                  onDiscard={() => {
                    if (loadedForm) setForm(loadedForm)
                    if (loadedPasswordPolicy) {
                      setMinLength(loadedPasswordPolicy.minLength)
                      setRequiredCharacterTypes(loadedPasswordPolicy.requiredCharacterTypes)
                      setCustomWords(loadedPasswordPolicy.customWords)
                      setRejectUserInfo(loadedPasswordPolicy.rejectUserInfo)
                      setRejectSequential(loadedPasswordPolicy.rejectSequential)
                      setRejectCustomWords(loadedPasswordPolicy.rejectCustomWords)
                    }
                  }}
                  pending={updateMutation.isPending || securityMutation.isPending}
                  saveLabel="Save sign-in settings"
                  visible={hasChanges || passwordPolicyHasChanges}
                />
              </SettingsSections>
            }
          />
        </form>
      ) : null}
    </SignInExperiencePage>
  )
}
