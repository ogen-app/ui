/**
 * The quiet line a thread draws where the screen changed between turns —
 * centred between two hairlines, in the timeline's type, so it reads as a
 * place in the conversation rather than as something said.
 */
export function ScreenMarker({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-tertiary-foreground">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="shrink-0">{text}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  )
}
