import type { ReactNode } from 'react'

/** One labelled block of the Insights tab: "SUMMARY", "KEY POINTS", … */
export function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-tertiary-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}
