import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  Mail,
  Smartphone,
  Wallet,
} from 'lucide-react'
import { type ComponentProps, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createSiweMessage } from 'viem/siwe'
import { AuthLayout } from '@/components/layout/auth-layout'
import { ProviderIcon } from '@/components/provider-icon'
import { Button, LinkButton } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { Status } from '@/components/ui/status'
import { ApiRequestError } from '@/lib/api'
import {
  requestEmailOtp,
  requestEmailOtpPasswordReset,
  requestPhoneOtp,
  requestWalletNonce,
  resetPasswordWithEmailOtp,
  signInWithEmailOtp,
  signInWithOneTap,
  signInWithPasskey,
  signInWithPassword,
  signInWithSocial,
  signInWithUsername,
  signInWithWallet,
  signUp,
  verifyEmail,
  verifyEmailOtp,
  verifyPhoneNumber,
  verifySignInTotp,
} from '@/lib/auth-client'
import { tt } from '@/lib/i18n'
import { callbackURL, safeRedirectPath, useConfigz } from './hooks'

type SubmitState = {
  loading: boolean
  message: string | null
  error: string | null
}
type SignInMode = 'password' | 'otp' | 'phone'
type SignInStep = 'credential' | 'otp-code'
declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback': () => void
          'error-callback': () => void
        },
      ) => string
      remove: (widget: string) => void
    }
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            context?: 'signin' | 'signup' | 'use'
            ux_mode?: 'popup' | 'redirect'
            use_fedcm_for_prompt?: boolean
          }) => void
          prompt: (listener?: (notification: GooglePromptNotification) => void) => void
        }
      }
    }
    googleScriptInitialized?: boolean
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}
type GooglePromptNotification = {
  getDismissedReason?: () => string
  getNotDisplayedReason?: () => string
  getSkippedReason?: () => string
  isDismissedMoment?: () => boolean
  isNotDisplayed?: () => boolean
  isSkippedMoment?: () => boolean
}
const initialSubmitState: SubmitState = {
  loading: false,
  message: null,
  error: null,
}
export function SignInPage() {
  const { data: config, error, loading } = useConfigz()
  const [mode, setMode] = useState<SignInMode | null>(null)
  const [step, setStep] = useState<SignInStep>('credential')
  const [submit, setSubmit] = useState(initialSubmitState)
  const [identifier, setIdentifier] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [identifierConfirmed, setIdentifierConfirmed] = useState(false)
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[] | null>(null)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const enabled = config?.signIn
  const callback = callbackURL()
  const authContext = authRequestContext('sign-in')
  const identifierFirst = enabled?.identifierFirst === true
  const socialProviders = config?.identityProviders ?? []
  const primaryMode = useMemo(() => (enabled ? primarySignInMode(enabled) : null), [enabled])
  const activeMode = mode ?? primaryMode
  const showIdentifierStep = identifierFirst && !identifierConfirmed && activeMode !== null
  const needsEmailIdentifier = identifierFirst && activeMode !== 'password' && !identifier.includes('@')
  const resetCaptcha = () => resetCaptchaState(config, setCaptchaToken, setCaptchaResetKey)
  const backToSignIn = () => {
    setMode(null)
    setStep('credential')
    setOtp('')
    setSubmit(initialSubmitState)
    resetCaptcha()
  }
  useEffect(() => {
    setMode((current) => (current === primaryMode ? current : null))
    setStep('credential')
    setOtp('')
  }, [primaryMode])
  async function onPasswordSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      try {
        const useUsername = enabled?.usernameEnabled && !identifier.includes('@')
        const response = useUsername
          ? await signInWithUsername({
              username: identifier,
              password,
              callbackURL: callback,
              rememberMe: true,
              captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
            })
          : await signInWithPassword({
              email: identifier,
              password,
              callbackURL: callback,
              rememberMe: true,
              captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
            })
        if (requiresTwoFactor(response)) {
          setTwoFactorMethods(response.twoFactorMethods ?? [])
          return 'Enter your verification code to finish signing in.'
        }
        navigateAfterAuth(response, callback)
        return 'Signed in. Redirecting to the requested application.'
      } finally {
        resetCaptcha()
      }
    })
  }
  async function onTwoFactorSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      const response = await verifySignInTotp({
        code: twoFactorCode,
        trustDevice: true,
      })
      navigateAfterAuth(response, callback)
      return 'Code accepted. Redirecting to the requested application.'
    })
  }
  async function onOtpSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      if (step !== 'otp-code') {
        return sendOtpCode()
      }
      const response = await signInWithEmailOtp({
        email: identifier,
        otp,
      })
      navigateAfterAuth(response, callback)
      return 'Code accepted. Redirecting to the requested application.'
    })
  }
  async function onPhoneSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      if (step !== 'otp-code') {
        await requestPhoneOtp({
          phoneNumber,
        })
        setOtp('')
        setStep('otp-code')
        return 'One-time code sent. Enter it here to finish signing in.'
      }
      const response = await verifyPhoneNumber({
        phoneNumber,
        code: otp,
      })
      navigateAfterAuth(response, callback)
      return 'Code accepted. Redirecting to the requested application.'
    })
  }
  async function onPasskeySubmit() {
    await submitRequest(setSubmit, async () => {
      const response = await signInWithPasskey()
      navigateAfterAuth(response, callback)
      return 'Signed in with passkey. Redirecting to the requested application.'
    })
  }
  async function onWalletSubmit() {
    await submitRequest(setSubmit, async () => {
      try {
        const response = await signInWithEthereum(config?.builtInProviders.web3Wallet.chains ?? [1], callback)
        navigateAfterAuth(response, callback)
        return 'Signed in with wallet. Redirecting to the requested application.'
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 403) {
          redirectToMissingEmailSignUp()
          return 'Redirecting to sign-in help.'
        }
        throw error
      }
    })
  }
  async function onOneTapSubmit() {
    await submitRequest(setSubmit, async () => {
      const response = await signInWithGoogleOneTap(config?.builtInProviders.oneTap, callback)
      navigateAfterAuth(response, callback)
      return 'Signed in with Google One Tap. Redirecting to the requested application.'
    })
  }
  async function sendOtpCode() {
    try {
      await requestEmailOtp({
        email: identifier,
        type: 'sign-in',
        captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
      })
      setOtp('')
      setStep('otp-code')
      return 'One-time code sent. Enter it here to finish signing in.'
    } finally {
      resetCaptcha()
    }
  }
  const methodButtons =
    !showIdentifierStep && enabled ? (
      <SignInMethodButtons
        callback={callback}
        emailEnabled={enabled.emailOtpEnabled}
        onEmailClick={() => {
          setMode('otp')
          setStep('credential')
          setPassword('')
          setOtp('')
        }}
        onPasskeyClick={onPasskeySubmit}
        onPhoneClick={() => {
          setMode('phone')
          setStep('credential')
          setPassword('')
          setOtp('')
        }}
        onOneTapClick={onOneTapSubmit}
        onWalletClick={onWalletSubmit}
        oneTapEnabled={Boolean(config?.builtInProviders?.oneTap?.enabled)}
        passkeyEnabled={Boolean(config?.security.passkeysEnabled)}
        phoneEnabled={Boolean(config?.builtInProviders?.phone?.enabled)}
        phoneVisible={Boolean(config?.builtInProviders?.phone?.enabled)}
        providers={socialProviders}
        walletEnabled={Boolean(config?.builtInProviders?.web3Wallet?.enabled)}
      />
    ) : null
  const hasPrimarySignInSurface = Boolean(!twoFactorMethods && !showIdentifierStep && activeMode)
  return (
    <AuthLayout
      config={config}
      eyebrow="Hosted sign-in"
      title={authContext.title ?? localizedHostedCopy(config?.copy.headline, 'Sign in to FlareAuth')}
      description={
        authContext.description ??
        localizedHostedCopy(config?.copy.description, 'Use your account to continue securely.')
      }
    >
      {loading ? <LoadingMessage label={tt('Loading sign-in options')} /> : null}
      {error ? <Status tone="error">{error}</Status> : null}
      {!loading &&
      !error &&
      !primaryMode &&
      socialProviders.length === 0 &&
      !config?.builtInProviders.phone.enabled &&
      !config?.security.passkeysEnabled &&
      !config?.builtInProviders.web3Wallet.enabled &&
      !config?.builtInProviders.oneTap.enabled ? (
        <Status tone="warning">{tt('No sign-in methods are enabled. Contact the workspace administrator.')}</Status>
      ) : null}

      <SignInCardBody
        footer={<SubmitStatus state={submit} />}
        methodButtons={methodButtons}
        showDivider={Boolean(methodButtons && hasPrimarySignInSurface)}
      >
        {twoFactorMethods ? <Status>{tt('Enter the current code from your authenticator app.')}</Status> : null}
        {step === 'otp-code' ? (
          <Status>
            {tt('Code sent to')} {identifier}
            {tt('. Enter it below to continue.')}
          </Status>
        ) : null}

        {twoFactorMethods ? (
          <form className="formStack" onSubmit={onTwoFactorSubmit}>
            <h2 className="authStepTitle">{tt('Verify your sign-in')}</h2>
            <Field label={tt('Authenticator code')}>
              <TextInput
                autoComplete="one-time-code"
                inputMode="numeric"
                onChange={(event) => setTwoFactorCode(event.target.value)}
                required
                value={twoFactorCode}
              />
            </Field>
            <Button disabled={submit.loading} type="submit">
              <KeyRound size={18} /> {tt('Verify code')}{' '}
            </Button>
          </form>
        ) : null}

        {!twoFactorMethods && showIdentifierStep ? (
          <form
            className="formStack"
            onSubmit={(event) => {
              event.preventDefault()
              setIdentifierConfirmed(true)
            }}
          >
            <Field label={enabled?.usernameEnabled ? tt('Email or username') : tt('Email')}>
              <TextInput
                autoComplete="username"
                onChange={(event) => setIdentifier(event.target.value)}
                required
                type="text"
                value={identifier}
              />
            </Field>
            <Button type="submit">
              <ArrowRight size={18} /> {tt('Continue')}{' '}
            </Button>
          </form>
        ) : null}

        {!twoFactorMethods && !showIdentifierStep && identifierFirst && !needsEmailIdentifier ? (
          <div className="identitySummary">
            <span>{tt('Signing in as')}</span>
            <strong>{identifier}</strong>
            <button onClick={() => setIdentifierConfirmed(false)} type="button">
              {' '}
              {tt('Change')}{' '}
            </button>
          </div>
        ) : null}

        {!twoFactorMethods && !showIdentifierStep && activeMode === 'password' && enabled?.passwordEnabled ? (
          <form className="formStack" onSubmit={onPasswordSubmit}>
            {!identifierFirst ? (
              <Field label={enabled.usernameEnabled ? tt('Email or username') : tt('Email')}>
                <TextInput
                  autoComplete="username"
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  type="text"
                  value={identifier}
                />
              </Field>
            ) : null}
            <Field label={tt('Password')}>
              <PasswordInput
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                value={password}
              />
            </Field>
            {enabled.passwordEnabled ? (
              <a className="authFieldLink" href={authPageHref('/forgot-password')}>
                {' '}
                {tt('Forgot password?')}{' '}
              </a>
            ) : null}
            <CaptchaTokenField key={captchaResetKey} config={config} onChange={setCaptchaToken} />
            <Button disabled={submit.loading} type="submit">
              <KeyRound size={18} /> {tt('Sign in')}{' '}
            </Button>
            {enabled.signupEnabled ? (
              <p className="authSignupPrompt">
                {tt('No account yet?')} <a href={authPageHref('/sign-up')}>{tt('Create account')}</a>
              </p>
            ) : null}
          </form>
        ) : null}

        {!twoFactorMethods && !showIdentifierStep && activeMode === 'otp' && enabled?.emailOtpEnabled ? (
          <form className="formStack" onSubmit={onOtpSubmit}>
            {step !== 'otp-code' && (!identifierFirst || needsEmailIdentifier) ? (
              <Field label={tt('Email')}>
                <TextInput
                  autoComplete="email"
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  type="email"
                  value={identifier}
                />
              </Field>
            ) : null}
            {step === 'otp-code' ? (
              <Field label={tt('Verification code')} help={tt('Enter the code from your email.')}>
                <TextInput
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(event) => setOtp(event.target.value)}
                  required
                  value={otp}
                />
              </Field>
            ) : null}
            {step !== 'otp-code' ? (
              <CaptchaTokenField key={captchaResetKey} config={config} onChange={setCaptchaToken} />
            ) : null}
            <Button disabled={submit.loading} type="submit">
              <Mail size={18} />
              {step === 'otp-code' ? 'Verify code' : 'Send code'}
            </Button>
            {step !== 'otp-code' ? (
              <button className="authBackAction" onClick={backToSignIn} type="button">
                {' '}
                {tt('Back to sign in')}{' '}
              </button>
            ) : null}
            {step === 'otp-code' ? (
              <button
                className="authInlineAction"
                disabled={submit.loading}
                onClick={() => submitRequest(setSubmit, sendOtpCode)}
                type="button"
              >
                {' '}
                {tt('Resend code')}{' '}
              </button>
            ) : null}
          </form>
        ) : null}

        {!twoFactorMethods &&
        !showIdentifierStep &&
        activeMode === 'phone' &&
        config?.builtInProviders?.phone?.enabled ? (
          <form className="formStack" onSubmit={onPhoneSubmit}>
            {step !== 'otp-code' ? (
              <Field label={tt('Phone')}>
                <TextInput
                  autoComplete="tel"
                  inputMode="tel"
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="+15555550123"
                  required
                  type="tel"
                  value={phoneNumber}
                />
              </Field>
            ) : null}
            {step === 'otp-code' ? (
              <Field label={tt('Verification code')} help={tt('Enter the code from your phone.')}>
                <TextInput
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(event) => setOtp(event.target.value)}
                  required
                  value={otp}
                />
              </Field>
            ) : null}
            <Button disabled={submit.loading} type="submit">
              <Smartphone size={18} />
              {step === 'otp-code' ? 'Verify code' : 'Send code'}
            </Button>
            {step !== 'otp-code' ? (
              <button className="authBackAction" onClick={backToSignIn} type="button">
                {' '}
                {tt('Back to sign in')}{' '}
              </button>
            ) : null}
            {step === 'otp-code' ? (
              <button
                className="authInlineAction"
                disabled={submit.loading}
                onClick={() =>
                  submitRequest(setSubmit, async () => {
                    await requestPhoneOtp({
                      phoneNumber,
                    })
                    return 'One-time code sent. Enter it here to finish signing in.'
                  })
                }
                type="button"
              >
                {' '}
                {tt('Resend code')}{' '}
              </button>
            ) : null}
          </form>
        ) : null}
      </SignInCardBody>
    </AuthLayout>
  )
}
export function SignUpPage() {
  const { data: config } = useConfigz()
  const [submit, setSubmit] = useState(initialSubmitState)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const created = submit.message !== null && submit.error === null
  const authContext = authRequestContext('sign-up')
  const callback = callbackURL()
  const socialProviders = config?.identityProviders ?? []
  const signupEnabled = config?.signIn.signupEnabled !== false && config?.signIn.passwordEnabled !== false
  const resetCaptcha = () => resetCaptchaState(config, setCaptchaToken, setCaptchaResetKey)
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      try {
        await signUp({
          email,
          name,
          password,
          username: config?.signIn.usernameEnabled && username ? username : undefined,
          callbackURL: callback,
          captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
        })
        return 'Account created. Check your email if verification is required.'
      } finally {
        resetCaptcha()
      }
    })
  }
  return (
    <AuthLayout
      config={config}
      eyebrow="Create account"
      title={authContext.title ?? tt('Start with your identity.')}
      description={authContext.description ?? tt('Create a hosted account for every connected application.')}
    >
      {signupEnabled ? (
        <SignUpCardBody
          created={created}
          form={
            <SignUpForm
              captchaConfig={config}
              captchaResetKey={captchaResetKey}
              email={email}
              name={name}
              onCaptchaChange={setCaptchaToken}
              onEmailChange={setEmail}
              onNameChange={setName}
              onPasswordChange={setPassword}
              onSubmit={onSubmit}
              onUsernameChange={setUsername}
              password={password}
              submitLoading={submit.loading}
              username={username}
              usernameEnabled={config?.signIn.usernameEnabled}
            />
          }
          signInAction={<a href={authPageHref('/sign-in')}>{tt('Already have an account?')}</a>}
          socialButtons={<SocialButtons callback={callback} providers={socialProviders} />}
          status={<SubmitStatus state={submit} />}
        />
      ) : (
        <SignUpDisabled signInAction={<a href={authPageHref('/sign-in')}>{tt('Back to sign in')}</a>} />
      )}
    </AuthLayout>
  )
}
async function signInWithEthereum(enabledChains: number[], callback: string | undefined) {
  const ethereum = window.ethereum
  if (!ethereum) throw new Error('No wallet provider was found in this browser.')
  const accounts = await ethereum.request({
    method: 'eth_requestAccounts',
  })
  const walletAddress = readFirstString(accounts)
  if (!walletAddress) throw new Error('No wallet account was selected.')
  const chainValue = await ethereum.request({
    method: 'eth_chainId',
  })
  const chainId = readChainId(chainValue)
  if (!enabledChains.includes(chainId)) {
    throw new Error(`This wallet network is not enabled. Switch to chain ${enabledChains[0]}.`)
  }
  const { nonce } = await requestWalletNonce({
    walletAddress,
    chainId,
  })
  const message = createSiweMessage({
    address: walletAddress as `0x${string}`,
    chainId,
    domain: window.location.host,
    nonce,
    statement: 'Sign in to FlareAuth.',
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
  return signInWithWallet({
    message,
    signature,
    walletAddress,
    chainId,
    email: undefined,
  }).then((response) => ({
    ...response,
    callbackURL: callback,
  }))
}
async function signInWithGoogleOneTap(
  config: NonNullable<ReturnType<typeof useConfigz>['data']>['builtInProviders']['oneTap'] | undefined,
  callback: string | undefined,
) {
  if (!config?.clientId) throw new Error('Google One Tap Client ID is not configured.')
  await loadGoogleIdentityScript()
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (result: unknown) => {
      settled = true
      resolve(result)
    }
    const fail = (message: string) => {
      settled = true
      reject(new Error(message))
    }
    const timeout = window.setTimeout(() => {
      if (!settled) fail('Google One Tap did not return a credential.')
    }, 15000)
    window.google?.accounts.id.initialize({
      client_id: config.clientId,
      auto_select: config.autoSelect,
      cancel_on_tap_outside: config.cancelOnTapOutside,
      context: config.context,
      ux_mode: config.uxMode,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        try {
          if (!response.credential) throw new Error('Google One Tap did not return a credential.')
          const result = await signInWithOneTap({
            idToken: response.credential,
          })
          window.clearTimeout(timeout)
          finish({
            ...result,
            callbackURL: callback,
          })
        } catch (error) {
          window.clearTimeout(timeout)
          reject(error)
        }
      },
    })
    window.google?.accounts.id.prompt((notification) => {
      if (settled) return
      if (notification.isNotDisplayed?.()) {
        window.clearTimeout(timeout)
        fail(`Google One Tap was not displayed: ${notification.getNotDisplayedReason?.() ?? 'unknown reason'}.`)
        return
      }
      if (notification.isSkippedMoment?.()) {
        window.clearTimeout(timeout)
        fail(`Google One Tap was skipped: ${notification.getSkippedReason?.() ?? 'unknown reason'}.`)
        return
      }
      if (notification.isDismissedMoment?.()) {
        window.clearTimeout(timeout)
        fail(`Google One Tap was dismissed: ${notification.getDismissedReason?.() ?? 'unknown reason'}.`)
      }
    })
  })
}
function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.googleScriptInitialized) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => {
      window.googleScriptInitialized = true
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })
}
function readFirstString(value: unknown) {
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null
}
function readString(value: unknown) {
  return typeof value === 'string' ? value : null
}
function readChainId(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.startsWith('0x')) return Number.parseInt(value, 16)
  if (typeof value === 'string') return Number(value)
  throw new Error('Wallet did not return a chain ID.')
}
function SignUpDisabled({ signInAction }: { signInAction: ReactNode }) {
  return (
    <>
      <div className="authCardHeader">
        <h2>{tt('Password sign up is not available')}</h2>
        <p>{tt('Use sign in to continue with an enabled passwordless or social method.')}</p>
      </div>
      <div className="authLinks">{signInAction}</div>
    </>
  )
}
export function SignUpCardBody({
  created,
  form,
  signInAction,
  socialButtons,
  status,
}: {
  created: boolean
  form: ReactNode
  signInAction: ReactNode
  socialButtons?: ReactNode
  status?: ReactNode
}) {
  return (
    <>
      {created ? (
        <div className="authCardHeader">
          <h2>{tt('Check your inbox')}</h2>
          <p>{tt('Use the verification message if this deployment requires confirmed email before continuing.')}</p>
        </div>
      ) : (
        form
      )}
      {created ? null : socialButtons}
      {status}
      <div className="authLinks">{signInAction}</div>
    </>
  )
}
export function SignUpForm({
  captchaConfig,
  captchaResetKey,
  email,
  name,
  onCaptchaChange,
  onEmailChange,
  onNameChange,
  onPasswordChange,
  onSubmit,
  onUsernameChange,
  password,
  submitLoading = false,
  username,
  usernameEnabled,
}: {
  captchaConfig?: Parameters<typeof CaptchaTokenField>[0]['config']
  captchaResetKey?: string | number
  email: string
  name: string
  onCaptchaChange?: (token: string) => void
  onEmailChange: (value: string) => void
  onNameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  onUsernameChange: (value: string) => void
  password: string
  submitLoading?: boolean
  username: string
  usernameEnabled?: boolean
}) {
  return (
    <form className="formStack" onSubmit={onSubmit}>
      <Field label={tt('Name')}>
        <TextInput autoComplete="name" onChange={(event) => onNameChange(event.target.value)} required value={name} />
      </Field>
      <Field label={tt('Email')}>
        <TextInput
          autoComplete={usernameEnabled ? 'email' : 'username'}
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </Field>
      {usernameEnabled ? (
        <Field label={tt('Username')}>
          <TextInput
            autoComplete="username"
            onChange={(event) => onUsernameChange(event.target.value)}
            value={username}
          />
        </Field>
      ) : null}
      <Field label={tt('Password')}>
        <PasswordInput
          autoComplete="new-password"
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          value={password}
        />
      </Field>
      {captchaConfig && onCaptchaChange ? (
        <CaptchaTokenField key={captchaResetKey} config={captchaConfig} onChange={onCaptchaChange} />
      ) : null}
      <Button disabled={submitLoading} type="submit">
        {' '}
        {tt('Create account')}{' '}
      </Button>
    </form>
  )
}
export function ForgotPasswordPage() {
  const { data: config } = useConfigz()
  const [submit, setSubmit] = useState(initialSubmitState)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [otpRequested, setOtpRequested] = useState(false)
  const authContext = authRequestContext('recovery')
  const resetCaptcha = () => resetCaptchaState(config, setCaptchaToken, setCaptchaResetKey)
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      if (otpRequested && otp && password) {
        await resetPasswordWithEmailOtp({
          email,
          otp,
          password,
        })
        return 'Password reset. You can sign in with the new password.'
      }
      try {
        await requestEmailOtpPasswordReset({
          email,
          captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
        })
        setOtpRequested(true)
        return 'Password reset code sent.'
      } finally {
        resetCaptcha()
      }
    })
  }
  return (
    <AuthLayout
      config={config}
      eyebrow="Account recovery"
      title={authContext.title ?? tt('Recover your password.')}
      description={authContext.description ?? tt('Request a one-time code and set a new password for your account.')}
    >
      {otpRequested ? (
        <div className="authCardHeader">
          <h2>{tt('Set a new password')}</h2>
          <p>{tt('Enter the new password for this account.')}</p>
        </div>
      ) : null}
      <form className="formStack" onSubmit={onSubmit}>
        <Field label={tt('Email')}>
          <TextInput
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            readOnly={otpRequested}
            required
            type="email"
            value={email}
          />
        </Field>
        {!otpRequested ? <CaptchaTokenField key={captchaResetKey} config={config} onChange={setCaptchaToken} /> : null}
        {otpRequested ? (
          <Field label={tt('One-time code')}>
            <TextInput
              autoComplete="one-time-code"
              inputMode="numeric"
              onChange={(event) => setOtp(event.target.value)}
              value={otp}
            />
          </Field>
        ) : null}
        {otpRequested ? <input autoComplete="username" hidden readOnly type="text" value={email} /> : null}
        {otpRequested ? (
          <Field label={tt('New password')}>
            <PasswordInput
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          </Field>
        ) : null}
        <Button disabled={submit.loading} type="submit">
          {otpRequested ? tt('Reset password') : tt('Send reset code')}
        </Button>
      </form>
      <SubmitStatus state={submit} />
      <div className="authLinks">
        <a href={authPageHref('/sign-in')}>{tt('Back to sign in')}</a>
      </div>
    </AuthLayout>
  )
}
export function EmailVerificationPage() {
  const { data: config } = useConfigz()
  const [submit, setSubmit] = useState(initialSubmitState)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const token = new URLSearchParams(window.location.search).get('token')
  const authContext = authRequestContext('verification')
  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await submitRequest(setSubmit, async () => {
      if (token) {
        await verifyEmail({
          token,
          callbackURL: callbackURL(),
        })
        return 'Email verified.'
      }
      if (otp) {
        await verifyEmailOtp({
          email,
          otp,
        })
        return 'Email verified.'
      }
      await requestEmailOtp({
        email,
        type: 'email-verification',
      })
      return 'Verification code sent.'
    })
  }
  return (
    <AuthLayout
      config={config}
      eyebrow="Email verification"
      title={authContext.title ?? tt('Verify your email.')}
      description={authContext.description ?? tt('Confirm ownership of your email address before continuing.')}
    >
      <div className="authCardHeader">
        <h2>{token ? tt('Verify this email link') : tt('Confirm your inbox')}</h2>
        <p>
          {token
            ? tt('Complete verification with this secure link.')
            : tt('Send a verification email or enter a code.')}
        </p>
      </div>
      <form className="formStack" onSubmit={onSubmit}>
        {!token ? (
          <Field label={tt('Email')}>
            <TextInput
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </Field>
        ) : null}
        {!token ? (
          <Field label={tt('One-time code')}>
            <TextInput
              autoComplete="one-time-code"
              inputMode="numeric"
              onChange={(event) => setOtp(event.target.value)}
              value={otp}
            />
          </Field>
        ) : null}
        <Button disabled={submit.loading} type="submit">
          {token || otp ? 'Verify email' : 'Send verification'}
        </Button>
      </form>
      <SubmitStatus state={submit} />
    </AuthLayout>
  )
}
export function AuthCallbackPage() {
  const { data: config } = useConfigz()
  const [state, setState] = useState<{
    loading: boolean
    message: string
    href?: string
    error?: string
  }>({
    loading: true,
    message: tt('Completing sign-in'),
  })
  useEffect(() => {
    setState(readCallbackState(window.location.search))
  }, [])
  return (
    <AuthLayout
      backHref={state.error ? '/sign-in' : undefined}
      config={config}
      eyebrow="Callback"
      icon={state.error ? <CircleAlert aria-hidden="true" size={28} /> : undefined}
      title={state.message}
      description={tt('This page handles redirects from hosted authentication and OAuth journeys.')}
      variant={state.error ? 'message' : 'form'}
    >
      {state.loading ? <LoadingMessage label={tt('Checking callback state')} /> : null}
      {state.error ? <Status tone="error">{state.error}</Status> : null}
      {state.href ? (
        <LinkButton href={state.href}>
          <ArrowLeft size={18} /> {tt('Continue')}{' '}
        </LinkButton>
      ) : null}
    </AuthLayout>
  )
}
function readCallbackState(search: string): {
  loading: false
  message: string
  href?: string
  error?: string
} {
  const params = new URLSearchParams(search)
  const error = params.get('error')
  if (error) {
    return {
      loading: false,
      message: tt('Sign-in could not continue.'),
      error: missingEmailSignUpErrors.has(error)
        ? tt(missingEmailSignUpMessage)
        : tt(params.get('error_description') ?? error),
    }
  }
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  if (clientId && redirectUri) {
    const consentParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
    })
    const state = params.get('state')
    if (state) consentParams.set('state', state)
    return {
      loading: false,
      message: tt('Consent is required before redirecting.'),
      href: safeRedirectPath(`/oauth/consent?${consentParams.toString()}`),
    }
  }
  return {
    loading: false,
    message: tt('Sign-in complete.'),
    href: safeRedirectPath(params.get('return_to')) ?? '/profile',
  }
}
export function SignInMethodButtons({
  callback,
  emailEnabled,
  onEmailClick,
  onPasskeyClick,
  onPhoneClick,
  onProviderClick,
  onOneTapClick,
  onWalletClick,
  oneTapEnabled,
  passkeyEnabled,
  phoneEnabled,
  phoneVisible,
  providers,
  walletEnabled,
}: {
  callback: string | undefined
  emailEnabled: boolean
  onEmailClick: () => void
  onOneTapClick?: () => void
  onPasskeyClick?: () => void
  onPhoneClick?: () => void
  onProviderClick?: (provider: { providerId: string }) => void
  onWalletClick?: () => void
  oneTapEnabled?: boolean
  passkeyEnabled?: boolean
  phoneEnabled: boolean
  phoneVisible: boolean
  providers: Array<{
    slug: string
    providerId: string
    displayName: string
    icon: string
  }>
  walletEnabled?: boolean
}) {
  if (!emailEnabled && !phoneVisible && !passkeyEnabled && !walletEnabled && !oneTapEnabled && providers.length === 0) {
    return null
  }
  async function onSocialClick(provider: { providerId: string }) {
    if (onProviderClick) {
      onProviderClick(provider)
      return
    }
    const response = await signInWithSocial({
      provider: provider.providerId,
      callbackURL: callback,
      errorCallbackURL: `${window.location.origin}/auth/callback`,
    })
    const redirectUrl = readRedirectUrl(response, {
      allowExternal: true,
    })
    if (redirectUrl) window.location.assign(redirectUrl)
  }
  return (
    <fieldset className="socialGrid">
      <legend>{tt('Available sign-in methods')}</legend>
      {emailEnabled ? (
        <button className="socialButton" onClick={onEmailClick} type="button">
          <span aria-hidden="true" className="providerIcon">
            <Mail size={16} />
          </span>
          <span className="socialButtonText">{tt('Continue with Email')}</span>
        </button>
      ) : null}
      {phoneVisible ? (
        <button className="socialButton" disabled={!phoneEnabled} onClick={onPhoneClick} type="button">
          <span aria-hidden="true" className="providerIcon">
            <Smartphone size={16} />
          </span>
          <span className="socialButtonText">{tt('Continue with Phone')}</span>
        </button>
      ) : null}
      {passkeyEnabled ? (
        <button className="socialButton" onClick={onPasskeyClick} type="button">
          <span aria-hidden="true" className="providerIcon">
            <Fingerprint size={16} />
          </span>
          <span className="socialButtonText">{tt('Continue with Passkey')}</span>
        </button>
      ) : null}
      {walletEnabled ? (
        <button className="socialButton" onClick={onWalletClick} type="button">
          <span aria-hidden="true" className="providerIcon">
            <Wallet size={16} />
          </span>
          <span className="socialButtonText">{tt('Continue with Web3 wallet')}</span>
        </button>
      ) : null}
      {oneTapEnabled ? (
        <button className="socialButton" onClick={onOneTapClick} type="button">
          <ProviderIcon
            provider={{
              displayName: 'OneTap',
              icon: 'onetap',
              providerId: 'one-tap',
            }}
          />
          <span className="socialButtonText">{tt('Continue with OneTap')}</span>
        </button>
      ) : null}
      {providers.map((provider) => (
        <button className="socialButton" key={provider.slug} onClick={() => onSocialClick(provider)} type="button">
          <ProviderIcon provider={provider} />
          <span className="socialButtonText">
            {tt('Continue with')} {provider.displayName}
          </span>
        </button>
      ))}
    </fieldset>
  )
}
const missingEmailSignUpErrors = new Set(['email_not_found', 'email_is_missing', 'missing_email_signup'])
const missingEmailSignUpMessage =
  'You do not have an account yet. This sign-in method did not provide account information. Sign in with another method first, then link this method to your account so you can use it next time.'
