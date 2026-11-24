import type { ReactNode } from 'react'
import { cn } from '@/lib'
import { SmallHeading } from '@/components/page-primitives/SmallHeading'

/**
 * The heading over a group of rows — Active, Inactive, and the offered
 * accounts inside a placeholder: the app's one small heading.
 */
export function GroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <SmallHeading as="p" className={cn('mb-1', className)}>
      {children}
    </SmallHeading>
  )
}
