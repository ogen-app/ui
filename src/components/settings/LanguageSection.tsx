import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { TextSelect } from '@/components/ui/text-select'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { LOCALES, isLocale } from '@/i18n/config'
import { useLocaleStore } from '@/stores/localeStore'

/**
 * The language picker, on Profile rather than in Workspace Settings.
 *
 * It is a personal preference, not a workspace one — and a device-local
 * personal preference at that: it lives in `localStorage`, so it applies on
 * the login screen, where there is no session to read `/api/settings` with.
 * The copy says as much, because "changed it on my laptop, still English on
 * my phone" is otherwise a bug report.
 *
 * Choosing applies immediately. There is no Save entry to register with the
 * page's save context: nothing is staged, and a language you have to confirm
 * in a language you may not read is a poor trade.
 */
export function LanguageSection() {
  const id = useId()
  const { t } = useTranslation()
  const locale = useLocaleStore((s) => s.locale)
  const switching = useLocaleStore((s) => s.switchingTo !== null)
  const setLocale = useLocaleStore((s) => s.setLocale)

  return (
    <SettingsCard title={t('locale.section.title')}>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{t('locale.section.label')}</Label>
          <TextSelect
            id={id}
            value={locale}
            disabled={switching}
            elements={LOCALES.map(({ code, label }) => ({ id: code, displayValue: label }))}
            onValueChange={(next) => {
              // The select can only ever hand back one of its own options, but
              // its value type is a bare string — narrow rather than assert.
              if (isLocale(next)) void setLocale(next).catch(() => {})
            }}
          />
        </div>
      </div>
      <p className="max-w-150 text-xs text-tertiary-foreground">
        {t('locale.section.description')}
      </p>
    </SettingsCard>
  )
}
