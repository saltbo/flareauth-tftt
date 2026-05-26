import {
  consoleQueryKeys,
  getBrandingSettings,
  getSecurityPolicy,
  getSignInSettings,
  updateBrandingSettings,
  uploadBrandingFavicon,
  uploadBrandingLogo,
} from '@/lib/api/management'
import {
  Field,
  type FormEvent,
  type HostedAuthPreviewState,
  TextArea,
  TextInput,
  tt,
  updateManagementBrandingSettingsRequestSchema,
  useEffect,
  useQuery,
  useQueryClient,
  useState,
} from '../../console-shared'
import { useConnectorPreviewProviders } from '../../helpers/helpers-dialogs'
import { AssetUploadControl } from '../../helpers/helpers-forms'
import {
  ChangesSection,
  HostedAuthPreview,
  SettingsSection,
  SettingsSections,
  SignInExperienceEditorLayout,
  SignInExperiencePage,
} from '../../helpers/helpers-preview'
import { nullableString, removeBlankValues, shallowEqual, useAdminMutation } from '../../helpers/helpers-utils'

export function BrandingPage() {
  const query = useQuery({
    queryKey: consoleQueryKeys.branding,
    queryFn: getBrandingSettings,
  })
  const signInQuery = useQuery({
    queryKey: consoleQueryKeys.signIn,
    queryFn: getSignInSettings,
  })
  const securityQuery = useQuery({
    queryKey: consoleQueryKeys.security,
    queryFn: getSecurityPolicy,
  })
  const connectorsQuery = useConnectorPreviewProviders()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#b42318',
    backgroundColor: '#f7f3ee',
    customCss: '',
    productName: '',
    headline: '',
    description: '',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  const updateMutation = useAdminMutation({
    mutationFn: updateBrandingSettings,
    onSuccess: () => {
      setValidationError(null)
      return queryClient.invalidateQueries({
        queryKey: consoleQueryKeys.branding,
      })
    },
  })
  const logoMutation = useAdminMutation({
    mutationFn: uploadBrandingLogo,
    onSuccess: (response) => {
      setForm((value) => ({
        ...value,
        logoUrl: response.asset.publicUrl,
      }))
      return Promise.resolve()
    },
  })
  const faviconMutation = useAdminMutation({
    mutationFn: uploadBrandingFavicon,
    onSuccess: (response) => {
      setForm((value) => ({
        ...value,
        faviconUrl: response.asset.publicUrl,
      }))
      return Promise.resolve()
    },
  })
  useEffect(() => {
    if (!query.data?.copy) return
    setForm({
      logoUrl: query.data.branding.logoUrl ?? '',
      faviconUrl: query.data.branding.faviconUrl ?? '',
      primaryColor: query.data.branding.primaryColor ?? '#b42318',
      backgroundColor: query.data.branding.backgroundColor ?? '#f7f3ee',
      customCss: query.data.branding.customCss ?? '',
      productName: query.data.copy.productName,
      headline: query.data.copy.headline,
      description: query.data.copy.description,
    })
  }, [query.data])
  const loadedForm = query.data?.copy
    ? {
        logoUrl: query.data.branding.logoUrl ?? '',
        faviconUrl: query.data.branding.faviconUrl ?? '',
        primaryColor: query.data.branding.primaryColor ?? '#b42318',
        backgroundColor: query.data.branding.backgroundColor ?? '#f7f3ee',
        customCss: query.data.branding.customCss ?? '',
        productName: query.data.copy.productName,
        headline: query.data.copy.headline,
        description: query.data.copy.description,
      }
    : null
  const hasChanges = loadedForm ? !shallowEqual(form, loadedForm) : false
  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const payload = updateManagementBrandingSettingsRequestSchema.safeParse(
      removeBlankValues({
        branding: {
          logoUrl: nullableString(form.logoUrl),
          faviconUrl: nullableString(form.faviconUrl),
          primaryColor: nullableString(form.primaryColor),
          backgroundColor: nullableString(form.backgroundColor),
          customCss: nullableString(form.customCss),
        },
        copy: {
          productName: form.productName,
          headline: form.headline,
          description: form.description,
        },
      }),
    )
    if (!payload.success) {
      setValidationError(payload.error.issues[0]?.message ?? 'Invalid branding settings.')
      return
    }
    setValidationError(null)
    updateMutation.mutate(payload.data)
  }
  const preview: HostedAuthPreviewState = {
    productName: form.productName,
    headline: form.headline,
    description: form.description,
    logoUrl: form.logoUrl,
    primaryColor: form.primaryColor,
    backgroundColor: form.backgroundColor,
    customCss: form.customCss,
    passwordEnabled: signInQuery.data?.signIn?.passwordEnabled,
    signupEnabled: signInQuery.data?.signIn?.signupEnabled,
    socialLoginEnabled: signInQuery.data?.signIn?.socialLoginEnabled,
    socialProviders: connectorsQuery.providers,
    passkeysEnabled: securityQuery.data?.policy?.passkeys?.enabled,
    oneTapEnabled: signInQuery.data?.builtInProviders?.oneTap?.enabled,
    phoneEnabled: signInQuery.data?.builtInProviders?.phone?.enabled,
    web3WalletEnabled: signInQuery.data?.builtInProviders?.web3Wallet?.enabled,
    identifierFirst: signInQuery.data?.signIn?.identifierFirst,
    usernameEnabled: signInQuery.data?.signIn?.usernameEnabled,
    emailOtpEnabled: signInQuery.data?.signIn?.emailOtpEnabled,
  }
  return (
    <SignInExperiencePage
      activeTab="branding"
      title={tt('Branding')}
      description={tt(
        'Configure hosted sign-in and Account Center brand assets, colors, and constrained theme variables.',
      )}
      error={query.error ?? signInQuery.error ?? securityQuery.error ?? connectorsQuery.error}
      loading={query.isLoading || signInQuery.isLoading || securityQuery.isLoading}
      onRetry={() => {
        void query.refetch()
        void signInQuery.refetch()
        void securityQuery.refetch()
        void connectorsQuery.refetch()
      }}
    >
      {query.data ? (
        <form onSubmit={onSubmit}>
          <SignInExperienceEditorLayout
            preview={<HostedAuthPreview preview={preview} />}
            settings={
              <SettingsSections>
                <SettingsSection
                  title={tt('Brand settings')}
                  description={tt('External asset URLs must use HTTPS. Custom CSS accepts --auth-* declarations only.')}
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
                    <Field label={tt('Logo URL')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            logoUrl: event.target.value,
                          }))
                        }
                        type="url"
                        value={form.logoUrl}
                      />
                    </Field>
                    <AssetUploadControl
                      accept="image/png,image/jpeg,image/webp"
                      label={tt('Upload branding logo')}
                      onFile={(file) => logoMutation.mutate(file)}
                      previewUrl={form.logoUrl || null}
                    />
                    <Field label={tt('Favicon URL')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            faviconUrl: event.target.value,
                          }))
                        }
                        type="url"
                        value={form.faviconUrl}
                      />
                    </Field>
                    <AssetUploadControl
                      accept="image/png,image/webp,image/x-icon,image/vnd.microsoft.icon"
                      label={tt('Upload favicon')}
                      onFile={(file) => faviconMutation.mutate(file)}
                      previewUrl={form.faviconUrl || null}
                    />
                    <Field label={tt('Primary color')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            primaryColor: event.target.value,
                          }))
                        }
                        type="color"
                        value={form.primaryColor}
                      />
                    </Field>
                    <Field label={tt('Background color')}>
                      <TextInput
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            backgroundColor: event.target.value,
                          }))
                        }
                        type="color"
                        value={form.backgroundColor}
                      />
                    </Field>
                    <Field label={tt('Custom CSS')}>
                      <TextArea
                        onChange={(event) =>
                          setForm((value) => ({
                            ...value,
                            customCss: event.target.value,
                          }))
                        }
                        placeholder={tt('--auth-panel-radius: 8px;')}
                        value={form.customCss}
                      />
                    </Field>
                    {validationError ||
                    updateMutation.errorMessage ||
                    logoMutation.errorMessage ||
                    faviconMutation.errorMessage ? (
                      <div className="text-sm text-destructive">
                        {validationError ??
                          updateMutation.errorMessage ??
                          logoMutation.errorMessage ??
                          faviconMutation.errorMessage}
                      </div>
                    ) : null}
                  </div>
                </SettingsSection>
                <ChangesSection
                  description={tt('Save brand updates or restore the loaded values.')}
                  onDiscard={() => {
                    if (loadedForm) setForm(loadedForm)
                    setValidationError(null)
                  }}
                  pending={updateMutation.isPending}
                  saveLabel="Save branding"
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
