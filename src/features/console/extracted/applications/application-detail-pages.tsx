import { ApplicationDetailPage } from './application-detail'

export function ApplicationSettingsPage({ applicationId }: { applicationId: string }) {
  return <ApplicationDetailPage applicationId={applicationId} section="settings" />
}

export function ApplicationBrandingPage({ applicationId }: { applicationId: string }) {
  return <ApplicationDetailPage applicationId={applicationId} section="branding" />
}

export function ApplicationFederatedCredentialsPage({ applicationId }: { applicationId: string }) {
  return <ApplicationDetailPage applicationId={applicationId} section="federated-credentials" />
}
