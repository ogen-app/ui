import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  FilePdfIcon,
  ImageBrokenIcon,
  ImageSquareIcon,
  PlayCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import type { SequenceItemReport } from '@/lib/threadSequence'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments'

type Props = {
  report: SequenceItemReport
  total: number
  /** The attachments this post of the thread carries, in its own order. */
  attachments: PostAttachmentWithValidation[]
  /** The platform's per-post ceiling; `null` when it sets none. */
  charLimit: number | null | undefined
  /** Images one post may carry — quoted back in the message when it is over. */
  imageCap: number | null | undefined
  /** The platform's display name. Every rule quoted here is that platform's. */
  platformName: string
  /** The assistant is rewriting this post server-side; edits would be lost. */
  readOnly: boolean
  uploading: boolean
  onChange: (content: string) => void
  onInsertAfter: () => void
  onRemove: () => void
  onMove: (to: number) => void
  onAddMedia: (files: File[]) => void
  onMoveMedia: (attachmentId: string, toIndex: number) => void
}

/**
 * One post of a thread sequence: its words, the media it carries, and what is
 * wrong with it.
 *
 * A plain textarea rather than the BlockNote editor the single-body post uses,
 * and that is the deliberate part. X and Threads publish plain text — there is
 * no heading, no list and no bold to send — so a rich editor here would offer
 * formatting that is silently dropped at publish, and it would make Enter mean
 * "new block" on a screen where the blocks are already the numbered rows. Here
 * Enter is a line break inside this post, and a new post is an explicit act.
 */
