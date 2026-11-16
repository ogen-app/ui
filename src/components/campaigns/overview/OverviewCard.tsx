import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button.tsx'
import { useCalendarPlace } from '@/hooks/usePostsPlace'
import { cn } from '@/lib'
import {
  campaignSection,
  type CampaignSectionId,
} from '@/lib/campaignSections.ts'
import type { FixTarget } from '@/lib/campaignReadiness.ts'

/**
 * Where a card sends the user. `calendar` is the one destination the fix rules
 * don't have a name for: an attention row about a post opens the list it can be
 * fixed in, while the Content card opens the week the posts live in.
 */
export type CardTarget = FixTarget | 'calendar'

/** Where a card's "open" button goes. */
export type CardLink = {
  target: CardTarget
  campaignId: string
}

/**
 * One card on the Campaign Overview, and on the campaign's Analytics panel.
 * Capped at the shared content-column width and centred — on the Overview it
 * sits in a column narrower than that, so the cap only bites on Analytics.
 *
 * A card that has somewhere to go says so with a button, not with a header that
 * lights up: a tinted header row is a hit area you have to discover by sweeping
 * the card. One rule across the screen — a header is never a control.
 */
export function OverviewCard({
  section,
  title,
  icon,
  status,
  link,
  children,
  className,
}: {
  /** Sets the card's title, glyph and open-button label from one table. */
  section?: CampaignSectionId
  /** For a card that isn't one of the campaign's sections. */
  title?: string
  /** Ditto — the mark beside such a card's title. */
  icon?: ReactNode
  /**
   * Sits in the header beside the title — normally a `StatusBadge`. A module's
   * verdict belongs here whether it's good news or not, so the body is free to
   * be about what to do next.
   */
  status?: ReactNode
  /** Adds the open button. Needs `section`, which is where its label comes from. */
  link?: CardLink
  children?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const meta = section ? campaignSection(section) : undefined
  const Glyph = meta?.icon
  const heading = title ?? (meta ? t(meta.labelKey) : undefined)

  return (
    <section
      className={cn(
        'w-full max-w-content mx-auto rounded-md bg-primary p-5 flex flex-col gap-4 min-w-0',
        className,
      )}
    >
      {(heading || status || link) && (
        <div className="flex items-center gap-3 min-w-0">
          <CardGlyph>
            {Glyph ? (
              <HugeiconsIcon
                icon={Glyph}
                size={20}
                strokeWidth={1.5}
                style={{ color: meta?.tone }}
                aria-hidden
              />
            ) : (
              icon
            )}
          </CardGlyph>
          {heading && (
            <h2 className="font-display text-base font-medium shrink-0">
              {heading}
            </h2>
          )}
          {status}
          {link && meta && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              asChild
            >
              <SectionLink target={link.target} campaignId={link.campaignId}>
                {t(meta.openKey)}
              </SectionLink>
            </Button>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

/**
 * The header's mark slot: 16px of layout, whatever is standing in it.
 *
 * The same 16px the rows below reserve (`LineItem`), so a card's title starts
 * on the column its list items start on and the screen has one left edge for
 * text rather than one per card type. The glyph itself keeps its own size and
 * is centred on the slot — a mark drawn to 16px reads smaller than the title
 * beside it, and shrinking it to make the arithmetic tidy would be optimising
 * the grid at the mark's expense. The 2px it spills each side is over the
 * card's padding on one side and the gap on the other, so nothing collides.
 */
function CardGlyph({ children }: { children?: ReactNode }) {
  return (
    <span className="flex w-4 shrink-0 items-center justify-center">
      {children}
    </span>
  )
}

/**
 * A typed link to the campaign section (or workspace settings) that fixes or
 * drills into whatever a module is showing. Branching per target keeps the
 * router's route-id typing intact.
 */
export function SectionLink({
  target,
  campaignId,
  className,
  label,
  children,
}: {
  target: CardTarget
  campaignId: string
  className?: string
  /** Accessible name, for a link whose contents are a whole card. */
  label?: string
  /** Optional: `LineItem asChild` injects the row's markup as children. */
  children?: ReactNode
}) {
  const params = { campaignId }
  const named = { 'aria-label': label }
  // Unconditional, as a hook has to be — the `calendar` case is the only branch
  // that reads it. The calendar's remembered date and granularity, not the
  // remembered *arrangement*: this card names the calendar, and the card beside
  // it (`posts`) is the one that means the table.
  const calendar = useCalendarPlace(campaignId)
  switch (target) {
    case 'strategy':
      return (
        <Link
          to="/campaigns/$campaignId/strategy"
          params={params}
          className={className}
          {...named}
        >
          {children}
        </Link>
      )
    case 'assets':
      return (
        <Link
          to="/campaigns/$campaignId/assets"
          params={params}
          className={className}
          {...named}
        >
          {children}
        </Link>
      )
    case 'posts':
      return (
        <Link
          to="/campaigns/$campaignId/list"
          params={params}
          className={className}
          {...named}
        >
          {children}
        </Link>
      )
    case 'calendar':
      return (
        <Link
          to="/campaigns/$campaignId/calendar/$anchor/$view"
          params={{ campaignId, ...calendar }}
          className={className}
          {...named}
        >
          {children}
        </Link>
      )
    case 'analytics':
      return (
        <Link
          to="/campaigns/$campaignId/analytics"
          params={params}
          className={className}
          {...named}
        >
          {children}
        </Link>
      )
    case 'workspace-settings':
      return (
        <Link to="/workspace-settings" className={className} {...named}>
          {children}
        </Link>
      )
  }
}
