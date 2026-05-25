import { Languages, Moon, Sun } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeLanguage, tt } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
export function PreferencesControls({ className }: { className?: string }) {
  const { i18n } = useTranslation()
  const { setTheme, theme } = useTheme()
  const languageId = useId()
  const themeId = useId()
  const language = normalizeLanguage(i18n.language)
  return (
    <div className={cn('preferencesControls', className)}>
      <label className="preferencesControl" htmlFor={languageId}>
        <Languages aria-hidden="true" size={15} />
        <span>{tt('common.language')}</span>
        <select
          aria-label={tt('common.language')}
          id={languageId}
          onChange={(event) => void i18n.changeLanguage(event.target.value === 'zh' ? 'zh' : 'en')}
          value={language}
        >
          <option value="en">{tt('EN')}</option>
          <option value="zh">中文</option>
        </select>
      </label>
      <label className="preferencesControl" htmlFor={themeId}>
        {theme === 'dark' ? <Moon aria-hidden="true" size={15} /> : <Sun aria-hidden="true" size={15} />}
        <span>{tt('common.theme')}</span>
        <select
          aria-label={tt('common.theme')}
          id={themeId}
          onChange={(event) => setTheme(event.target.value === 'dark' ? 'dark' : 'light')}
          value={theme}
        >
          <option value="light">{tt('common.light')}</option>
          <option value="dark">{tt('common.dark')}</option>
        </select>
      </label>
    </div>
  )
}
