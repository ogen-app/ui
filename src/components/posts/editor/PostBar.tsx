import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  PaperPlaneTiltIcon,
  TrashIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SaveStatus } from '@/components/page-primitives/SaveStatus'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge'
import { PostPublishStatus } from '@/components/posts/PostPublishStatus'
import { usePostsPlace } from '@/hooks/usePostsPlace'
import { usePostNeighbours } from '@/hooks/usePostNavigation'
import type { PostStatusAction } from '@/hooks/usePostStatusActions'
import type { PublishStatus } from '@/hooks/usePublishStatus'
import type { PostStatusBlocker } from '@/lib/postStatusMachine'
import { formatNumber } from '@/lib/intl'
import { cn } from '@/lib'
import type { PostStatus } from '@/types/posts'

type Props = {
  campaignId: string
  postId: string
  /** The title as typed, so the bar follows the field without a save. */
  title: string
  status: PostStatus
  /** Autosave in flight — the pulsing cloud instead of the checkmark. */
  saving: boolean
  /** Labelled moves, primary last. Empty in terminal states. */
  buttons: PostStatusAction[]
  /** The one step back, if the post can also still move forward. */
  back: PostStatusAction | null
  /** Copy this post into a new draft — offered on a published post only. */
  duplicate: { run: () => void; running: boolean } | null
  /** What happens to the post next (CON-195), or null when nothing will. */
  publishStatus: PublishStatus | null
  /** A transition or a cancellation is in flight. */
  pending: boolean
  /**
   * Called instead of running an action when blockers stand in the way. The
   * button stays live: pressing it opens the tab where the fields are and
   * flashes them, which beats a tooltip explaining a dead control.
   */
  onBlocked: (blockers: PostStatusBlocker[]) => void
  onDownloadMarkdown: () => void
  onDeletePost: () => void
}

/**
 * The post's own bar, over the writing column and level with the side
 * column's tabs — the same 48px, so the two make one line across the page.
 *
 * On the left, where you are: back to the posts you came from, which post this
 * is — by its title, since "Posts" said nothing the page did not — and the way
 * to the post before or after it without going back. On the right, what the
 * post can do: its status, when it goes out, the rest of its moves under the
 * ⋮, and last, in the corner, the one move forward at full strength.
 *
 * Not in the bar over the page: that one is the app's (the campaign, Ask
 * Ogen), and a post's commit beside Ask Ogen fought it for the corner. Not at
 * the foot of the page either, where it used to float on its own bar over a
 * fade — the post was the last screen keeping one.
 */
