import { Button } from '@/components/ui/button'
import type { PostStatusAction } from '@/hooks/usePostStatusActions'
import type { PostStatusBlocker } from '@/lib/postStatusMachine'

type Props = {
  /** The one forward move for the current status; null in terminal states. */
  action: PostStatusAction | null
  /** A transition or a cancellation is in flight. */
  pending: boolean
  /**
   * Called instead of running the action when blockers stand in the way.
   * The button stays clickable on purpose: pointing at the fields that need
   * filling in beats a tooltip explaining a dead control.
   */
  onBlocked?: (blockers: PostStatusBlocker[]) => void
}

/**
 * The header's single status button. Everything else — moving backwards,
 * alternate outcomes — lives on the status badge in the quick-settings bar,
 * so the header never grows a second ⋮ next to its own overflow menu.
 *
 * No tooltip here by design. When the post isn't ready the button stays live
 * and a click hands the blockers to `onBlocked`, which flashes the bar
 * holding the offending fields — the answer to "why can't I click this?" is
 * shown where the fix is, not in a hover bubble.
 */
export function PostStatusHeaderActions({ action, pending, onBlocked }: Props) {
  if (!action) return null
  const blocked = action.blockers.length > 0
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      // Only in-flight work disables the button; blockers are handled on click.
      disabled={pending}
      loading={pending}
      aria-disabled={blocked || undefined}
      onClick={() => {
        if (blocked) {
          onBlocked?.(action.blockers)
          return
        }
        void action.run()
      }}
    >
      {action.buttonLabel}
    </Button>
  )
}
