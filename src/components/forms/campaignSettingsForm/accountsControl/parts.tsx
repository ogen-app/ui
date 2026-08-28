import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * The heading over a group of rows — ACTIVE, INACTIVE, and the offered
 * accounts inside a placeholder. Literal caps, matching every other group
 * label in the app.
 */
export function GroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('mb-1 text-xs font-medium text-tertiary-foreground', className)}>
      {children}
    </p>
  )
}
