import type { ReactNode } from 'react'

/**
 * One band of a document page: a small-caps heading, a sentence saying what
 * the band is when it needs one, and its cards.
 *
 * A page made of more than one kind of thing says so with these rather than
 * with a card of its own. Strategy is the case it was made for — the campaigns,
 * then the Foundation, at both levels — and the two levels drew the same split
 * three ways (a heading, an intro card, a band with a paragraph) until they
 * shared this. Cards inside a band sit 16px apart; bands sit 40px apart, set by
 * the page.
 */
export function PageSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex w-full max-w-content flex-col gap-1">
        <h2 className="font-grotesk text-xs font-medium uppercase text-tertiary-foreground">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-secondary-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}
