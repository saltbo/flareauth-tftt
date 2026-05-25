import {
  AuthLayout,
  authPageHref,
  authRequestContext,
  Button,
  CaptchaTokenField,
  callbackURL,
  Field,
  type FormEvent,
  initialSubmitState,
  PasswordInput,
  type ReactNode,
  resetCaptchaState,
  SocialButtons,
  SubmitStatus,
  signUp,
  submitRequest,
  TextInput,
  tt,
  useConfigz,
  useState,
} from '../auth-pages'

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
