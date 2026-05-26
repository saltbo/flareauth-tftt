import { Fingerprint } from 'lucide-react'
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
import { disableTotp, startTotpEnrollment, verifyTotp } from '@/lib/api/account'
import { tt } from '@/lib/i18n'
import { accountQueryKeys } from './queries'
import type { MutationHandler, SecurityState } from './types'
import { enrollPasskey, readTotpEnrollment, type TotpEnrollmentDisplay } from './utils'

export function TotpDialogs({
  code,
  dialog,
  mfaRequired,
  mutate,
  password,
  profileEmail,
  setCode,
  setDialog,
  setPassword,
  setTotpEnrollment,
  totpEnrollment,
}: {
  code: string
  dialog: 'mfa-enroll' | 'mfa-verify' | 'mfa-disable' | 'passkey' | null
  mfaRequired: boolean
  mutate: MutationHandler
  password: string
  profileEmail: string
  setCode: (value: string) => void
  setDialog: (dialog: 'mfa-enroll' | 'mfa-verify' | 'mfa-disable' | 'passkey' | null) => void
  setPassword: (value: string) => void
  setTotpEnrollment: (value: TotpEnrollmentDisplay | null) => void
  totpEnrollment: TotpEnrollmentDisplay | null
}) {
  return (
    <>
      <TotpEnrollDialog
        code={code}
        dialog={dialog}
        mutate={mutate}
        password={password}
        profileEmail={profileEmail}
        setCode={setCode}
        setDialog={setDialog}
        setPassword={setPassword}
        setTotpEnrollment={setTotpEnrollment}
        totpEnrollment={totpEnrollment}
      />
      <TotpVerifyDialog code={code} dialog={dialog} mutate={mutate} setCode={setCode} setDialog={setDialog} />
      <TotpDisableDialog
        dialog={dialog}
        mfaRequired={mfaRequired}
        mutate={mutate}
        password={password}
        profileEmail={profileEmail}
        setDialog={setDialog}
        setPassword={setPassword}
      />
    </>
  )
}

