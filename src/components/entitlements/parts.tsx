import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
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
 * Built per call rather than hoisted: a module-level `Intl.DateTimeFormat`
 * freezes whichever language happened to load first, and the language is a
 * choice the user makes in Workspace Settings rather than a property of their
 * browser — so `undefined` as the locale would be the same bug spelled
 * differently.
 */
export function formatDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(
    new Date(iso),
  )
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
