import type { ReactNode } from 'react'

/**
 * One labelled block of the Insights tab — "Summary", "Key points". Sentence
 * case in the readable grey (CON-369): no all-caps labels on the page.
 */
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-secondary-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}
