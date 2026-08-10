import { ClockIcon } from '@phosphor-icons/react'

/**
 * What is going to happen to this post, on the bottom bar beside the actions
 * (CON-195). The sentence comes from `usePublishStatus`.
 *
 * Deliberately not a control. Everything it names is editable one card up in
 * the quick-settings bar (the date, the time, the account and its picker), and
 * a second affordance for the same fields would only raise the question of
 * which one is authoritative. This says what is *going to happen*; the bar
 * above is where it gets changed.
 *
 * Renders the message it is given and nothing else — deciding there is no
 * message is the caller's job, because a component that returns `null` still
 * occupies a slot in the bar and would earn a divider of its own.
 */
export function PostPublishStatus({ message }: { message: string }) {
  return (
    // `role="status"` without a live region: the phrase changes on a timer, and
    // announcing "in 3 hours … in 2 hours" through the afternoon would be
    // noise. A reader picks it up when they reach the bar.
    <span
      role="status"
      // Bounded so the bar keeps its shape: it sizes to its content, and an
      // account named at length would otherwise stretch it across the column.
      // The cap is also what gives `truncate` something to truncate against.
      className="flex min-w-0 max-w-[30rem] items-center gap-1.5 px-1 text-xs text-tertiary-foreground"
    >
      <ClockIcon className="size-4 shrink-0" />
      <span className="truncate">{message}</span>
    </span>
  )
}