export function PostBar({
  campaignId,
  postId,
  title,
  status,
  saving,
  buttons,
  back,
  duplicate,
  publishStatus,
  pending,
  onBlocked,
  onDownloadMarkdown,
  onDeletePost,
}: Props) {
  const { t } = useTranslation()
  // Primary last — `usePostStatusActions` orders `buttons` so the most
  // prominent move ends the row.
  const primary: PostStatusAction | undefined = buttons[buttons.length - 1]
  const others = [...(back ? [back] : []), ...buttons.slice(0, -1)]
  const blocker = primary?.blockers[0]?.message

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-primary px-3 lg:px-6">
      <div className="flex min-w-0 items-center gap-1">
        <BackToPosts campaignId={campaignId} />
        <PostTitle title={title} />
        <PostStepper campaignId={campaignId} postId={postId} />
        <SaveStatus saving={saving} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {publishStatus && (
          <span className="hidden text-sm text-secondary-foreground xl:inline">
            <PostPublishStatus text={publishStatus.full} />
          </span>
        )}
        <PostStatusBadge
          status={status}
          className="text-sm text-primary-foreground"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="smIcon"
              className="size-8 border-border"
              aria-label={t('posts.editor.more')}
            >
              <DotsThreeVerticalIcon weight="bold" className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {others.map((action) => (
              <DropdownMenuItem
                key={action.next}
                disabled={pending}
                variant={
                  action.intent === 'destructive' ? 'destructive' : undefined
                }
                onSelect={() => runOrReport(action, onBlocked)}
              >
                {iconFor(action)}
                <span>{action.menuLabel}</span>
              </DropdownMenuItem>
            ))}
            {others.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={onDownloadMarkdown}>
              <DownloadSimpleIcon />
              <span>{t('posts.editor.downloadMarkdown')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDeletePost}>
              <TrashIcon />
              <span>{t('posts.editor.delete')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {primary ? (
          <PrimaryAction
            action={primary}
            blocker={blocker}
            pending={pending}
            onBlocked={onBlocked}
          />
        ) : (
          duplicate && (
            <Button
              type="button"
              variant="defaultInverted"
              size="sm"
              className="h-8"
              disabled={duplicate.running}
              loading={duplicate.running}
              onClick={duplicate.run}
            >
              <CopyIcon />
              <span>{t('posts.duplicate.action')}</span>
            </Button>
          )
        )}
      </div>
    </div>
  )
}

/**
 * The one move forward, filled, and always the last thing in the bar. When
 * something blocks it the button still presses — that opens Settings on the
 * field to fix — and carries the warning mark, with the reason on hover. The
 * mark is drawn in the button's own ink: the orange is too dark to read on
 * the black fill, and an orange button would be white text on orange, which
 * is not legible either.
 */
function PrimaryAction({
  action,
  blocker,
  pending,
  onBlocked,
}: {
  action: PostStatusAction
  blocker: string | undefined
  pending: boolean
  onBlocked: (blockers: PostStatusBlocker[]) => void
}) {
  const button = (
    <Button
      type="button"
      variant={
        action.intent === 'destructive'
          ? 'destructiveInverted'
          : 'defaultInverted'
      }
      size="sm"
      className="h-8"
      disabled={pending}
      loading={action.running}
      aria-disabled={blocker ? true : undefined}
      onClick={() => runOrReport(action, onBlocked)}
    >
      {blocker ? <WarningCircleIcon weight="fill" /> : iconFor(action)}
      <span>{action.buttonLabel}</span>
    </Button>
  )
  if (!blocker) return button
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        {blocker}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * ← back to wherever the user was last reading this campaign's posts — the
 * week or month they had navigated to, or the table.
 *
 * Two branches because that is two different routes, and a `<Link>` gets its
 * param types from a literal `to`. A real anchor rather than `history.back()`,
 * so it middle-clicks like any other link and still goes somewhere when the
 * post was opened from a pasted URL.
 */
function BackToPosts({ campaignId }: { campaignId: string }) {
  const { t } = useTranslation()
  const place = usePostsPlace(campaignId)
  const className =
    'flex size-8 shrink-0 items-center justify-center rounded-button text-secondary-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
  const label = t('posts.editor.back')
  const icon = <ArrowLeftIcon className="size-4" />
  const link =
    place.view === 'list' ? (
      <Link
        to="/campaigns/$campaignId/list"
        params={{ campaignId }}
        aria-label={label}
        className={className}
      >
        {icon}
      </Link>
    ) : (
      <Link
        to="/campaigns/$campaignId/calendar/$anchor/$view"
        params={{ campaignId, anchor: place.anchor, view: place.view }}
        aria-label={label}
        className={className}
      >
        {icon}
      </Link>
    )
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * Which post this is, cut to one line. The field below is the one to edit it
 * in; this is the name to recognise it by while the field is scrolled away.
 */
function PostTitle({ title }: { title: string }) {
  const { t } = useTranslation()
  const text = title.trim()
  return (
    <span
      className={cn(
        'min-w-0 truncate px-1 text-sm font-medium',
        text ? 'text-primary-foreground' : 'text-tertiary-foreground',
      )}
      title={text || undefined}
    >
      {text || t('posts.editor.untitled')}
    </span>
  )
}

/**
 * ‹ 3 of 21 › — the post's place in the campaign's timeline, and the way to
 * either neighbour. The same order as ← and →, which still work.
 */
function PostStepper({
  campaignId,
  postId,
}: {
  campaignId: string
  postId: string
}) {
  const { t } = useTranslation()
  const { previous, next, position, total } = usePostNeighbours(
    campaignId,
    postId,
  )
  if (!position) return null
  return (
    <span className="ml-1 flex items-center text-sm text-tertiary-foreground">
      <StepLink
        campaignId={campaignId}
        postId={previous?.id}
        label={t('posts.editor.previous')}
      >
        <CaretLeftIcon className="size-4" />
      </StepLink>
      <span className="px-1 tabular-nums">
        {t('posts.editor.position', {
          position: formatNumber(position),
          total: formatNumber(total),
        })}
      </span>
      <StepLink
        campaignId={campaignId}
        postId={next?.id}
        label={t('posts.editor.next')}
      >
        <CaretRightIcon className="size-4" />
      </StepLink>
    </span>
  )
}

function StepLink({
  campaignId,
  postId,
  label,
  children,
}: {
  campaignId: string
  postId: string | undefined
  label: string
  children: ReactNode
}) {
  const className =
    'flex size-7 items-center justify-center rounded-button outline-none focus-visible:ring-2 focus-visible:ring-ring'
  if (!postId)
    return (
      <span aria-hidden className={cn(className, 'opacity-40')}>
        {children}
      </span>
    )
  return (
    <Link
      to="/campaigns/$campaignId/posts/$postId"
      params={{ campaignId, postId }}
      aria-label={label}
      title={label}
      className={cn(
        className,
        'text-secondary-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </Link>
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
    case 'planned':
      return <ArrowUUpLeftIcon />
  }
}

function runOrReport(
  action: PostStatusAction,
  onBlocked: (blockers: PostStatusBlocker[]) => void,
) {
  if (action.blockers.length > 0) {
    onBlocked(action.blockers)
    return
  }
  void action.run()
}
