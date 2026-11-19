import type { ReactNode } from 'react'
import { Link, linkOptions, useRouter } from '@tanstack/react-router'
import type { CardDoor } from '@/components/ui/card'
import { useCalendarPlace } from '@/hooks/usePostsPlace'
import type { FixTarget } from '@/lib/campaignReadiness.ts'

/**
 * Where a row or a card's door sends the user. `calendar` is the one
 * destination the fix rules don't have a name for: an attention row about a
 * post opens the list it can be fixed in, while the week card opens the week
 * the posts live in.
 */
export type CardTarget = FixTarget | 'calendar'

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

/**
 * `SectionLink` as a `Card` door: the href, so the door is a real link that
 * opens in a new tab, and a navigate for the plain click.
 */
export function useSectionDoor(campaignId: string) {
  const router = useRouter()
  const calendar = useCalendarPlace(campaignId)
  const params = { campaignId }
  return (target: CardTarget, kind: CardDoor['kind'] = 'header'): CardDoor => {
    const options = (() => {
      switch (target) {
        case 'strategy':
          return linkOptions({ to: '/campaigns/$campaignId/strategy', params })
        case 'assets':
          return linkOptions({ to: '/campaigns/$campaignId/assets', params })
        case 'posts':
          return linkOptions({ to: '/campaigns/$campaignId/list', params })
        case 'calendar':
          return linkOptions({
            to: '/campaigns/$campaignId/calendar/$anchor/$view',
            params: { campaignId, ...calendar },
          })
        case 'analytics':
          return linkOptions({ to: '/campaigns/$campaignId/analytics', params })
        case 'workspace-settings':
          return linkOptions({ to: '/workspace-settings' })
      }
    })()
    return {
      kind,
      href: router.buildLocation(options).href,
      onOpen: () => void router.navigate(options),
    }
  }
}
