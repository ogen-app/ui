import type { ReactNode } from 'react'

import { cn } from '@/lib'

/**
 * A self-contained settings section card: the section heading lives inside
 * the card, so it reads as one solid block rather than a floating title over
 * a detached panel. Shared by Workspace Settings and Campaign Settings.
 * Capped at the shared content-column width (same as the post editor) and
 * centered.
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
      className={cn(
        'w-full max-w-content mx-auto bg-primary px-6 py-6 flex flex-col gap-5 min-w-0',
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
