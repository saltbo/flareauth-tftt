import {
  consoleQueryKeys,
  getBrandingSettings,
  getSecurityPolicy,
  getSignInSettings,
  updateSignInSettings,
} from '@/lib/api/management'
import {
  Field,
  type FormEvent,
  type HostedAuthPreviewState,
  TextArea,
  TextInput,
  tt,
  updateManagementSignInSettingsRequestSchema,
  useEffect,
  useQuery,
  useQueryClient,
  useState,
} from '../../console-shared'
import { StatusBadge, useConnectorPreviewProviders } from '../../helpers/helpers-dialogs'
import {
  ChangesSection,
  HostedAuthPreview,
  SettingsSection,
  SettingsSections,
  SignInExperienceEditorLayout,
  SignInExperiencePage,
} from '../../helpers/helpers-preview'
import { nullableString, shallowEqual, useAdminMutation } from '../../helpers/helpers-utils'

export function ContentSettingsPage() {
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
    productName: '',
    headline: '',
    description: '',
    termsUri: '',
    privacyUri: '',
    supportEmail: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const updateMutation = useAdminMutation({
    mutationFn: updateSignInSettings,
    onSuccess: () => {
      setValidationError(null)
      return queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.signIn,
      })
    },
  })
  useEffect(() => {
    if (!query.data?.copy) return
    setForm({
      productName: query.data.copy.productName,
      headline: query.data.copy.headline,
      description: query.data.copy.description,
      termsUri: query.data.links?.termsUri ?? '',
      privacyUri: query.data.links?.privacyUri ?? '',
      supportEmail: query.data.links?.supportEmail ?? '',
    })
  }, [query.data])
  const loadedForm = query.data?.copy
    ? {
        productName: query.data.copy.productName,
        headline: query.data.copy.headline,
        description: query.data.copy.description,
        termsUri: query.data.links?.termsUri ?? '',
        privacyUri: query.data.links?.privacyUri ?? '',
        supportEmail: query.data.links?.supportEmail ?? '',
      }
    : null
  const hasChanges = loadedForm ? !shallowEqual(form, loadedForm) : false
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const payload = updateManagementSignInSettingsRequestSchema.safeParse({
      links: {
        termsUri: nullableString(form.termsUri),
        privacyUri: nullableString(form.privacyUri),
        supportEmail: nullableString(form.supportEmail),
      },
      copy: {
        productName: form.productName,
        headline: form.headline,
        description: form.description,
      },
    })
    if (!payload.success) {
      setValidationError(payload.error.issues[0]!.message)
      return
    }
    setValidationError(null)
    updateMutation.mutate(payload.data)
  }
  const preview: HostedAuthPreviewState = {
    productName: form.productName,
    headline: form.headline,
    description: form.description,
    logoUrl: brandingQuery.data?.branding?.logoUrl ?? undefined,
    primaryColor: brandingQuery.data?.branding?.primaryColor ?? undefined,
    backgroundColor: brandingQuery.data?.branding?.backgroundColor ?? undefined,
    customCss: brandingQuery.data?.branding?.customCss ?? undefined,
    passwordEnabled: query.data?.signIn?.passwordEnabled,
    signupEnabled: query.data?.signIn?.signupEnabled,
    socialLoginEnabled: query.data?.signIn?.socialLoginEnabled,
    socialProviders: connectorsQuery.providers,
    passkeysEnabled: securityQuery.data?.policy?.passkeys?.enabled,
    oneTapEnabled: query.data?.builtInProviders?.oneTap?.enabled,
    phoneEnabled: query.data?.builtInProviders?.phone?.enabled,
    web3WalletEnabled: query.data?.builtInProviders?.web3Wallet?.enabled,
    identifierFirst: query.data?.signIn?.identifierFirst,
    usernameEnabled: query.data?.signIn?.usernameEnabled,
    emailOtpEnabled: query.data?.signIn?.emailOtpEnabled,
    termsUri: form.termsUri,
    privacyUri: form.privacyUri,
    supportEmail: form.supportEmail,
  }
  return (
    <SignInExperiencePage
      activeTab="content"
      description={tt('Manage hosted authentication language, page messages, and legal links.')}
      error={query.error ?? brandingQuery.error ?? securityQuery.error ?? connectorsQuery.error}
      loading={query.isLoading || brandingQuery.isLoading || securityQuery.isLoading}
      onRetry={() => {
        void query.refetch()
        void brandingQuery.refetch()
        void securityQuery.refetch()
        void connectorsQuery.refetch()
      }}
      title={tt('Content')}
    >
      {query.data ? (
        <form onSubmit={onSubmit}>
          <SignInExperienceEditorLayout
            preview={<HostedAuthPreview preview={preview} />}
            settings={
              <SettingsSections>
                <SettingsSection
                  title={tt('Hosted messages')}
                  description={tt('These strings are exposed through public hosted auth config.')}
                >
                  <div className="formStack">
                    <Field label={tt('Product name')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            productName: event.target.value,
                          }))
                        }
                        required
                        value={form.productName}
                      />
                    </Field>
                    <Field label={tt('Sign-in message')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            headline: event.target.value,
                          }))
                        }
                        required
                        value={form.headline}
                      />
                    </Field>
                    <Field label={tt('Sign-up message')}>
                      <TextArea
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            description: event.target.value,
                          }))
                        }
                        required
                        value={form.description}
                      />
                    </Field>
                  </div>
                </SettingsSection>
                <SettingsSection
                  title={tt('Links')}
                  description={tt(
                    'Public legal and support links must use safe values accepted by management validation.',
                  )}
                >
                  <div className="formStack">
                    <Field label={tt('Terms URL')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            termsUri: event.target.value,
                          }))
                        }
                        type="url"
                        value={form.termsUri}
                      />
                    </Field>
                    <Field label={tt('Privacy URL')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            privacyUri: event.target.value,
                          }))
                        }
                        type="url"
                        value={form.privacyUri}
                      />
                    </Field>
                    <Field label={tt('Support email')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            supportEmail: event.target.value,
                          }))
                        }
                        type="email"
                        value={form.supportEmail}
                      />
                    </Field>
                    {validationError || updateMutation.errorMessage ? (
                      <StatusBadge
                        active={false}
                        activeLabel=""
                        inactiveLabel={validationError ?? updateMutation.errorMessage ?? ''}
                      />
                    ) : null}
                  </div>
                </SettingsSection>
                <ChangesSection
                  description={tt('Save hosted copy updates or restore the loaded values.')}
                  onDiscard={() => {
                    if (loadedForm) setForm(loadedForm)
                    setValidationError(null)
                  }}
                  pending={updateMutation.isPending}
                  saveLabel="Save content"
                  visible={hasChanges}
                />
              </SettingsSections>
            }
          />
        </form>
      ) : null}
    </SignInExperiencePage>
  )
}
