import type { ReactNode } from 'react'

import { cn } from '@/lib'

/**
 * A self-contained settings section card: the section heading lives inside
 * the card, so it reads as one solid block rather than a floating title over
 * a detached panel. Shared by Workspace Settings and Campaign Settings.
 * Capped at the shared content-column width (same as the post editor) and
 * set against the column's left edge, under the header's title — the app has
 * no centred columns.
 */
export function SettingsCard({
  title,
  actions,
  children,
  className,
}: {
  /** A node rather than a string, so a heading can carry an icon with it. */
  title?: ReactNode
  /** Sits opposite the heading — for a card whose whole content is one control. */
  actions?: ReactNode
  children?: ReactNode
  /** For trimming the padding on a card that is a single row rather than a form. */
  className?: string
}) {
  return (
    <section
      // A titled card is something the bar over a document can name while it
      // is being read ("Strategy › Voice", `PageHeader`'s `scrollAway`).
      data-crumb={title ? '' : undefined}
      className={cn(
        'w-full max-w-content bg-primary px-6 py-6 flex flex-col gap-5 min-w-0',
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 min-w-0">
          {title && (
            <h2 className="flex items-center gap-2 min-w-0 text-xl font-display font-medium tracking-tight">
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