export function SequenceItemRow({
  report,
  total,
  attachments,
  charLimit,
  imageCap,
  platformName,
  readOnly,
  uploading,
  onChange,
  onInsertAfter,
  onRemove,
  onMove,
  onAddMedia,
  onMoveMedia,
}: Props) {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const { item, position, count, issues } = report
  const first = position === 1
  const last = position === total
  const over = issues.includes('over-limit')

  return (
    <div className="group/row flex gap-3" data-sequence-post={position}>
      {/* The gutter: the number the reader will count by, and the line that
          says these are one chain rather than one document in pieces. */}
      <div className="flex w-6 flex-none flex-col items-center pt-1">
        <span
          className={cn(
            'text-xs tabular-nums',
            over ? 'text-destructive' : 'text-tertiary-foreground',
          )}
          aria-hidden
        >
          {position}
        </span>
        {!last && <div className="mt-2 w-px flex-1 bg-quaternary" />}
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <Textarea
          value={item.content}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          aria-label={t('posts.sequence.postLabel', { position, total })}
          placeholder={t(
            first
              ? 'posts.sequence.placeholderFirst'
              : 'posts.sequence.placeholderNext',
          )}
          // No `rows` variant: its `min-h-*` floor would hold an empty post
          // open at two lines, and here a row's height is its content.
          className="min-h-0 border-0 bg-transparent px-0 py-0 text-base"
        />

        {attachments.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <li key={attachment.id}>
                <MediaThumb
                  attachment={attachment}
                  position={position}
                  total={total}
                  onMoveTo={(to) => onMoveMedia(attachment.id, to)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex items-start gap-4">
          <ul className="min-w-0 flex-1 space-y-0.5 text-xs text-destructive">
            {issues.map((issue) => (
              <li key={issue}>
                {issue === 'empty' && t('posts.sequence.issue.empty')}
                {issue === 'over-limit' &&
                  t('posts.sequence.issue.overLimit', {
                    limit: formatNumber(charLimit ?? 0),
                    platform: platformName,
                  })}
                {issue === 'too-many-images' &&
                  t('posts.sequence.issue.tooManyImages', {
                    cap: formatNumber(imageCap ?? 0),
                    platform: platformName,
                  })}
                {issue === 'too-many-videos' &&
                  t('posts.sequence.issue.tooManyVideos')}
              </li>
            ))}
          </ul>

          <div className="flex flex-none items-center gap-1">
            {/* The row's actions stay out of the way until the row is the one
                being worked on. Focus-within as well as hover: reaching them
                with the keyboard must not depend on a pointer. */}
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  // Clearing lets the same file be picked again after a failed
                  // upload — the input fires nothing when the value repeats.
                  e.target.value = ''
                  if (files.length > 0) onAddMedia(files)
                }}
              />
              <RowAction
                label={t('posts.sequence.addMedia', { position })}
                icon={<ImageSquareIcon />}
                disabled={readOnly || uploading}
                onClick={() => fileRef.current?.click()}
              />
              <RowAction
                label={t('posts.sequence.moveUp', { position })}
                icon={<ArrowUpIcon />}
                disabled={readOnly || first}
                onClick={() => onMove(position - 2)}
              />
              <RowAction
                label={t('posts.sequence.moveDown', { position })}
                icon={<ArrowDownIcon />}
                disabled={readOnly || last}
                onClick={() => onMove(position)}
              />
              <RowAction
                label={t('posts.sequence.removePost', { position })}
                icon={<TrashIcon />}
                disabled={readOnly}
                onClick={onRemove}
              />
            </div>

            {/* Always visible, unlike the actions: it is the answer to "will
                this post publish", which is the question being asked while
                typing rather than one the user goes looking for. */}
            {charLimit != null && (
              <span
                className={cn(
                  'w-16 text-right text-xs tabular-nums',
                  over ? 'text-destructive' : 'text-tertiary-foreground',
                )}
              >
                {t('posts.sequence.counter', {
                  chars: formatNumber(count),
                  limit: formatNumber(charLimit),
                })}
              </span>
            )}
          </div>
        </div>

        {/* The divider is the add control. A thread is written by splitting
            what is already there, so the affordance belongs at the seam. */}
        {!readOnly && (
          <div className="relative mt-2 h-4">
            <div className="absolute inset-x-0 top-1/2 h-px bg-quaternary opacity-0 transition-opacity group-hover/row:opacity-100" />
            <button
              type="button"
              onClick={onInsertAfter}
              aria-label={t('posts.sequence.addPostAfter', { position })}
              className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-secondary text-xs leading-none text-secondary-foreground opacity-0 transition-opacity hover:text-primary-foreground group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function RowAction({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string
  icon: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="xsIcon"
          className="h-6 w-6"
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * One carried file, and the menu that moves it to another post of the thread.
 *
 * Moving rather than uploading is what this menu is for: the file is already
 * on the post — attachments are post-level rows and stay that way — and which
 * post of the chain carries it is the only thing a sequence adds.
 */
function MediaThumb({
  attachment,
  position,
  total,
  onMoveTo,
}: {
  attachment: PostAttachmentWithValidation
  position: number
  total: number
  onMoveTo: (index: number) => void
}) {
  const { t } = useTranslation()
  const kind = attachmentKind(attachment.mime_type)
  const src =
    kind === 'image' ? attachment.presigned_url : attachment.thumbnail_url

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative block size-10 overflow-hidden rounded-sm bg-secondary"
          aria-label={t('posts.sequence.mediaOn', { position })}
        >
          {src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-tertiary-foreground">
              {kind === 'pdf' ? (
                <FilePdfIcon size={16} />
              ) : (
                <ImageBrokenIcon size={16} />
              )}
            </span>
          )}
          {kind === 'video' && (
            <span className="absolute inset-0 flex items-center justify-center text-primary-foreground">
              <PlayCircleIcon size={16} weight="fill" />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>
          {t('posts.sequence.mediaOn', { position })}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Array.from({ length: total }, (_, i) => (
          <DropdownMenuItem
            key={i}
            disabled={i === position - 1}
            onSelect={() => onMoveTo(i)}
          >
            {t('posts.sequence.moveMediaTo', { position: i + 1 })}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
