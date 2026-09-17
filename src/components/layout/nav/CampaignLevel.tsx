import { useLocation, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { useCalendarPlace } from '@/hooks/usePostsPlace'
import { useFeatureFlag } from '@/config/featureFlags'
import { cn } from '@/lib'
import { formatDate } from '@/lib/intl'
import {
  CAMPAIGN_SECTIONS,
  type CampaignSectionId,
} from '@/lib/campaignSections'
import type { Campaign } from '@/types/campaigns'

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
  posts: '/campaigns/$campaignId/list',
  analytics: '/campaigns/$campaignId/analytics',
  foundation: '/campaigns/$campaignId/foundation',
  activity: '/campaigns/$campaignId/activity',
  settings: '/campaigns/$campaignId/settings',
} satisfies Record<Exclude<CampaignSectionId, 'calendar'>, LinkProps['to']>

/**
 * Level 1 — one campaign, in the rail's whole width.
 *
 * **The same rail as the workspace's, narrowed.** Every row here answers to a
 * row up there: Overview to Inbox, Ideas to Ideas, Posts to Campaigns,
 * Calendar to Calendar, Analytics to Analytics — and the footer's three to the
 * workspace's three (`NavUtilityStrip`). Nothing at this level points out of
 * the campaign, and that is the change: the rail used to carry the workspace's
 * own Foundation and Activity into a campaign, so the level was never quite
 * the campaign's and a row could take you somewhere the campaign wasn't. Going
 * in narrows the same menu now, and coming out is the caret, the mark or the
 * account menu — three deliberate ways, none of them a row you might take by
 * accident.
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
export function CampaignLevel({
  campaignId,
  campaign,
}: {
  campaignId: string
  campaign: Campaign | undefined
}) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // The calendar's own remembered position, not the posts' — this row names
  // the calendar, so it opens one whatever arrangement the user last chose.
  const calendar = useCalendarPlace(campaignId)
  const ideasEnabled = useFeatureFlag('ideas')

  // `/list` is the Posts row's route and carries no word of its own that the
  // others don't, so it is the fallback rather than a case of its own.
  const activeSection: CampaignSectionId = pathname.includes('/overview')
    ? 'overview'
    : pathname.includes('/strategy')
      ? 'strategy'
      : pathname.includes('/ideas')
        ? 'ideas'
        : pathname.includes('/calendar')
          ? 'calendar'
          : pathname.includes('/analytics')
            ? 'analytics'
            : pathname.includes('/foundation')
              ? 'foundation'
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
      {/* The one thing in the rail that cannot exist at 88px, so it is the one
          thing whose height changes with the collapse — and it is animated
          rather than switched off, on the same 200ms linear curve the rail's
          own width runs on. `hidden` here removed the block on the first frame
          and dropped every section 46px while the rail was still narrowing:
          two motions, one of them instant, where the eye expects the panel to
          close as one object. The rows now ride up with the width.

          `grid-rows-[1fr]` to `[0fr]` is what makes a height animation
          possible without hard-coding one — the block's natural height is
          whatever the campaign's name wraps to, and `max-height` guesses at
          it. The padding goes with it, or 16px of it stays behind. */}
      <div
        className={cn(
          'grid shrink-0 grid-rows-[1fr] px-3 pb-4 lg:px-6',
          'transition-[grid-template-rows,padding-bottom,opacity] duration-200 ease-linear',
          'group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:pb-0 group-data-[collapsible=icon]:opacity-0',
        )}
      >
        <div className="overflow-hidden">
          {campaign ? (
            <>
              <span className="block w-[212px] truncate font-grotesk text-sm font-medium uppercase tracking-[0.02em] lg:w-[180px]">
                {campaign.name.trim() || t('nav.untitledCampaign')}
              </span>
              <p className="mt-1.5 font-mono text-xs text-tertiary-foreground">
                {campaignWindow(campaign) ?? t('nav.campaignNoWindow')}
              </p>
            </>
          ) : (
            <SidebarMenuSkeleton />
          )}
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 lg:px-6 group-data-[collapsible=icon]:items-center">
        {/* The level's own rows. The utilities are filtered out by their own
            field rather than by name here — they are drawn in the footer by
            `NavUtilityStrip`, and a section is one entry wherever it appears. */}
        {CAMPAIGN_SECTIONS.filter((section) => !section.utility).map(
          (section) => {
            // Gated here as well as on the route: with the flag off the
            // campaign must have no Ideas at all, and a row that redirects is
            // worse than no row.
            if (section.id === 'ideas' && !ideasEnabled) return null
            const link = sectionLink(section.id)
            return (
              <AppSidebarButtonMenu
                key={section.id}
                icon={
                  // The same 20px slot every row uses, so the labels line up;
                  // only the glyph inside is smaller. `tone` is the section's
                  // permanent hue — see `lib/campaignSections`.
                  <span
                    className="flex size-5 flex-none items-center justify-center"
                    style={{ color: section.tone }}
                  >
                    <section.icon className="size-4" />
                  </span>
                }
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

/**
 * The window, as the one line the rail has room for.
 *
 * Null when the campaign has no dates rather than half a range: "Sep 1 – " is
 * worse than saying there is no window, and an undated campaign is a real and
 * common state (the goal still counts, once — see `lib/postGoal`).
 */
function campaignWindow(campaign: Campaign): string | null {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = formatDate(campaign.start_date, options)
  const end = formatDate(campaign.end_date, options)
  return start && end ? `${start} – ${end}` : null
}
