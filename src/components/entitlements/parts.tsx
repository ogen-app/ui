import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatDate, formatRelative } from '@/lib/intl'
import { cn } from '@/lib'

/**
 * The pieces the tier renderings share.
 *
 * The point of a shared vocabulary here is that the *choice* of how to answer a
 * denial stays local — a picker hides, a section locks, a click sells — while
 * the answers themselves come out looking like one app. Five screens inventing
 * five different locks is the failure this exists to prevent.
 */

/**
 * A date, in the language the app is set to.
 *
 * Through `lib/intl` rather than a formatter of its own: the language is a
 * choice the user makes in Workspace Settings, not a property of their browser,
 * and the helper caches one formatter per (locale, options) pair so nothing has
 * to be hoisted to module scope — where it would freeze whichever language
 * loaded first. The locale is threaded in from the caller's `useTranslation`,
 * because that is also what re-renders it on a switch.
 *
 * Falls back to the raw string on an unparseable date. These are server
 * timestamps, so that should not happen — but a billing date is the wrong place
 * to render "Invalid Date".
 */
export function formatDay(iso: string, locale: string): string {
  return formatDate(iso, { day: 'numeric', month: 'long', year: 'numeric' }, locale) ?? iso
}

/**
 * "in 29 days", "tomorrow", "today" — the distance to a billing date, in the
 * language the app is set to.
 *
 * `Intl.RelativeTimeFormat` with `numeric: 'auto'` rather than a count in the
 * catalogue: it already knows every language's plural rules *and* its own words
 * for the near days, so the catalogue carries only the sentence around this.
 * Same pattern as `usePublishStatus`.
 *
 * Counted between local midnights, so the answer matches the calendar the
 * reader is looking at: a renewal at 01:00 tomorrow is "tomorrow" and not "in
 * 0 days". Null on a date that won't parse, which is the caller's signal to say
 * the same thing without the phrase — never to print a distance it guessed.
 */
export function relativeDay(iso: string, locale: string, now: Date = new Date()): string | null {
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const midnight = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((midnight(target) - midnight(now)) / 86_400_000)
  return formatRelative(days, 'day', locale)
}

type NoticeShellProps = {
  icon: ReactNode
  title: string
  children?: ReactNode
  /**
   * The action, rendered only when there is somewhere for it to go.
   *
   * Optional on purpose: there is no billing screen yet, and a button that
   * explains a limit and then does nothing about it is worse than no button —
   * it turns an explanation into a dead end. Call sites pass this once
   * upgrading is a thing a user can actually do.
   */
  action?: { label: string; onClick: () => void }
  className?: string
}

/** The box both notices are built from — a locked one and a suspended one. */
export function NoticeShell({
  icon,
  title,
  children,
  action,
  className,
}: NoticeShellProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-md bg-secondary px-4 py-3',
        className,
      )}
    >
      <span className="mt-0.5 shrink-0 text-tertiary-foreground" aria-hidden>
        {icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        {/* Capped for readability, like the Explainer: this is a block meant to
            be read rather than scanned, and it can sit in a full-width panel. */}
        {children && (
          <div className="max-w-150 text-[13px] leading-normal text-tertiary-foreground">
            {children}
          </div>
        )}
      </div>
      {action && (
        <Button
          variant="default"
          size="default"
          className="ml-auto shrink-0"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
