import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUUpLeftIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CheckCircleIcon,
  CopyIcon,
  PaperPlaneTiltIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { PageActionBar } from '@/components/page-primitives/PageActionBar'
import { PostPublishStatus } from '@/components/posts/PostPublishStatus'
import type { PublishStatus } from '@/hooks/usePublishStatus'
import type { PostStatusAction } from '@/hooks/usePostStatusActions'
import type { PostStatusBlocker } from '@/lib/postStatusMachine'
import { cn } from '@/lib'

type Props = {
  /** Labelled moves, primary last. Empty in terminal states. */
  buttons: PostStatusAction[]
  /** The one step back, if the post can also still move forward. */
  back: PostStatusAction | null
  /**
   * Copy this post into a new draft (CON-251). Not a transition — `published`
   * has no outgoing edge — but the one forward move it still has, so it takes
   * the slot the transitions vacated rather than leaving the bar empty.
   *
   * Passed only where it applies; the bar never decides for itself which
   * statuses may be duplicated.
   */
  duplicate?: { run: () => void; running: boolean } | null
  /**
   * What happens to this post next, in both its forms (CON-195). Null when
   * nothing is going to publish it — see `usePublishStatus`.
   */
  status?: PublishStatus | null
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
 * In a terminal state there are no transitions to show, so the slot holds the
 * one forward move that is left instead: `duplicate`, which makes a new draft
 * rather than moving this post (CON-251).
 *
 * The save indicator still does not live here, but no longer for the reason it
 * once did — a published post is read-only now, so there is nothing to save on
 * the one screen where this bar has no transitions. It stays in the header
 * because that is where a passive status belongs (CON-178), not because it has
 * to outlive the bar.
 */
export function PostStatusActionBar({
  buttons,
  back,
  duplicate,
  pending,
  onBlocked,
  status,
}: Props) {
  // Still gated on there being a move to make, `status` or not. The statuses
  // that carry a countdown all have an outgoing user edge (a scheduled post
  // can be cancelled, a manual one verified), so this never hides one — and a
  // bar holding nothing but a sentence would be a banner, not a commit bar.
  if (!back && buttons.length === 0 && !duplicate) return null

  // Primary last — `usePostStatusActions` orders `buttons` so the most
  // prominent move ends the row, and the bar reads left-to-right into it.
  const primary: PostStatusAction | undefined = buttons[buttons.length - 1]
  const actions = back ? [back, ...buttons] : buttons

  return (
    <PageActionBar
      blocker={primary?.blockers[0]?.message}
      // The edges on offer, not their in-flight state: the bar animates on
      // this, and a value that also moved for a spinner would restart the
      // hand-off while a transition was still running.
      contentKey={[...actions.map((a) => a.next), duplicate && 'duplicate']
        .filter(Boolean)
        .join('|')}
      status={
        status && {
          full: <PostPublishStatus text={status.full} />,
          compact: (
            <PostPublishStatus text={status.compact} title={status.full} />
          ),
          key: status.full,
        }
      }
    >
      {actions.map((action) => (
        <ActionButton
          key={action.next}
          action={action}
          isPrimary={action === primary}
          pending={pending}
          onBlocked={onBlocked}
        />
      ))}
      {duplicate && <DuplicateButton {...duplicate} />}
    </PageActionBar>
  )
}

/**
 * Last in the row and at full strength, because on the one screen it appears
 * it is the only thing there — a published post has no transitions to rank it
 * against. Ghost like every other button on the bar; nothing here draws a slab.
 */
function DuplicateButton({
  run,
  running,
}: {
  run: () => void
  running: boolean
}) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-primary-foreground"
      disabled={running}
      loading={running}
      onClick={run}
    >
      <CopyIcon />
      <span>{t('posts.duplicate.action')}</span>
    </Button>
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
        !destructive &&
          (isPrimary ? 'text-primary-foreground' : 'text-tertiary-foreground'),
      )}
      // Only in-flight work disables the button; blockers are handled on click.
      disabled={pending}
      // The spinner goes on the move the user actually pressed, which is not
      // always the primary one: from `ready_for_publish` the step back to
      // draft runs while SCHEDULE sits beside it, and spinning SCHEDULE there
      // would name the wrong action. Nothing flips ahead of the response now,
      // so this is the only thing telling the user their click landed.
      loading={action.running}
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
