import type { ReactNode } from 'react'

/**
 * The one call-to-action shape on the Campaign Overview: why the step matters,
 * then what is missing, then the actions.
 *
 * Deliberately unstyled — same surface, same type as every other card body.
 * A module the user still has to act on says so in its header status; the body
 * doesn't have to shout it as well.
 */
export function CallToAction({
  headline,
  support,
  children,
}: {
  /** Line one: why this matters. */
  headline: ReactNode
  /** Line two: what is missing right now. */
  support?: ReactNode
  /** The buttons. */
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-secondary-foreground">{headline}</p>
        {support && (
          <p className="text-sm text-tertiary-foreground">{support}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
