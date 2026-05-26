import { SettingRow, tt } from '../../console-shared'
import { SettingsSection, SettingsSections, SignInExperiencePage } from '../../helpers/helpers-preview'

export function CollectUserProfilePage() {
  return (
    <SignInExperiencePage
      activeTab="collect-user-profile"
      description={tt('Custom profile field collection is outside the v1 hosted auth surface.')}
      title={tt('Collect user profile')}
    >
      <SettingsSections>
        <SettingsSection
          title={tt('Supported profile data')}
          description={tt('Current hosted auth collects the built-in user profile fields.')}
        >
          <div className="grid gap-3">
            <SettingRow label={tt('Email')} value="Built in" />
            <SettingRow label={tt('Name')} value="Built in" />
            <SettingRow label={tt('Username')} value="Available when username sign-in is enabled" />
            <SettingRow label={tt('Avatar')} value="Managed from user profile surfaces" />
          </div>
        </SettingsSection>
      </SettingsSections>
    </SignInExperiencePage>
  )
}
