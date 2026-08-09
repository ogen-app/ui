import type { ReactNode } from 'react'
import {
  ArrowUUpLeftIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PageActionBar } from '@/components/page-primitives/PageActionBar'
import type { PostStatusAction } from '@/hooks/usePostStatusActions'
import type { PostStatusBlocker } from '@/lib/postStatusMachine'
import { cn } from '@/lib'

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
 * The post's status controls, on the floating bottom bar: the step back on the
 * left, the one forward move at full strength on the right.
 *
 * They used to sit in the header, sharing the top-right corner with four view
 * toggles, an overflow menu and the save cloud — nine controls at one weight,
 * where advancing a post's lifecycle looked exactly like opening a panel.
 * Moving them down separates the two kinds: the top of the screen switches
 * views, the bottom commits.
 *
 * The bar renders nothing in terminal states (`published` has no outgoing user
 * edge), which is exactly why the save indicator does *not* live in it — a
 * published post is still editable, and its save state has to outlive the bar.
 */
export function PostStatusActionBar({ buttons, back, pending, onBlocked }: Props) {
  if (!back && buttons.length === 0) return null

  // Primary last — `usePostStatusActions` orders `buttons` so the most
  // prominent move ends the row, and the bar reads left-to-right into it.
  const primary: PostStatusAction | undefined = buttons[buttons.length - 1]
  const actions = back ? [back, ...buttons] : buttons

  return (
    <PageActionBar blocker={primary?.blockers[0]?.message}>
      {actions.map((action) => (
        <ActionButton
          key={action.next}
          action={action}
          isPrimary={action === primary}
          pending={pending}
          onBlocked={onBlocked}
        />
      ))}
    </PageActionBar>
  )
}

/**
 * No tooltip and no disabled state for blockers by design. When the post isn't
 * ready the button stays live and a click hands the blockers to `onBlocked`,
 * which flashes the quick-settings fields that are missing — the bar says
 * *what* is wrong, the flash says *where*.
 */
function ActionButton({
  action,
  isPrimary,
  pending,
  onBlocked,
}: {
  action: PostStatusAction
  isPrimary: boolean
  pending: boolean
  onBlocked?: (blockers: PostStatusBlocker[]) => void
}) {
  const destructive = action.intent === 'destructive'
  return (
    <Button
      type="button"
      // Every button on the bar is `ghost` — no fill and no border. The bar is
      // already a surface floating over the page; drawing a slab or a box
      // inside it makes a control that is permanently on screen shout. Weight
      // alone carries the hierarchy: the forward move is full-strength text,
      // the step back beside it is dimmed.
      variant="ghost"
      size="sm"
      className={cn(
        destructive && 'text-destructive hover:text-destructive',
        !destructive && (isPrimary ? 'text-primary-foreground' : 'text-tertiary-foreground')
      )}
      // Only in-flight work disables the button; blockers are handled on click.
      disabled={pending}
      // One spinner, on the move that is actually running — the step back
      // beside it is disabled, which already says enough.
      loading={pending && isPrimary}
      aria-disabled={action.blockers.length > 0 || undefined}
      onClick={() => runOrReport(action, onBlocked)}
    >
      {iconFor(action)}
      <span>{action.buttonLabel}</span>
    </Button>
  )
}

/**
 * An icon per edge, keyed off where the action lands rather than off its
 * label, so a copy change can't silently drop one. Mechanism wins over
 * destination: cancelling a schedule and scheduling both end at a date, and
 * only the direction tells them apart.
 */
function iconFor(action: PostStatusAction): ReactNode {
  if (action.mechanism === 'cancel') return <CalendarXIcon />
  if (action.mechanism === 'schedule') return <CalendarPlusIcon />
  if (action.reverse) return <ArrowUUpLeftIcon />
  switch (action.next) {
    case 'scheduled':
    case 'scheduled_for_manual_publishing':
      return <CalendarPlusIcon />
    case 'published':
      return <CheckCircleIcon />
    case 'ready_for_publish':
      return <PaperPlaneTiltIcon />
    case 'not_published':
    case 'failed':
      return <XCircleIcon />
    case 'draft':
      return <ArrowUUpLeftIcon />
  }
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
