import { useLocation, type LinkProps } from '@tanstack/react-router'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { useTranslation } from 'react-i18next'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useCalendarPlace } from '@/hooks/usePostsPlace'
import {
  CAMPAIGN_SECTIONS,
  type CampaignSectionId,
} from '@/lib/campaignSections'

/**
 * Where each section goes, less the calendar, which needs a date in its path
 * and is built beside it.
 *
 * `satisfies` is what makes this worth writing out: every value is checked
 * against the router's own union, so a route that moves takes this table down
 * with it at compile time instead of on the click.
 */
const SECTION_PATH = {
  overview: '/campaigns/$campaignId/overview',
  strategy: '/campaigns/$campaignId/strategy',
  ideas: '/campaigns/$campaignId/ideas',
  assets: '/campaigns/$campaignId/assets',
  posts: '/campaigns/$campaignId/list',
  analytics: '/campaigns/$campaignId/analytics',
  activity: '/campaigns/$campaignId/activity',
  settings: '/campaigns/$campaignId/settings',
} satisfies Record<Exclude<CampaignSectionId, 'calendar'>, LinkProps['to']>

/**
 * Level 1 — one campaign, in the rail's whole width.
 *
 * **The same rail as the workspace's, narrowed.** Every row here answers to a
 * row up there: Overview to Inbox, Ideas to Ideas, Assets to Assets, Posts to
 * Campaigns, Calendar to Calendar, Analytics to Analytics — and the footer's
 * two to the workspace's (`NavUtilityStrip`). Nothing at this level points out
 * of the campaign, and that is the change: the rail used to carry the
 * workspace's own Foundation and Activity into a campaign, so the level was
 * never quite the campaign's and a row could take you somewhere the campaign
 * wasn't. Going in narrows the same menu now, and coming out is the caret, the
 * mark or the account menu — three deliberate ways, none of them a row you
 * might take by accident.
 *
 * Foundation is the one workspace row with nothing down here, since the
 * campaign's documents became Assets: what a campaign has of the workspace's
 * brand material is a pointer, and pointers are chosen on Strategy.
 *
 * Strategy is the one row with no workspace twin, because a campaign commits
 * to a window, a rate and a spend and a workspace commits to nothing.
 *
 * Posts and Calendar are two rows over the same posts, which they were not
 * before: one row led to whichever arrangement you last used, so the calendar
 * and the table were a thing you had to know to switch between. The table is
 * where posts are worked on and the calendar is where they are placed — two
 * jobs, and now two ways in.
 *
 * The block at the top is the argument for the level existing at all. A
 * campaign is a commitment — a window and a rate — and that is true of the
 * campaign and of nothing else in the app; every section below is read against
 * it. Which is also why it is stated in the rail rather than on one of the
 * sections, where the others would be reading it second-hand.
 */
export function CampaignLevel({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // The calendar's own remembered position, not the posts' — this row names
  // the calendar, so it opens one whatever arrangement the user last chose.
  const calendar = useCalendarPlace(campaignId)

  // `/list` is the Posts row's route and carries no word of its own that the
  // others don't, so it is the fallback rather than a case of its own.
  const activeSection: CampaignSectionId = pathname.includes('/overview')
    ? 'overview'
    : pathname.includes('/strategy')
      ? 'strategy'
      : pathname.includes('/ideas')
        ? 'ideas'
        : pathname.includes('/assets')
          ? 'assets'
          : pathname.includes('/calendar')
            ? 'calendar'
            : pathname.includes('/analytics')
              ? 'analytics'
              : pathname.includes('/activity')
                ? 'activity'
                : pathname.includes('/settings')
                  ? 'settings'
                  : 'posts'

  const sectionLink = (
    id: CampaignSectionId,
  ): { to: LinkProps['to']; params: LinkProps['params'] } =>
    id === 'calendar'
      ? {
          to: '/campaigns/$campaignId/calendar/$anchor/$view',
          params: { campaignId, anchor: calendar.anchor, view: calendar.view },
        }
      : { to: SECTION_PATH[id], params: { campaignId } }

  return (
    // The identity rule that runs beside this level is drawn by `AppSidebar`,
    // not here: it has to span the header and the footer too, and nothing
    // inside a pane can reach them.
    <div className="flex flex-1 flex-col overflow-hidden">
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        {/* The level's own rows. The utilities are filtered out by their own
            field rather than by name here — they are drawn in the footer by
            `NavUtilityStrip`, and a section is one entry wherever it appears. */}
        {CAMPAIGN_SECTIONS.filter((section) => !section.utility).map(
          (section) => {
            const link = sectionLink(section.id)
            return (
              <AppSidebarButtonMenu
                key={section.id}
                // In ink, like the workspace's rows: the scope switches the
                // rows in place, and a recoloured menu reads as a different one.
                icon={<NavIcon icon={section.icon} />}
                text={t(section.labelKey)}
                isActive={activeSection === section.id}
                to={link.to}
                params={link.params}
              />
            )
          },
        )}
      </nav>
    </div>
  )
}
