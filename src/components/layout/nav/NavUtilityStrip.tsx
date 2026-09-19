import { useTranslation } from 'react-i18next'
import { useLocation } from '@tanstack/react-router'
import { BellSimpleIcon, GearSixIcon, PaletteIcon } from '@phosphor-icons/react'
import { ActivitySidebarItem } from '@/components/activity/ActivitySidebarItem'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useFeatureFlag } from '@/config/featureFlags'

/**
 * The band under the level: the things that are around the work rather than
 * the work, in the same slots whichever level is on screen.
 *
 * **The slots hold, and their scope changes with the level.** The same rows in
 * the same order at both levels — what each one points at is the workspace's
 * at level 0 and this campaign's at level 1:
 *
 * - Activity → Activity: what happened, at whichever scope you are standing in.
 * - Workspace settings → Settings: the record you are inside.
 *
 * **Foundation is level 0's alone**, which is the one asymmetry in the band. It
 * had a level-1 row while the campaign's Foundation page was its documents
 * with a read-only band of inherited brand on top; the documents are Assets
 * now, a row in the level itself, and what is left of the pairing — which
 * voice, which audience — is a card on the campaign's Strategy page rather
 * than a destination.
 *
 * The level-1 rows carry no "Campaign" prefix. The rail has already said which
 * campaign, by name, at the top of the level, and repeating the noun down every
 * row is the same fact stated eight more times.
 *
 * This is a reversal, and the reason is worth keeping. Foundation and Activity
 * used to survive the drill unchanged, on the argument that a guardrail is the
 * thing you check *while* writing a post. True, but it made the campaign level
 * a place two of whose rows quietly left it — you would click Activity inside
 * a campaign and land in the workspace, having lost the campaign without
 * asking to. A level that some of its own rows fall out of is not a level. The
 * workspace is still one click away, and by a control that says so: the caret,
 * the mark, or the account menu, which lists all of level 0.
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
  const activityEnabled = useFeatureFlag('activity')

  const gear = <GearSixIcon weight="regular" className="size-5 flex-none" />

  if (level === 1 && campaignId) {
    return (
      <div className="flex flex-col gap-1">
        {activityEnabled && (
          // Plain, where level 0's row carries an unread count: the count is
          // the workspace's, from an endpoint that takes no campaign, and a
          // number here would be answering a different question than the row
          // it sits under is asking.
          <AppSidebarButtonMenu
            icon={
              <BellSimpleIcon weight="regular" className="size-5 flex-none" />
            }
            text={t('nav.campaign.activity')}
            isActive={pathname.includes('/activity')}
            to="/campaigns/$campaignId/activity"
            params={{ campaignId }}
          />
        )}
        <AppSidebarButtonMenu
          icon={gear}
          text={t('nav.campaign.settings')}
          // Every campaign route ends in its section, and only one of them is
          // `settings`. `/workspace-settings` is a different path, not a
          // suffix of one, so it cannot answer to this.
          isActive={pathname.endsWith('/settings')}
          to="/campaigns/$campaignId/settings"
          params={{ campaignId }}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <AppSidebarButtonMenu
        icon={<PaletteIcon weight="regular" className="size-5 flex-none" />}
        text={t('nav.foundation')}
        isActive={pathname.startsWith('/foundation')}
        to="/foundation"
      />
      {activityEnabled && (
        <ActivitySidebarItem isActive={pathname.startsWith('/activity')} />
      )}
      <AppSidebarButtonMenu
        icon={gear}
        text={t('nav.workspaceSettings')}
        isActive={pathname.startsWith('/workspace-settings')}
        to="/workspace-settings"
      />
    </div>
  )
}
