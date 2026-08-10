import { ClockIcon } from '@phosphor-icons/react'

/**
 * What is going to happen to this post, on the bottom bar beside the actions
 * (CON-195). The wording comes from `usePublishStatus`.
 *
 * Deliberately not a control. Everything it names is editable one card up in
 * the quick-settings bar (the date, the time, the account and its picker), and
 * a second affordance for the same fields would only raise the question of
 * which one is authoritative. This says what is *going to happen*; the bar
 * above is where it gets changed.
 *
 * Renders the text it is given and nothing else — deciding there is no text,
 * or that only the short form fits, belongs to the bar.
 */
export function PostPublishStatus({
  text,
  /**
   * The full sentence, when `text` is the short form. "2d" is unreadable on
   * its own to anyone who hasn't seen it expand, so the long form stays
   * reachable by hover and is what a screen reader is given.
   */
  title,
}: {
  text: string
  title?: string
}) {
  return (
    // `role="status"` without a live region: the phrase changes on a timer, and
    // announcing "in 3 hours … in 2 hours" through the afternoon would be
    // noise. A reader picks it up when they reach the bar.
    <span
      role="status"
      title={title}
      aria-label={title}
      className="flex min-w-0 items-center gap-1.5 px-1 text-xs text-tertiary-foreground"
    >
      <ClockIcon className="size-4 shrink-0" />
      <span className="truncate">{text}</span>
    </span>
  )
}
