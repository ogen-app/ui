import { ArrowUUpLeftIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PostStatusAction } from '@/hooks/usePostStatusActions'
import type { PostStatusBlocker } from '@/lib/postStatusMachine'

type Props = {
  /** Labelled moves, primary last. Empty in terminal states. */
  buttons: PostStatusAction[]
  /** The one step back, if the post can also still move forward. */
  back: PostStatusAction | null
  /** A transition or a cancellation is in flight. */
  pending: boolean
  /**
   * Called instead of running an action when blockers stand in the way.
   * Buttons stay clickable on purpose: pointing at the fields that need
   * filling in beats a tooltip explaining a dead control.
   */
  onBlocked?: (blockers: PostStatusBlocker[]) => void
}

/**
 * The header's status controls: the labelled moves, then an undo-style icon
 * for the step back. Reversing sits after the main button and is deliberately
 * quieter than advancing — it undoes rather than decides — and keeping it out
 * of a menu means the header never grows a second ⋮ beside its own overflow.
 */
export function PostStatusHeaderActions({ buttons, back, pending, onBlocked }: Props) {
  if (!back && buttons.length === 0) return null
  return (
    <>
      {buttons.map((action) => (
        <ActionButton
          key={action.next}
          action={action}
          pending={pending}
          onBlocked={onBlocked}
        />
      ))}
      {back && <BackButton action={back} pending={pending} onBlocked={onBlocked} />}
    </>
  )
}

/**
 * No tooltip on the labelled buttons by design. When the post isn't ready
 * the button stays live and a click hands the blockers to `onBlocked`,
 * which flashes the quick-settings bar holding the offending fields — the
 * answer to "why can't I click this?" is shown where the fix is.
 */
function ActionButton({
  action,
  pending,
  onBlocked,
}: {
  action: PostStatusAction
  pending: boolean
  onBlocked?: (blockers: PostStatusBlocker[]) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={action.intent === 'destructive' ? 'text-destructive' : undefined}
      // Only in-flight work disables the button; blockers are handled on click.
      disabled={pending}
      loading={pending}
      aria-disabled={action.blockers.length > 0 || undefined}
      onClick={() => runOrReport(action, onBlocked)}
    >
      {action.buttonLabel}
    </Button>
  )
}

/** Icon-only, so the tooltip carries the label — there's no visible text. */
function BackButton({
  action,
  pending,
  onBlocked,
}: {
  action: PostStatusAction
  pending: boolean
  onBlocked?: (blockers: PostStatusBlocker[]) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="smIcon"
          disabled={pending}
          aria-label={action.menuLabel}
          onClick={() => runOrReport(action, onBlocked)}
        >
          <ArrowUUpLeftIcon weight="regular" className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{action.menuLabel}</TooltipContent>
    </Tooltip>
  )
}

function runOrReport(
  action: PostStatusAction,
  onBlocked?: (blockers: PostStatusBlocker[]) => void,
) {
  if (action.blockers.length > 0) {
    onBlocked?.(action.blockers)
    return
  }
  void action.run()
}
