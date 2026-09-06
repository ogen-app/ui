import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { GearSixIcon, PaletteIcon } from '@phosphor-icons/react'
import { ActivityNavGlyph } from '@/components/activity/ActivityNavGlyph'
import { NavGlyph } from '@/components/layout/nav/NavGlyph'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The three things that are always there, at both levels.
 *
 * Brand, Activity and Settings were three rows in the list — the first two at
 * the top of it, Settings alone in the footer. They are one line now, in the
 * part of the rail that already means "the things around the work". What was
 * demoting them is what the footer says by being the footer, so a rule and
 * three rows were spending five rows' worth of the list to say it twice.
 *
 * **They survive the drill on purpose.** A guardrail is the thing you check
 * *while* writing a post; a design that made you leave the campaign to read
 * one would have lost the argument it is making about levels. This is the one
 * band of the rail that does not change when the level does.
 */
export function NavUtilityStrip() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const brandEnabled = useFeatureFlag('brand-materials')
  const activityEnabled = useFeatureFlag('activity')

  return (
    <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
      {brandEnabled && (
        <NavGlyph
          label={t('nav.brand')}
          icon={PaletteIcon}
          to="/brand"
          isActive={pathname.startsWith('/brand')}
        />
      )}
      {activityEnabled && <ActivityNavGlyph />}
      <NavGlyph
        label={t('nav.workspaceSettings')}
        icon={GearSixIcon}
        to="/workspace-settings"
        isActive={pathname.startsWith('/workspace-settings')}
      />
    </div>
  )
}