function TotpEnrollDialog({
  code,
  dialog,
  mutate,
  password,
  profileEmail,
  setCode,
  setDialog,
  setPassword,
  setTotpEnrollment,
  totpEnrollment,
}: {
  code: string
  dialog: string | null
  mutate: MutationHandler
  password: string
  profileEmail: string
  setCode: (value: string) => void
  setDialog: (dialog: null) => void
  setPassword: (value: string) => void
  setTotpEnrollment: (value: TotpEnrollmentDisplay | null) => void
  totpEnrollment: TotpEnrollmentDisplay | null
}) {
  return (
    <Dialog open={dialog === 'mfa-enroll'}>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (totpEnrollment) {
              const result = await mutate('MFA enabled.', () => verifyTotp({ code, trustDevice: true }), {
                invalidate: [accountQueryKeys.security],
              })
              if (result) {
                setCode('')
                setPassword('')
                setTotpEnrollment(null)
                setDialog(null)
              }
              return
            }
            await mutate('TOTP enrollment started.', async () => {
              const enrollment = await startTotpEnrollment({ password })
              setTotpEnrollment(readTotpEnrollment(enrollment))
              return enrollment
            })
          }}
        >
          <DialogHeader>
            <DialogTitle>{tt('Enroll authenticator app')}</DialogTitle>
            <DialogDescription>{tt('Confirm your password, then scan the generated setup code.')}</DialogDescription>
          </DialogHeader>
          <div className="dialogFormBody formStack">
            <input autoComplete="username" hidden readOnly type="text" value={profileEmail} />
            <Field label={tt('Password')}>
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
                <Field label={tt('Authenticator code')}>
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
              {tt('Cancel')}
            </Button>
            <Button type="submit" variant="secondary">
              {totpEnrollment ? 'Verify code' : 'Enroll authenticator app'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TotpVerifyDialog({
  code,
  dialog,
  mutate,
  setCode,
  setDialog,
}: {
  code: string
  dialog: string | null
  mutate: MutationHandler
  setCode: (value: string) => void
  setDialog: (dialog: null) => void
}) {
  return (
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
            <DialogTitle>{tt('Verify authenticator code')}</DialogTitle>
            <DialogDescription>{tt('Enter the current code from your authenticator app.')}</DialogDescription>
          </DialogHeader>
          <div className="dialogFormBody formStack">
            <Field label={tt('Authenticator code')}>
              <TextInput inputMode="numeric" onChange={(event) => setCode(event.target.value)} value={code} />
            </Field>
          </div>
          <DialogFooter>
            <Button onClick={() => setDialog(null)} type="button" variant="secondary">
              {tt('Cancel')}
            </Button>
            <Button type="submit" variant="secondary">
              {tt('Verify code')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TotpDisableDialog({
  dialog,
  mfaRequired,
  mutate,
  password,
  profileEmail,
  setDialog,
  setPassword,
}: {
  dialog: string | null
  mfaRequired: boolean
  mutate: MutationHandler
  password: string
  profileEmail: string
  setDialog: (dialog: null) => void
  setPassword: (value: string) => void
}) {
  return (
    <Dialog open={dialog === 'mfa-disable'}>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            const result = await mutate('MFA disabled.', () => disableTotp({ password }), {
              invalidate: [accountQueryKeys.security],
            })
            if (result) {
              setPassword('')
              setDialog(null)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{tt('Disable MFA')}</DialogTitle>
            <DialogDescription>{tt('Confirm your password to remove authenticator app protection.')}</DialogDescription>
          </DialogHeader>
          <div className="dialogFormBody formStack">
            <input autoComplete="username" hidden readOnly type="text" value={profileEmail} />
            <Field label={tt('Password')}>
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
              {tt('Cancel')}
            </Button>
            <Button disabled={mfaRequired} type="submit" variant="danger">
              {tt('Disable authenticator app')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PasskeyDialog({
  dialog,
  mutate,
  passkeyName,
  security,
  setDialog,
  setPasskeyName,
}: {
  dialog: string | null
  mutate: MutationHandler
  passkeyName: string
  security: SecurityState | null
  setDialog: (dialog: null) => void
  setPasskeyName: (value: string) => void
}) {
  return (
    <Dialog open={dialog === 'passkey'}>
      <DialogContent>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            const result = await mutate('Passkey enrolled.', () => enrollPasskey(passkeyName), {
              invalidate: [accountQueryKeys.passkeys, accountQueryKeys.security],
            })
            if (result) {
              setPasskeyName('')
              setDialog(null)
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{tt('Add passkey')}</DialogTitle>
            <DialogDescription>{tt('Create a hardware-backed passkey for this account.')}</DialogDescription>
          </DialogHeader>
          <div className="dialogFormBody formStack">
            <Field label={tt('Passkey name')}>
              <TextInput onChange={(event) => setPasskeyName(event.target.value)} value={passkeyName} />
            </Field>
          </div>
          <DialogFooter>
            <Button onClick={() => setDialog(null)} type="button" variant="secondary">
              {tt('Cancel')}
            </Button>
            <Button disabled={!security?.policy.passkeys.enabled} type="submit" variant="secondary">
              <Fingerprint size={18} /> {tt('Add passkey')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TotpEnrollmentDetails({ enrollment }: { enrollment: TotpEnrollmentDisplay }) {
  return (
    <div className="setupPanel">
      <h3>{tt('Authenticator setup')}</h3>
      {enrollment.qrCode ? (
        <img className="setupQr" src={enrollment.qrCode} alt="Authenticator app QR code" width="168" height="168" />
      ) : null}
      {enrollment.otpAuthUri ? (
        <p>
          <strong>{tt('Enrollment URI')}</strong>
          <code>{enrollment.otpAuthUri}</code>
        </p>
      ) : null}
      {enrollment.secret ? (
        <p>
          <strong>{tt('Secret')}</strong>
          <code>{enrollment.secret}</code>
        </p>
      ) : null}
      {enrollment.backupCodes.length ? (
        <div>
          <strong>{tt('Backup codes')}</strong>
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
