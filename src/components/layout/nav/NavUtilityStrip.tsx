import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { GearSixIcon, PaletteIcon } from '@phosphor-icons/react'
import { ActivitySidebarItem } from '@/components/activity/ActivitySidebarItem'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The band under the level: the things that are around the work rather than
 * the work, in the same three slots whichever level is on screen.
 *
 * **The rows do not move, only what they point at.** Foundation and Activity
 * are workspace-wide and survive the drill unchanged — a guardrail is the
 * thing you check *while* writing a post, and a design that made you leave the
 * campaign to read one would have lost the argument it is making about levels.
 * The last row is settings for whatever you are standing in: the workspace at
 * level 0, this campaign at level 1.
 *
 * That last row is why the campaign's own Settings is not in the list above.
 * It was the sixth section, under five sections that are places you go to do
 * something — but settings is the same *kind* of thing at both levels, and
 * putting it here means the gear is in one place in the rail rather than
 * migrating between the list and the footer depending on how deep you are.
 */
export function NavUtilityStrip({
  level,
  campaignId,
}: {
  level: 0 | 1
  campaignId: string | null
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const brandEnabled = useFeatureFlag('brand-materials')
  const activityEnabled = useFeatureFlag('activity')

  const gear = <GearSixIcon weight="regular" className="size-5 flex-none" />

  return (
    <div className="flex flex-col gap-1">
      {/* Gated here as well as on the route: with the flag off the app must
          have no Foundation at all. */}
      {brandEnabled && (
        <AppSidebarButtonMenu
          icon={<PaletteIcon weight="regular" className="size-5 flex-none" />}
          text={t('nav.foundation')}
          isActive={pathname.startsWith('/foundation')}
          to="/foundation"
        />
      )}
      {activityEnabled && (
        <ActivitySidebarItem isActive={pathname.startsWith('/activity')} />
      )}
      {level === 1 && campaignId ? (
        <AppSidebarButtonMenu
          icon={gear}
          text={t('nav.campaignSettings')}
          // Every campaign route ends in its section, and only one of them is
          // `settings`. `/workspace-settings` is a different path, not a
          // suffix of one, so it cannot answer to this.
          isActive={pathname.endsWith('/settings')}
          to="/campaigns/$campaignId/settings"
          params={{ campaignId }}
        />
      ) : (
        <AppSidebarButtonMenu
          icon={gear}
          text={t('nav.workspaceSettings')}
          isActive={pathname.startsWith('/workspace-settings')}
          to="/workspace-settings"
        />
      )}
    </div>
  )
}
