import type { ReactNode } from 'react'
import { cn } from '@/lib'

/**
 * The look of every small heading: Grotesk, 12/16, medium, tertiary grey, in
 * capitals. The class adds the capitals, so the copy stays in sentence case.
 */
export const SMALL_HEADING =
  'font-grotesk text-xs/4 font-medium uppercase text-tertiary-foreground'

/**
 * The heading over a group of rows, over a section inside a card or a panel,
 * or over a group of choices in a menu. Every one of them looks the same.
 *
 * An assistant card's status word (`ResultBlock`) and a table's column heads
 * are not small headings and keep their own look. A heading that names a
 * card is the card's title.
 */
export function SmallHeading({
  as: Tag = 'h3',
  className,
  children,
  htmlFor,
}: {
  as?: 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div' | 'legend' | 'label'
  className?: string
  children: ReactNode
  /** Only when `as="label"`. */
  htmlFor?: string
}) {
  return (
    <Tag
      className={cn(SMALL_HEADING, className)}
      {...(Tag === 'label' ? { htmlFor } : {})}
    >
      {children}
    </Tag>
  )
}
