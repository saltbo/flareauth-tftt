import {
  Field,
  type ManagementSignInSettingsResponse,
  type SecurityPolicy,
  SelectInput,
  SettingRow,
  type SmsProviderId,
  Switch,
  smsProviderOptions,
  TextInput,
  tt,
  type updateManagementSignInSettingsRequestSchema,
  useEffect,
  useState,
  type z,
} from '../../console-shared'
import { shallowEqual } from '../../helpers/helpers-utils'
import {
  BuiltInProviderSwitch,
  BuiltinProviderForm,
  defaultEmailProviderSettings,
  defaultOneTapProviderSettings,
  defaultPhoneProviderSettings,
  defaultWeb3ProviderSettings,
  NumberField,
  ProviderRuntime,
  SelectField,
  SmsProviderFields,
  submitBuiltIn,
  web3ChainOptions,
} from './builtin-provider-controls'

type BuiltinProvider = {
  providerId: string
}

export function BuiltinProviderPanel({
  builtInProviders,
  error,
  onUpdatePasskey,
  onUpdateSignIn,
  pending,
  provider,
  security,
}: {
  builtInProviders: ManagementSignInSettingsResponse['builtInProviders'] | null
  error: string | null
  onUpdatePasskey: (enabled: boolean) => void
  onUpdateSignIn: (input: z.infer<typeof updateManagementSignInSettingsRequestSchema>) => void
  pending: boolean
  provider: BuiltinProvider
  security: SecurityPolicy | null
}) {
  const [emailForm, setEmailForm] = useState(defaultEmailProviderSettings())
  const [passkeyEnabled, setPasskeyEnabled] = useState(false)
  const [passkeyAllowSignUp, setPasskeyAllowSignUp] = useState(true)
  const [phoneForm, setPhoneForm] = useState(defaultPhoneProviderSettings())
  const [web3Form, setWeb3Form] = useState(defaultWeb3ProviderSettings())
  const [oneTapForm, setOneTapForm] = useState(defaultOneTapProviderSettings())
  useEffect(() => setPasskeyEnabled(security?.passkeys.enabled ?? false), [security])
  useEffect(() => {
    setEmailForm({ ...defaultEmailProviderSettings(), ...(builtInProviders?.email ?? {}) })
    setPhoneForm({ ...defaultPhoneProviderSettings(), ...(builtInProviders?.phone ?? {}) })
    setWeb3Form({ ...defaultWeb3ProviderSettings(), ...(builtInProviders?.web3Wallet ?? {}) })
    setPasskeyAllowSignUp(builtInProviders?.passkey.allowSignUp ?? true)
    setOneTapForm({ ...defaultOneTapProviderSettings(), ...(builtInProviders?.oneTap ?? {}) })
  }, [builtInProviders])

  if (provider.providerId === 'email') {
    const loaded = { ...defaultEmailProviderSettings(), ...(builtInProviders?.email ?? {}) }
    return (
      <BuiltinProviderForm
        error={error}
        hasChanges={!shallowEqual(emailForm, loaded)}
        onSubmit={(event) => submitBuiltIn(event, () => onUpdateSignIn({ builtInProviders: { email: emailForm } }))}
        pending={pending}
      >
        <BuiltInProviderSwitch
          checked={emailForm.enabled}
          description={tt('Allow users to receive a one-time sign-in code by email.')}
          label={tt('Enabled')}
          onCheckedChange={(enabled) => setEmailForm((current) => ({ ...current, enabled }))}
        />
        <NumberField
          label="OTP length"
          onChange={(otpLength) => setEmailForm((current) => ({ ...current, otpLength }))}
          value={emailForm.otpLength}
        />
        <NumberField
          label="Code expiry seconds"
          onChange={(expiresInSeconds) => setEmailForm((current) => ({ ...current, expiresInSeconds }))}
          value={emailForm.expiresInSeconds}
        />
      </BuiltinProviderForm>
    )
  }

  if (provider.providerId === 'passkey') {
    const loadedAllowSignUp = builtInProviders?.passkey.allowSignUp ?? true
    const hasPasskeyEnabledChanges = passkeyEnabled !== Boolean(security?.passkeys.enabled)
    const hasChanges = hasPasskeyEnabledChanges || passkeyAllowSignUp !== loadedAllowSignUp
    return (
      <BuiltinProviderForm
        error={error}
        hasChanges={hasChanges}
        onSubmit={(event) =>
          submitBuiltIn(event, () => {
            if (hasPasskeyEnabledChanges) onUpdatePasskey(passkeyEnabled)
            if (passkeyAllowSignUp !== loadedAllowSignUp) {
              onUpdateSignIn({ builtInProviders: { passkey: { allowSignUp: passkeyAllowSignUp } } })
            }
          })
        }
        pending={pending}
      >
        <BuiltInProviderSwitch
          checked={passkeyEnabled}
          description={`Use WebAuthn passkeys for this tenant (${security?.passkeys.rpName ?? 'tenant'}).`}
          label={tt('Enabled')}
          onCheckedChange={setPasskeyEnabled}
        />
        <BuiltInProviderSwitch
          checked={passkeyAllowSignUp}
          description={tt(
            'Allow passkeys to participate in the registration path. If a new user has no account information, they will be asked to sign in with another method first and then bind a passkey.',
          )}
          label={tt('Allow for sign-up')}
          onCheckedChange={setPasskeyAllowSignUp}
        />
        <SettingRow label={tt('Relying party')} value={security?.passkeys.rpName ?? 'Not loaded'} />
      </BuiltinProviderForm>
    )
  }

  if (provider.providerId === 'phone') {
    const loaded = { ...defaultPhoneProviderSettings(), ...(builtInProviders?.phone ?? {}) }
    return (
      <BuiltinProviderForm
        error={error}
        hasChanges={!shallowEqual(phoneForm, loaded)}
        onSubmit={(event) => submitBuiltIn(event, () => onUpdateSignIn({ builtInProviders: { phone: phoneForm } }))}
        pending={pending}
      >
        <BuiltInProviderSwitch
          checked={phoneForm.enabled}
          description={tt('Show phone number sign-in and verification flows.')}
          label={tt('Enabled')}
          onCheckedChange={(enabled) => setPhoneForm((current) => ({ ...current, enabled }))}
        />
        <Field label={tt('SMS provider')}>
          <SelectInput
            onChange={(event) =>
              setPhoneForm((current) => ({ ...current, smsProvider: event.target.value as SmsProviderId }))
            }
            value={phoneForm.smsProvider}
          >
            {smsProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <SmsProviderFields form={phoneForm} setForm={setPhoneForm} />
        <NumberField
          label="OTP length"
          onChange={(otpLength) => setPhoneForm((current) => ({ ...current, otpLength }))}
          value={phoneForm.otpLength}
        />
        <NumberField
          label="Code expiry seconds"
          onChange={(expiresInSeconds) => setPhoneForm((current) => ({ ...current, expiresInSeconds }))}
          value={phoneForm.expiresInSeconds}
        />
        <BuiltInProviderSwitch
          checked={phoneForm.requireVerification}
          description={tt('Require phone verification before phone sign-in.')}
          label={tt('Require verification')}
          onCheckedChange={(requireVerification) => setPhoneForm((current) => ({ ...current, requireVerification }))}
        />
      </BuiltinProviderForm>
    )
  }

  if (provider.providerId === 'web3-wallet') {
    const loaded = { ...defaultWeb3ProviderSettings(), ...(builtInProviders?.web3Wallet ?? {}) }
    return (
      <BuiltinProviderForm
        error={error}
        hasChanges={!shallowEqual(web3Form, loaded)}
        onSubmit={(event) => submitBuiltIn(event, () => onUpdateSignIn({ builtInProviders: { web3Wallet: web3Form } }))}
        pending={pending}
      >
        <BuiltInProviderSwitch
          checked={web3Form.enabled}
          description={tt('Enable Sign In With Ethereum wallet authentication.')}
          label={tt('Enabled')}
          onCheckedChange={(enabled) => setWeb3Form((current) => ({ ...current, enabled }))}
        />
        <Field label={tt('Enabled chains')}>
          <div className="grid gap-3">
            {web3ChainOptions.map((chain) => (
              <div
                className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2"
                key={chain.id}
              >
                <span className="text-sm font-medium">{chain.label}</span>
                <Switch
                  aria-label={chain.label}
                  checked={web3Form.chains.includes(chain.id)}
                  onCheckedChange={(checked) =>
                    setWeb3Form((current) => ({
                      ...current,
                      chains: checked
                        ? Array.from(new Set([...current.chains, chain.id]))
                        : current.chains.filter((id) => id !== chain.id),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </Field>
        <BuiltInProviderSwitch
          checked={web3Form.allowSignUp}
          description={tt(
            'Allow wallets to participate in the registration path. If a new user has no account information, they will be asked to sign in with another method first and then bind a wallet.',
          )}
          label={tt('Allow for sign-up')}
          onCheckedChange={(allowSignUp) => setWeb3Form((current) => ({ ...current, allowSignUp }))}
        />
        <BuiltInProviderSwitch
          checked={web3Form.ensLookupEnabled}
          description={tt('Use ENS lookup for wallet display names and avatars when available.')}
          label={tt('ENS lookup')}
          onCheckedChange={(ensLookupEnabled) => setWeb3Form((current) => ({ ...current, ensLookupEnabled }))}
        />
      </BuiltinProviderForm>
    )
  }

  if (provider.providerId === 'onetap') {
    const loaded = { ...defaultOneTapProviderSettings(), ...(builtInProviders?.oneTap ?? {}) }
    return (
      <BuiltinProviderForm
        error={error}
        hasChanges={!shallowEqual(oneTapForm, loaded)}
        onSubmit={(event) => submitBuiltIn(event, () => onUpdateSignIn({ builtInProviders: { oneTap: oneTapForm } }))}
        pending={pending}
      >
        <BuiltInProviderSwitch
          checked={oneTapForm.enabled}
          description={tt('Enable Google One Tap on hosted sign-in.')}
          label={tt('Enabled')}
          onCheckedChange={(enabled) => setOneTapForm((current) => ({ ...current, enabled }))}
        />
        <Field label={tt('Client ID')}>
          <TextInput
            onChange={(event) => setOneTapForm((current) => ({ ...current, clientId: event.target.value }))}
            value={oneTapForm.clientId}
          />
        </Field>
        <SelectField
          label="UX mode"
          onChange={(uxMode) => setOneTapForm((current) => ({ ...current, uxMode: uxMode as never }))}
          options={['popup', 'redirect']}
          value={oneTapForm.uxMode}
        />
        <SelectField
          label="Context"
          onChange={(context) => setOneTapForm((current) => ({ ...current, context: context as never }))}
          options={['signin', 'signup', 'use']}
          value={oneTapForm.context}
        />
        <BuiltInProviderSwitch
          checked={oneTapForm.autoSelect}
          description={tt('Automatically select the Google account when possible.')}
          label={tt('Auto select')}
          onCheckedChange={(autoSelect) => setOneTapForm((current) => ({ ...current, autoSelect }))}
        />
        <BuiltInProviderSwitch
          checked={oneTapForm.cancelOnTapOutside}
          description={tt('Allow the prompt to close when users tap outside it.')}
          label={tt('Cancel on outside tap')}
          onCheckedChange={(cancelOnTapOutside) => setOneTapForm((current) => ({ ...current, cancelOnTapOutside }))}
        />
        <NumberField
          label="Prompt base delay"
          onChange={(promptBaseDelayMs) => setOneTapForm((current) => ({ ...current, promptBaseDelayMs }))}
          value={oneTapForm.promptBaseDelayMs}
        />
        <NumberField
          label="Prompt max attempts"
          onChange={(promptMaxAttempts) => setOneTapForm((current) => ({ ...current, promptMaxAttempts }))}
          value={oneTapForm.promptMaxAttempts}
        />
      </BuiltinProviderForm>
    )
  }

  return <ProviderRuntime providerId={provider.providerId} />
}
