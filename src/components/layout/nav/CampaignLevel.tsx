import { useLocation, type LinkProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { NavIcon } from '@/components/layout/nav/NavIcon'
import { AppSidebarButtonMenu } from '@/components/layout/AppSiderButton'
import { useCalendarPlace } from '@/hooks/usePostsPlace'
import {
  CAMPAIGN_SECTIONS,
  CAMPAIGN_SECTION_PATH,
  campaignSectionOf,
  type CampaignSectionId,
} from '@/lib/campaignSections'

/**
 * Level 1 — one campaign, in the rail's whole width.
 *
 * **The same rail as the workspace's, narrowed.** Every row here answers to a
 * row up there: Overview to Inbox, Ideas to Ideas, Assets to Assets, Posts to
 * Campaigns, Calendar to Calendar, Analytics to Analytics — and the footer's
 * two to the workspace's (`NavUtilityStrip`). Nothing at this level points out
 * of the campaign but its first row, and that is the change: the rail used to carry the
 * workspace's own Foundation and Activity into a campaign, so the level was
 * never quite the campaign's and a row could take you somewhere the campaign
 * wasn't. Going in narrows the same menu now, and coming out is the back row, the
 * switcher's "All campaigns" or the account menu — each of them saying where
 * it goes.
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
 * **Which campaign is the top bar's to say**, not this level's: its switcher
 * names the campaign and its window above the page, where it is also the way
 * to the next one. What the level keeps is the way out, as its first row — a
 * row and not a header control, so it is labelled in words, sits where the eye
 * starts down the list, and collapses to a glyph like every other row.
 */
export function CampaignLevel({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  // The calendar's own remembered position, not the posts' — this row names
  // the calendar, so it opens one whatever arrangement the user last chose.
  const calendar = useCalendarPlace(campaignId)

  // The editors (`/posts/:id`, `/assets/:id`) answer to the section they were
  // opened from; anything unrecognised falls back to Posts, the level's work.
  const activeSection = campaignSectionOf(pathname) ?? 'posts'

  const sectionLink = (
    id: CampaignSectionId,
  ): { to: LinkProps['to']; params: LinkProps['params'] } =>
    id === 'calendar'
      ? {
          to: '/campaigns/$campaignId/calendar/$anchor/$view',
          params: { campaignId, anchor: calendar.anchor, view: calendar.view },
        }
      : { to: CAMPAIGN_SECTION_PATH[id], params: { campaignId } }

  return (
    // The identity rule that runs beside this level is drawn by `AppSidebar`,
    // not here: it has to span the footer too, and nothing inside a pane can
    // reach it.
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2">
      <AppSidebarButtonMenu
        icon={<NavIcon icon={ArrowLeft01Icon} />}
        text={t('nav.backToCampaigns')}
        isActive={false}
        to="/campaigns"
        className="text-tertiary-foreground"
      />
      <div aria-hidden className="mx-1 my-1.5 h-px shrink-0 bg-border" />
      {/* The level's own rows. The utilities are filtered out by their own
          field rather than by name here — they are drawn in the footer by
          `NavUtilityStrip`, and a section is one entry wherever it appears. */}
      {CAMPAIGN_SECTIONS.filter((section) => !section.utility).map(
        (section) => {
          const link = sectionLink(section.id)
          return (
            <AppSidebarButtonMenu
              key={section.id}
              icon={
                // The same glyph every row uses, at both levels, in the
                // section's permanent hue — see `lib/campaignSections`.
                <NavIcon icon={section.icon} tone={section.tone} />
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
  )
}
