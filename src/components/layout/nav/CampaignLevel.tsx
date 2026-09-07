import { useLocation, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { usePostsPlace } from '@/hooks/usePostsPlace'
import { cn } from '@/lib'
import { formatDate } from '@/lib/intl'
import { postsPlaceLink } from '@/lib/postsPlace'
import {
  CAMPAIGN_SECTIONS,
  type CampaignSectionId,
} from '@/lib/campaignSections'
import type { Campaign } from '@/types/campaigns'

/**
 * Where each section goes, less Posts, which needs a date in its path and is
 * built beside it.
 *
 * `satisfies` is what makes this worth writing out: every value is checked
 * against the router's own union, so a route that moves takes this table down
 * with it at compile time instead of on the click.
 */
const SECTION_PATH = {
  overview: '/campaigns/$campaignId/overview',
  analytics: '/campaigns/$campaignId/analytics',
  strategy: '/campaigns/$campaignId/strategy',
  content: '/campaigns/$campaignId/content',
  settings: '/campaigns/$campaignId/settings',
} satisfies Record<Exclude<CampaignSectionId, 'posts'>, LinkProps['to']>

/**
 * Level 1 — one campaign, in the rail's whole width.
 *
 * These are the sections the rail drew before, at the same routes, less
 * Settings — which is a utility rather than a place, and sits in the footer
 * where the workspace's own gear sits at level 0. What changed for the rest is
 * that they are no longer nested under a module row of the same name: the
 * campaign has the level to itself, so "Analytics" here can only mean this
 * campaign's, and the indent that used to carry that meaning is gone along
 * with the ambiguity it was patching.
 *
 * The block at the top is the argument for the level existing at all. A
 * campaign is a commitment — a window and a rate — and that is true of the
 * campaign and of nothing else in the app; every section below is read against
 * it. Which is also why it is stated in the rail rather than on one of the
 * sections, where five of the six would be reading it second-hand.
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
  const place = usePostsPlace(campaignId)

  // Everything unrecognised is the calendar, which is what Posts opens — so
  // each real section has to be named before that fallback is reached.
  const activeSection: CampaignSectionId = pathname.includes('/overview')
    ? 'overview'
    : pathname.includes('/analytics')
      ? 'analytics'
      : pathname.includes('/strategy')
        ? 'strategy'
        : pathname.includes('/content')
          ? 'content'
          : pathname.includes('/settings')
            ? 'settings'
            : 'posts'

  // Posts lands wherever the user last left this campaign's posts — the week
  // or month they had navigated to, or the table. The row is labelled Posts,
  // not Calendar, so it restores the arrangement as well as the date; the
  // entry points that name the calendar restore only the date. See
  // `lib/postsPlace`.
  const sectionLink = (
    id: CampaignSectionId,
  ): { to: LinkProps['to']; params: LinkProps['params'] } =>
    id === 'posts'
      ? postsPlaceLink(campaignId, place)
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
        {/* Every section but Settings, which is in the footer with the
            workspace's own gear — see `NavUtilityStrip`. Filtered here rather
            than removed from the table, because the Overview still draws a
            card for it and a section is one entry wherever it appears. */}
        {CAMPAIGN_SECTIONS.filter((section) => section.id !== 'settings').map(
          (section) => {
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
