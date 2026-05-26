import {
  type ApplicationResponse,
  applicationTypeOptions,
  Button,
  CheckCircle2,
  cn,
  createApplicationRequestSchema,
  createRoleRequestSchema,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  emptyForm,
  Field,
  type FormEvent,
  type FormState,
  LinkButton,
  managementCreateUserRequestSchema,
  type ReactNode,
  SelectInput,
  SettingRow,
  TextArea,
  TextInput,
  tt,
  useState,
  type z,
} from '../console-shared'
import { listValue } from './helpers-dialogs'
import { parseForm, setValue } from './helpers-utils'

export function CreateApplicationDialog({
  createdApplication,
  error,
  onClose,
  onSubmit,
  open,
  pending,
}: {
  createdApplication:
    | (ApplicationResponse & {
        clientSecret?: string
      })
    | null
  error: string | null
  onClose: () => void
  onSubmit: (input: z.infer<typeof createApplicationRequestSchema>) => void
  open: boolean
  pending: boolean
}) {
  const [form, setForm] = useState<FormState>({
    clientType: 'public_spa',
    redirectUris: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  return (
    <Dialog open={open}>
      {createdApplication ? (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tt('Application created')}</DialogTitle>
            <DialogDescription>
              {' '}
              {tt('Copy the generated credentials, then open the settings page to finish setup.')}{' '}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 p-4 text-sm">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 data-icon="inline-start" />
              {createdApplication.name}
            </div>
            <SettingRow label={tt('Client ID')} value={createdApplication.clientId} />
            {createdApplication.clientSecret ? (
              <SettingRow label={tt('Client secret')} value={createdApplication.clientSecret} />
            ) : (
              <SettingRow label={tt('Client secret')} value="No secret for public clients" />
            )}
            <SettingRow label={tt('Redirect URIs')} value={listValue(createdApplication.redirectUris, ', ')} />
            <SettingRow label={tt('Next step')} value="Review redirects, origins, and client metadata." />
          </div>
          <DialogFooter className="m-0">
            <LinkButton href={`/console/applications/${createdApplication.id}/settings`} variant="secondary">
              {' '}
              {tt('Open settings')}{' '}
            </LinkButton>
            <Button onClick={onClose} type="button">
              {' '}
              {tt('Close')}{' '}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <FormDialog
          error={validationError ?? error}
          onClose={onClose}
          onSubmit={(event) => {
            event.preventDefault()
            try {
              setValidationError(null)
              onSubmit(
                parseForm(createApplicationRequestSchema, {
                  ...form,
                  firstParty: true,
                  redirectUris: form.redirectUris.split('\n').filter(Boolean),
                }),
              )
            } catch (submitError) {
              setValidationError((submitError as Error).message)
            }
          }}
          pending={pending}
          title={tt('Create application')}
        >
          <Field label={tt('Name')}>
            <TextInput onChange={(event) => setValue(setForm, 'name', event.target.value)} required />
          </Field>
          <Field label={tt('Slug')}>
            <TextInput
              onChange={(event) => setValue(setForm, 'slug', event.target.value)}
              placeholder="customer-portal"
            />
          </Field>
          <ApplicationTypeCards
            onChange={(clientType) => setValue(setForm, 'clientType', clientType)}
            value={form.clientType}
          />
          <Field label={tt('Redirect URIs')} help={tt('One URI per line.')}>
            <TextArea onChange={(event) => setValue(setForm, 'redirectUris', event.target.value)} required />
          </Field>
        </FormDialog>
      )}
    </Dialog>
  )
}
export function ApplicationTypeCards({ onChange, value }: { onChange: (clientType: string) => void; value: string }) {
  const selected = value
  return (
    <fieldset className="applicationTypeGrid">
      <legend>{tt('Application type')}</legend>
      {applicationTypeOptions.map((option) => (
        <button
          aria-pressed={selected === option.value}
          className={cn('applicationTypeCard', selected === option.value && 'selected')}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          <span className="applicationTypeIcon" aria-hidden="true">
            <option.icon size={18} />
          </span>
          <span>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </span>
        </button>
      ))}
    </fieldset>
  )
}
export function CreateUserDialog({
  error,
  onClose,
  onSubmit,
  open,
  pending,
}: {
  error: string | null
  onClose: () => void
  onSubmit: (input: z.infer<typeof managementCreateUserRequestSchema>) => void
  open: boolean
  pending: boolean
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationError, setValidationError] = useState<string | null>(null)
  return (
    <Dialog open={open}>
      <FormDialog
        error={validationError ?? error}
        onClose={onClose}
        onSubmit={(event) => {
          event.preventDefault()
          try {
            setValidationError(null)
            onSubmit(parseForm(managementCreateUserRequestSchema, form))
          } catch (submitError) {
            setValidationError(submitError instanceof Error ? tt(submitError.message) : tt('Invalid form input.'))
          }
        }}
        pending={pending}
        title={tt('Create user')}
      >
        <Field label={tt('Email')}>
          <TextInput onChange={(event) => setValue(setForm, 'email', event.target.value)} required type="email" />
        </Field>
        <Field label={tt('Display name')}>
          <TextInput onChange={(event) => setValue(setForm, 'displayName', event.target.value)} required />
        </Field>
        <Field label={tt('Username')}>
          <TextInput autoComplete="username" onChange={(event) => setValue(setForm, 'username', event.target.value)} />
        </Field>
        <Field label={tt('Initial password')}>
          <TextInput
            autoComplete="new-password"
            onChange={(event) => setValue(setForm, 'password', event.target.value)}
            type="password"
          />
        </Field>
      </FormDialog>
    </Dialog>
  )
}
export function CreateRoleDialog({
  error,
  onClose,
  onSubmit,
  open,
  pending,
  resources,
}: {
  error: string | null
  onClose: () => void
  onSubmit: (input: z.infer<typeof createRoleRequestSchema>) => void
  open: boolean
  pending: boolean
  resources: Array<{
    id: string
    name: string
  }>
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationError, setValidationError] = useState<string | null>(null)
  return (
    <Dialog open={open}>
      <FormDialog
        error={validationError ?? error}
        onClose={onClose}
        onSubmit={(event) => {
          event.preventDefault()
          try {
            setValidationError(null)
            onSubmit(parseForm(createRoleRequestSchema, form))
          } catch (submitError) {
            setValidationError(submitError instanceof Error ? tt(submitError.message) : tt('Invalid form input.'))
          }
        }}
        pending={pending}
        title={tt('Create role')}
      >
        <Field label={tt('Key')}>
          <TextInput onChange={(event) => setValue(setForm, 'key', event.target.value)} required />
        </Field>
        <Field label={tt('Name')}>
          <TextInput onChange={(event) => setValue(setForm, 'name', event.target.value)} required />
        </Field>
        <Field label={tt('Description')}>
          <TextInput onChange={(event) => setValue(setForm, 'description', event.target.value)} />
        </Field>
        <Field label={tt('API resource')}>
          <SelectInput onChange={(event) => setValue(setForm, 'resourceId', event.target.value)} defaultValue="">
            <option value="">{tt('Global role')}</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FormDialog>
    </Dialog>
  )
}
export function ConfirmDialog({
  description,
  error,
  onClose,
  onConfirm,
  open,
  pending,
  title,
}: {
  description: string
  error: string | null
  onClose: () => void
  onConfirm: () => void
  open: boolean
  pending: boolean
  title: string
}) {
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="secondary">
            {' '}
            {tt('Cancel')}{' '}
          </Button>
          <Button disabled={pending} onClick={onConfirm} type="button" variant="danger">
            {pending ? tt('Deleting...') : tt('Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export function SimpleCreateDialog({
  error,
  fields,
  onClose,
  onSubmit,
  open,
  pending,
  title,
}: {
  error: string | null
  fields: Array<[string, string]>
  onClose: () => void
  onSubmit: (form: FormState) => void
  open: boolean
  pending: boolean
  title: string
}) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [validationError, setValidationError] = useState<string | null>(null)
  return (
    <Dialog open={open}>
      <FormDialog
        error={validationError ?? error}
        onClose={onClose}
        onSubmit={(event) => {
          event.preventDefault()
          try {
            setValidationError(null)
            onSubmit(form)
          } catch (submitError) {
            setValidationError(submitError instanceof Error ? tt(submitError.message) : tt('Invalid form input.'))
          }
        }}
        pending={pending}
        title={title}
      >
        {fields.map(([name, label]) => (
          <Field key={name} label={label}>
            <TextInput
              onChange={(event) => setValue(setForm, name, event.target.value)}
              required={name !== 'description'}
            />
          </Field>
        ))}
      </FormDialog>
    </Dialog>
  )
}
export function FormDialog({
  children,
  error,
  onClose,
  onSubmit,
  pending,
  title,
}: {
  children: ReactNode
  error: string | null
  onClose: () => void
  onSubmit: (event: FormEvent) => void
  pending: boolean
  title: string
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {tt('Required fields are validated before the management API request is sent.')}
        </DialogDescription>
      </DialogHeader>
      <form className="grid gap-4 p-4" onSubmit={onSubmit}>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {children}
        <DialogFooter className="m-0 -mx-4 -mb-4">
          <Button onClick={onClose} type="button" variant="secondary">
            {' '}
            {tt('Cancel')}{' '}
          </Button>
          <Button disabled={pending} type="submit">
            {pending ? tt('Saving...') : tt('Save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