function redirectToMissingEmailSignUp() {
  const params = new URLSearchParams({
    error: 'missing_email_signup',
    error_description: missingEmailSignUpMessage,
  })
  window.location.assign(`/auth/callback?${params.toString()}`)
}
export function SignInCardBody({
  children,
  footer,
  methodButtons,
  showDivider,
}: {
  children: ReactNode
  footer?: ReactNode
  methodButtons?: ReactNode
  showDivider: boolean
}) {
  return (
    <>
      {children}
      {showDivider ? <AuthMethodDivider /> : null}
      {methodButtons}
      {footer}
    </>
  )
}
function AuthMethodDivider() {
  return (
    <div className="authMethodDivider" aria-hidden="true">
      <span>{tt('or')}</span>
    </div>
  )
}
function SocialButtons({
  callback,
  providers,
}: {
  callback: string | undefined
  providers: Array<{
    slug: string
    providerId: string
    displayName: string
    icon: string
  }>
}) {
  return (
    <SignInMethodButtons
      callback={callback}
      emailEnabled={false}
      onEmailClick={() => undefined}
      oneTapEnabled={false}
      passkeyEnabled={false}
      phoneEnabled={false}
      phoneVisible={false}
      providers={providers}
      walletEnabled={false}
    />
  )
}
export function primarySignInMode(
  enabled: NonNullable<ReturnType<typeof useConfigz>['data']>['signIn'],
): SignInMode | null {
  if (enabled.passwordEnabled) return 'password'
  if (enabled.emailOtpEnabled) return 'otp'
  return null
}
export function authRequestContext(intent: 'sign-in' | 'sign-up' | 'recovery' | 'verification') {
  const params = new URLSearchParams(window.location.search)
  const redirectUri = params.get('redirect_uri')
  if (!params.has('client_id') || !redirectUri) return {}
  const destination = redirectDestination(redirectUri)
  const fallbackTitle =
    intent === 'sign-up'
      ? tt('Create an account for the requested application.')
      : intent === 'recovery'
        ? tt('Recover access for the requested application.')
        : intent === 'verification'
          ? tt('Verify your email for the requested application.')
          : tt('Continue to the requested application.')
  const fallbackDescription =
    intent === 'sign-up'
      ? tt('Create a hosted account to continue.')
      : intent === 'recovery'
        ? tt('Recover your hosted account before continuing.')
        : intent === 'verification'
          ? tt('Confirm your email address before continuing.')
          : tt('Sign in with your hosted account to continue.')
  if (!destination) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    }
  }
  return {
    title:
      intent === 'sign-up'
        ? tt('Create an account for {{destination}}.', { destination })
        : intent === 'recovery'
          ? tt('Recover access for {{destination}}.', { destination })
          : intent === 'verification'
            ? tt('Verify your email for {{destination}}.', { destination })
            : tt('Continue to {{destination}}.', { destination }),
    description:
      intent === 'sign-up'
        ? tt('Create a hosted account to continue to {{destination}}.', { destination })
        : intent === 'recovery'
          ? tt('Recover your hosted account before continuing to {{destination}}.', { destination })
          : intent === 'verification'
            ? tt('Confirm your email address before continuing to {{destination}}.', { destination })
            : tt('Sign in with your hosted account to continue to {{destination}}.', { destination }),
  }
}
function localizedHostedCopy(value: string | undefined, defaultValue: string) {
  return !value || value === defaultValue ? tt(defaultValue) : value
}
export function redirectDestination(redirectUri: string) {
  try {
    return new URL(redirectUri).host
  } catch {
    return null
  }
}
export function authPageHref(path: string) {
  const params = authContinuationParams()
  return params.size > 0 ? `${path}?${params.toString()}` : path
}
export function authContinuationParams() {
  const params = new URLSearchParams(window.location.search)
  const continuation = new URLSearchParams()
  for (const name of [
    'client_id',
    'redirect_uri',
    'response_type',
    'scope',
    'state',
    'code_challenge',
    'code_challenge_method',
    'nonce',
  ]) {
    const value = params.get(name)
    if (value) continuation.set(name, value)
  }
  return continuation.has('client_id') && continuation.has('redirect_uri') ? continuation : new URLSearchParams()
}
function navigateAfterAuth(response: unknown, callback: string | undefined) {
  const redirectUrl = resolveAuthRedirect(response, callback)
  if (window.location.pathname !== redirectUrl) {
    window.location.assign(redirectUrl)
  }
}
export function resolveAuthRedirect(response: unknown, callback: string | undefined) {
  return readRedirectUrl(response) ?? safeRedirectPath(callback) ?? '/profile'
}
export function requiresTwoFactor(response: unknown): response is {
  twoFactorRedirect: true
  twoFactorMethods?: string[]
} {
  return (
    typeof response === 'object' &&
    response !== null &&
    'twoFactorRedirect' in response &&
    response.twoFactorRedirect === true
  )
}
export function readRedirectUrl(
  response: unknown,
  options: {
    allowExternal?: boolean
  } = {},
): string | null {
  if (typeof response !== 'object' || response === null) return null
  if ('url' in response && typeof response.url === 'string') return safeAuthRedirect(response.url, options)
  if ('redirectTo' in response && typeof response.redirectTo === 'string') return safeAuthRedirect(response.redirectTo)
  if ('callbackURL' in response && typeof response.callbackURL === 'string')
    return safeAuthRedirect(response.callbackURL)
  return null
}
export function safeAuthRedirect(
  value: string,
  options: {
    allowExternal?: boolean
  } = {},
) {
  if (options.allowExternal) return value
  return safeRedirectPath(value) ?? null
}
function LoadingMessage({ label }: { label: string }) {
  return (
    <Status>
      <LoaderCircle className="spin" size={18} />
      {label}
    </Status>
  )
}
function SubmitStatus({ state }: { state: SubmitState }) {
  if (state.error) return <Status tone="error">{state.error}</Status>
  if (state.message) return <Status tone="success">{state.message}</Status>
  return null
}
function PasswordInput(props: Omit<ComponentProps<typeof TextInput>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="passwordField">
      <TextInput {...props} type={visible ? 'text' : 'password'} />
      <button
        aria-label={visible ? tt('Hide password') : tt('Show password')}
        onClick={() => setVisible((value) => !value)}
        type="button"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
function CaptchaTokenField({
  config,
  onChange,
}: {
  config: ReturnType<typeof useConfigz>['data']
  onChange: (value: string) => void
}) {
  const widgetId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!config?.captcha?.enabled || !config.captcha.siteKey || !containerRef.current) return
    let disposed = false
    let widget: string | null = null
    loadTurnstileScript()
      .then(() => {
        if (disposed || !containerRef.current || !window.turnstile) return
        widget = window.turnstile.render(containerRef.current, {
          sitekey: config.captcha.siteKey,
          callback: onChange,
          'expired-callback': () => onChange(''),
          'error-callback': () => onChange(''),
        })
      })
      .catch(() => onChange(''))
    return () => {
      disposed = true
      onChange('')
      if (widget && window.turnstile) window.turnstile.remove(widget)
    }
  }, [config?.captcha?.enabled, config?.captcha?.siteKey, onChange])
  if (!config?.captcha?.enabled) return null
  return (
    <Field label={tt('CAPTCHA')}>
      <div>
        <div aria-describedby={`${widgetId}-status`} ref={containerRef} />
        <span className="sr-only" id={`${widgetId}-status`}>
          {' '}
          {tt('Complete the CAPTCHA challenge to continue.')}{' '}
        </span>
      </div>
    </Field>
  )
}
function resetCaptchaState(
  config: ReturnType<typeof useConfigz>['data'],
  setCaptchaToken: (value: string) => void,
  setCaptchaResetKey: (updater: (value: number) => number) => void,
) {
  if (!config?.captcha?.enabled) return
  setCaptchaToken('')
  setCaptchaResetKey((value) => value + 1)
}
let turnstileScriptPromise: Promise<void> | null = null
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), {
        once: true,
      })
      existing.addEventListener('error', () => reject(new Error('CAPTCHA script failed to load.')), {
        once: true,
      })
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.dataset.turnstileScript = 'true'
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.addEventListener('load', () => resolve(), {
      once: true,
    })
    script.addEventListener('error', () => reject(new Error('CAPTCHA script failed to load.')), {
      once: true,
    })
    document.head.appendChild(script)
  })
  return turnstileScriptPromise
}
async function submitRequest(setSubmit: (state: SubmitState) => void, operation: () => Promise<string>) {
  setSubmit({
    loading: true,
    message: null,
    error: null,
  })
  try {
    setSubmit({
      loading: false,
      message: tt(await operation()),
      error: null,
    })
  } catch (error) {
    setSubmit({
      loading: false,
      message: null,
      error: error instanceof Error ? tt(error.message) : tt('Request failed.'),
    })
  }
}
