import {
  authPageHref,
  authRequestContext,
  CaptchaTokenField,
  LoadingMessage,
  missingEmailSignUpErrors,
  missingEmailSignUpMessage,
  PasswordInput,
  resetCaptchaState,
  SubmitStatus,
  submitRequest,
} from './controls'
import {
  ArrowLeft,
  AuthLayout,
  Button,
  CircleAlert,
  callbackURL,
  Field,
  type FormEvent,
  initialSubmitState,
  LinkButton,
  passwordResetResendCooldownSeconds,
  requestEmailOtp,
  requestEmailOtpPasswordReset,
  resetPasswordWithEmailOtp,
  Status,
  safeRedirectPath,
  TextInput,
  tt,
  useConfigz,
  useEffect,
  useState,
  verifyEmail,
  verifyEmailOtp,
} from './shared'

export function ForgotPasswordPage() {
  const { data: config } = useConfigz()
  const [submit, setSubmit] = useState(initialSubmitState)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [otpRequested, setOtpRequested] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const authContext = authRequestContext('recovery')
  const resetCaptcha = () => resetCaptchaState(config, setCaptchaToken, setCaptchaResetKey)
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])
  async function requestResetCode() {
    try {
      await requestEmailOtpPasswordReset({
        email,
        captchaToken: config?.captcha?.enabled ? captchaToken : undefined,
      })
      setOtp('')
      setOtpRequested(true)
      setResendSeconds(passwordResetResendCooldownSeconds)
      return 'Password reset code sent.'
    } finally {
      resetCaptcha()
    }
  }
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
      return requestResetCode()
    })
  }
  return (
    <AuthLayout
      config={config}
      eyebrow="Account recovery"
      title={authContext.title ?? tt('Recover your password.')}
      description={authContext.description ?? tt('Request a one-time code and set a new password for your account.')}
    >
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
        {otpRequested ? (
          <button
            className="authInlineAction"
            disabled={submit.loading || resendSeconds > 0}
            onClick={() => submitRequest(setSubmit, requestResetCode)}
            type="button"
          >
            {resendSeconds > 0 ? tt('Resend code in {{seconds}}s', { seconds: resendSeconds }) : tt('Resend code')}
          </button>
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
        <a href={authPageHref('/auth/sign-in')}>{tt('Back to sign in')}</a>
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
      backHref={state.error ? '/auth/sign-in' : undefined}
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
