import { useLocation, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { SidebarMenuSkeleton } from '@/components/ui/sidebar'
import { usePostsPlace } from '@/hooks/usePostsPlace'
import { formatDate } from '@/lib/intl'
import { identityColorVar } from '@/lib/identity'
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
  brief: '/campaigns/$campaignId/brief',
  content: '/campaigns/$campaignId/content',
  settings: '/campaigns/$campaignId/settings',
} satisfies Record<Exclude<CampaignSectionId, 'posts'>, LinkProps['to']>

/**
 * Level 1 — one campaign, in the rail's whole width.
 *
 * These are the same six sections the rail drew before, at the same routes.
 * What changed is that they are no longer nested under a module row of the
 * same name: the campaign has the level to itself, so "Analytics" here can
 * only mean this campaign's, and the indent that used to carry that meaning is
 * gone along with the ambiguity it was patching.
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
      : pathname.includes('/brief')
        ? 'brief'
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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* The campaign's identity colour as a rule down the level, in the hue
          its mark already wears. Static: it belongs to the level the way the
          level's rows do, and a bar that draws itself on arrival would turn a
          property of the place into an event that happened — one more thing
          moving during the only moment the user is working out where they
          landed. */}
      <span
        aria-hidden
        style={{ background: identityColorVar(campaignId) }}
        className="absolute left-0 top-0 h-full w-[3px] group-data-[collapsible=icon]:hidden"
      />

      <div className="shrink-0 px-3 pb-4 lg:px-6 group-data-[collapsible=icon]:hidden">
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

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4 lg:px-6 group-data-[collapsible=icon]:items-center">
        {CAMPAIGN_SECTIONS.map((section) => {
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
        })}
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
