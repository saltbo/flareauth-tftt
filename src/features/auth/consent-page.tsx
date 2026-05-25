import type { ConsentRequestResponse } from '@shared/api/applications'
import { ArrowRight, CircleAlert, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuthLayout } from '@/components/layout/auth-layout'
import { Button, LinkButton } from '@/components/ui/button'
import { Status } from '@/components/ui/status'
import { createConsent, getConsentRequest } from '@/lib/api'
import { signOut } from '@/lib/auth-client'
import { tt } from '@/lib/i18n'
import { useConfigz } from './hooks'
export function ConsentPage() {
  const { data: config } = useConfigz()
  const [consent, setConsent] = useState<ConsentRequestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [switchingAccount, setSwitchingAccount] = useState(false)
  const search = window.location.search
  useEffect(() => {
    let active = true
    getConsentRequest(search)
      .then((result) => {
        if (active) {
          setConsent(result)
          setLoading(false)
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? tt(loadError.message) : tt('Unable to load consent request.'))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [search])
  async function approve() {
    if (!consent) return
    setSubmitting(true)
    setError(null)
    try {
      await createConsent({
        clientId: consent.application.clientId,
        scopes: consent.requestedScopes,
      })
      window.location.assign(consent.redirects.approveUrl)
    } catch (approveError) {
      setError(approveError instanceof Error ? tt(approveError.message) : tt('Unable to approve consent.'))
      setSubmitting(false)
    }
  }
  async function switchAccount() {
    setSwitchingAccount(true)
    setError(null)
    try {
      await signOut()
      window.location.assign(signInWithReturnTo())
    } catch (switchError) {
      setError(switchError instanceof Error ? tt(switchError.message) : tt('Unable to switch accounts.'))
      setSwitchingAccount(false)
    }
  }
  const messageState = error !== null || (!loading && !consent)
  const signInHref = `/sign-in${search}`
  return (
    <AuthLayout
      backHref={messageState ? signInHref : undefined}
      config={config}
      eyebrow="OAuth consent"
      icon={messageState ? <CircleAlert aria-hidden="true" size={28} /> : undefined}
      title={tt('Review application access.')}
      description={tt('Approve only the scopes this application should use with your account.')}
      variant={messageState ? 'message' : 'form'}
    >
      {loading ? <Status>{tt('Loading consent request')}</Status> : null}
      {error ? <Status tone="error">{error}</Status> : null}
      {!loading && !error && !consent ? (
        <Status tone="warning">
          {' '}
          {tt('This consent request is no longer available. Start sign-in again from the application.')}{' '}
        </Status>
      ) : null}
      {consent ? (
        <div className="consentStack">
          <div className="applicationSummary">
            {consent.application.iconUrl ? (
              <img src={consent.application.iconUrl} alt="" width="44" height="44" />
            ) : (
              <ShieldCheck size={28} />
            )}
            <div>
              <h2>{consent.application.name}</h2>
              <p>
                {consent.application.description ?? consent.application.homepageUrl ?? tt('OAuth client application')}
              </p>
            </div>
          </div>
          <div className="consentAccount">
            {consent.user.image ? (
              <img src={consent.user.image} alt="" width="40" height="40" />
            ) : (
              <UserRound size={20} />
            )}
            <div>
              <span>{tt('Signed in as')}</span>
              <strong>{consent.user.displayName ?? consent.user.email ?? tt('Current account')}</strong>
              {consent.user.email && consent.user.email !== consent.user.displayName ? (
                <small>{consent.user.email}</small>
              ) : null}
            </div>
            <Button
              className="consentSwitchButton"
              disabled={submitting || switchingAccount}
              onClick={switchAccount}
              type="button"
              variant="ghost"
            >
              <LogOut size={16} /> {tt('Switch account')}
            </Button>
          </div>
          <ul className="scopeList" aria-label={tt('Requested scopes')}>
            {consent.requestedScopes.map((scope) => (
              <li className="scopeItem" key={scope}>
                <strong>{scope}</strong>
                <span>{scopeDescription(scope)}</span>
              </li>
            ))}
          </ul>
          {consent.existingConsent ? (
            <Status tone="info">
              {tt('Previously approved on')} {formatDate(consent.existingConsent.grantedAt)}.
            </Status>
          ) : null}
          <div className="buttonRow">
            <Button disabled={submitting} onClick={approve} type="button">
              <ArrowRight size={18} /> {tt('Approve access')}{' '}
            </Button>
            <LinkButton href={consent.redirects.denyUrl} variant="secondary">
              {' '}
              {tt('Deny')}{' '}
            </LinkButton>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}

export function signInWithReturnTo() {
  const current = `${window.location.pathname}${window.location.search}`
  return `/sign-in?return_to=${encodeURIComponent(current)}`
}

function scopeDescription(scope: string) {
  if (scope === 'openid') return tt('Confirm your identity with this provider.')
  if (scope === 'profile') return tt('Share basic profile details such as name and avatar.')
  if (scope === 'email') return tt('Share your email address and verification state.')
  if (scope === 'offline_access') return tt('Allow refresh tokens for continued access.')
  return tt('Allow this application to request this scope.')
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value))
}
