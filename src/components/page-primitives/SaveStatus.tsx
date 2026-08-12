import { CloudIcon } from '@phosphor-icons/react'

/**
 * The one autosave indicator, for the top-centre of a header.
 *
 * Renders **only while a save is in flight**. "Saved" is the resting state of
 * every autosaving screen, so saying it permanently is a label, not news — it
 * would sit there all day and stop being read long before the one moment it
 * matters. The absence of this glyph is what "saved" looks like.
 *
 * There used to be three shapes for the same idea: a bare cloud in the post
 * editor's button row, and a pulsing dot inline beside the asset editor's
 * breadcrumb. Neither was clickable, and both sat in a row of things that
 * were. Centred, on its own, it reads as what it is — a report, not a control.
 *
 * Deliberately no tooltip: the label is already visible, and the header's
 * centre slot is `pointer-events-none` so a wide status never blocks a click
 * meant for the title or an action behind it.
 */
export function SaveStatus({ saving }: { saving: boolean }) {
  if (!saving) return null
  return (
    <span
      className="flex h-8 items-center gap-1.5 px-1 text-secondary-foreground"
      role="status"
      aria-label="Saving…"
    >
      <CloudIcon className="size-5 animate-pulse-opacity" />
      <span className="text-xs text-tertiary-foreground">Saving…</span>
    </span>
  )
}
