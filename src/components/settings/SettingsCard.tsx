import type { ReactNode } from 'react'

/**
 * A self-contained settings section card: the section heading lives inside
 * the card, so it reads as one solid block rather than a floating title over
 * a detached panel. Shared by Workspace Settings and Campaign Settings.
 * Capped at the shared content-column width (same as the post editor) and
 * centered.
 */
export function SettingsCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="w-full max-w-content mx-auto bg-primary px-6 py-5 flex flex-col gap-4 min-w-0">
      {title && <h2 className="text-xl font-display font-medium tracking-tight">{title}</h2>}
      {children}
    </section>
  )
}
