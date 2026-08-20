import { cn } from '@/lib'
import type { ComponentProps } from 'react'

/**
 * What the placeholder is standing in for, which decides its fill.
 *
 * `ink` is a bar where a line of text or a control will land — it sits *on* a
 * surface that is already drawn, so it has to be darker than that surface to
 * read as anything at all.
 *
 * `surface` is a block where a whole card will land. It takes the card's own
 * fill, because the alternative is what this variant exists to stop: a grey
 * block replaced by a white card, which lightens the column at the exact moment
 * the page is supposed to settle. Only the pulse says it is a placeholder.
 */
type SkeletonVariant = 'ink' | 'surface'

const VARIANT: Record<SkeletonVariant, string> = {
  ink: 'bg-quinary',
  surface: 'bg-primary',
}

function Skeleton({
  className,
  variant = 'ink',
  ...props
}: ComponentProps<'div'> & { variant?: SkeletonVariant }) {
  return (
    <div
      data-slot="skeleton"
      className={cn(VARIANT[variant], 'animate-pulse rounded-md', className)}
      {...props}
    />
  )
}

export { Skeleton }
