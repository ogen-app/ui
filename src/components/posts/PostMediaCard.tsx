import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CaretDownIcon,
  FileArrowUpIcon,
  FilePdfIcon,
  ImageBrokenIcon,
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { toast } from '@/stores/toastStore.ts'
import { cn } from '@/lib'
import { formatBytes } from '@/lib/platformMedia.ts'
import { formatTimecode } from '@/lib/platformVideo.ts'
import {
  acceptAttribute,
  checkFile,
  describeConstraints,
  mediaNoun,
  type MediaPolicy,
} from '@/lib/postMedia.ts'
import {
  attachmentKind,
  type PostAttachmentWithValidation,
} from '@/types/attachments.ts'
import type { PendingUpload, UploadResult } from '@/hooks/usePostAttachments.ts'
import type { Post } from '@/types/posts.ts'

/**
 * The posts of a thread, when this post publishes as one (CON-196).
 *
 * A thread's ceilings are per post, and so is its media — which is the only
 * part of a thread the body cannot express. So this is where it is said: every
 * thumbnail gains one control naming the post it rides.
 */
export type ThreadMediaTargets = {
  /** The first few words of each post, in order. Empty string is allowed. */
  excerpts: string[]
  /** Which post carries this file, 0-based. */
  indexFor: (attachmentId: string) => number
  assign: (attachmentId: string, index: number) => void
}

type Props = {
  post: Post
  attachments: PostAttachmentWithValidation[]
  pending: PendingUpload[]
  policy: MediaPolicy
  upload: (files: File[]) => Promise<UploadResult>
  remove: (attachmentId: string) => Promise<void>
  reorder: (ordered: PostAttachmentWithValidation[]) => void
  /** Absent for every post that is not a thread, which is nearly all of them. */
  thread?: ThreadMediaTargets
  className?: string
}

/**
 * The post's attachments, below the copy. Deliberately outside BlockNote:
 * these are platform media (what actually publishes), not illustrations
 * inside the body text, and the editor's image block stays disabled.
 *
 * Changing the post type never touches what's attached — a carousel turned
 * text post keeps its images, marked as not publishing, so the user decides
 * whether to delete them. The card only disappears when there is nothing to
 * show and nothing to add.
 */
export function PostMediaCard({
  post,
  attachments,
  pending,
  policy,
  upload,
  remove,
  reorder,
  thread,
  className,
}: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  // Attachments freeze once the post is published (the server rejects
  // mutations with a 409), so the card becomes a read-only record.
  const frozen = post.status === 'published'
  // On a thread `policy.max` is what *one post* takes, so it is not a ceiling
  // on the card: a four-image cap across five posts is twenty files. The cap
  // still holds where it means something — per post, on the thread's own row
  // in the pre-publish bar.
  const totalMax = thread ? null : policy.max
  const canAdd =
    !frozen &&
    policy.accepts &&
    (totalMax === null || attachments.length < totalMax)

  if (
    attachments.length === 0 &&
    pending.length === 0 &&
    (!policy.accepts || frozen)
  ) {
    return null
  }

  // Without a platform the policy is a guess — `mediaPolicy` falls back to
  // "accepts everything" so an unconfigured post isn't blocked, which means
  // the dropzone would be advertising limits nobody has agreed to. So the
  // card offers the one thing that is certainly true (you may attach
  // something) and stays shut until asked. Once open it stays open: a card
  // that closed itself again would look like the upload had failed.
  const collapsed =
    !post.platform_id &&
    !revealed &&
    attachments.length === 0 &&
    pending.length === 0

  const handleFiles = async (files: File[]) => {
    const accepted: File[] = []
    for (const file of files) {
      const verdict = checkFile(file, policy)
      if (verdict.ok) {
        accepted.push(file)
      } else {
        toast.error('File skipped', { description: verdict.reason })
      }
    }
    if (accepted.length === 0) return
    const room =
      totalMax === null ? accepted.length : totalMax - attachments.length
    const within = accepted.slice(0, Math.max(0, room))
    if (within.length < accepted.length) {
      toast.warning(`Only ${policy.max} files fit on this post type`, {
        description: `${accepted.length - within.length} file(s) were not uploaded.`,
      })
    }
    if (within.length === 0) return
    const { errors } = await upload(within)
    for (const error of errors) {
      toast.error('Upload failed', { description: error })
    }
  }

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= attachments.length || from === to) return
    const next = [...attachments]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    reorder(next)
  }

  return (
    <div
      className={cn(
        'w-full bg-primary px-10 py-6 flex flex-col gap-3',
        className,
      )}
    >
      {/* `SettingsCard`'s header, matched deliberately: title left, the one
          action opposite it. This is a card with a heading and a body like
          any settings section, and it was the only one drawing its own. */}
      <div className="flex items-center justify-between gap-4 min-w-0">
        <h2 className="flex items-center gap-2 min-w-0 text-xl font-display font-medium tracking-tight">
          Media
          {attachments.length > 0 && (
            <span className="font-normal text-tertiary-foreground">
              {attachments.length}
              {/* Only against a cap the post type can actually reach — a text
                  post caps at 0, and "2 / 0" reads as a broken counter. A
                  thread reaches none: its cap is per post of the chain. */}
              {policy.accepts && totalMax !== null && ` / ${totalMax}`}
            </span>
          )}
        </h2>

        {/* The two share the slot because they never coexist: constraints are
            what the card says once it is open, the button is what it offers
            while shut. With no platform the numbers would be the fallback
            policy's rather than a platform's, and stating them would be
            inventing rules. */}
        {collapsed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealed(true)}
          >
            ADD MEDIA
          </Button>
        ) : (
          policy.accepts && (
            <span className="shrink-0 text-xs text-tertiary-foreground">
              {describeConstraints(policy)}
            </span>
          )
        )}
      </div>

      {thread && policy.accepts && (
        <p className="text-xs text-tertiary-foreground">
          {t('posts.sequence.mediaPerPost')}
        </p>
      )}

      {!policy.accepts && attachments.length > 0 && (
        <Notice>
          This post type publishes without media. These files stay attached —
          remove them, or pick a post type that uses them.
        </Notice>
      )}
      {policy.videoUnsupported && (
        <Notice>
          This post type needs video, which this platform doesn&apos;t publish.
        </Notice>
      )}

      <div
        onDragOver={(e) => {
          if (!canAdd) return
          e.preventDefault()
          // Reordering drags carry no files; only a file drag arms the zone.
          if (dragIndex === null) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!canAdd) return
          e.preventDefault()
          setDragging(false)
          const files = Array.from(e.dataTransfer.files)
          if (files.length) void handleFiles(files)
        }}
        className={cn(
          // `items-start` because a thread's tiles carry a picker under them
          // and the add-media tile must not stretch to match.
          'flex flex-wrap items-start gap-3 transition-colors',
          dragging && 'bg-tertiary',
        )}
      >
        {attachments.map((att, index) => (
          // The picker sits under the tile rather than on it: the tile's four
          // corners are already spoken for (order, warning, size, delete), and
          // this is the one control that has to read as a word rather than an
          // icon — "which post carries this" is not guessable from a glyph.
          <div key={att.id} className="flex flex-col gap-1">
            <MediaTile
              attachment={att}
              index={index}
              total={attachments.length}
              frozen={frozen}
              dropTarget={
                overIndex === index && dragIndex !== null && dragIndex !== index
              }
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => dragIndex !== null && setOverIndex(index)}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
              onDrop={() => {
                if (dragIndex !== null) moveTo(dragIndex, index)
                setDragIndex(null)
                setOverIndex(null)
              }}
              onMove={(to) => moveTo(index, to)}
              onRemove={async () => {
                // The toast is the mutation's `errorTitle`; this only stops the
                // rejection escaping as an unhandled promise.
                await remove(att.id).catch(() => {})
              }}
            />
            {thread && !frozen && (
              <ThreadPostPicker attachmentId={att.id} thread={thread} />
            )}
          </div>
        ))}

        {pending.map((p) => (
          <div
            key={p.key}
            className="flex size-32 flex-col items-center justify-center gap-2 bg-tertiary px-2 text-center"
          >
            <FileArrowUpIcon className="size-5 text-tertiary-foreground" />
            <span className="w-full truncate text-xs text-tertiary-foreground">
              {p.name}
            </span>
            <span className="h-[2px] w-20 bg-quaternary">
              <span
                className="block h-full bg-foreground transition-[width]"
                style={{ width: `${p.percent}%` }}
              />
            </span>
          </div>
        ))}

        {/* While collapsed the surrounding flex row renders empty, which
            costs nothing — this tile is the only thing in it. */}
        {canAdd && !collapsed && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex size-32 flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors',
              'bg-tertiary hover:bg-quaternary',
            )}
          >
            <PlusIcon className="size-5 text-tertiary-foreground" />
            <span className="text-xs text-tertiary-foreground">
              {attachments.length === 0 ? 'Add media' : 'Add more'}
            </span>
          </button>
        )}
      </div>

      {policy.accepts && policy.required && attachments.length < policy.min && (
        <p className="text-xs text-warning">
          {policy.min === 1
            ? `This post type needs ${mediaNoun(policy)} before it can be published.`
            : `This post type needs at least ${policy.min} ${mediaNoun(policy, true)} before it can be published.`}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttribute(policy)}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length) void handleFiles(files)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * Which post of the thread this file rides — the one thing about a thread that
 * cannot be said in the body, so it is said here (CON-196).
 *
 * A radio group rather than a list of "move to" actions: the current post is
 * as much of the answer as the choice is, and on a thumbnail there is no room
 * to show it twice.
 */
function ThreadPostPicker({
  attachmentId,
  thread,
}: {
  attachmentId: string
  thread: ThreadMediaTargets
}) {
  const { t } = useTranslation()
  const current = thread.indexFor(attachmentId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('posts.sequence.mediaOnLabel', {
            position: current + 1,
          })}
          className={cn(
            'flex w-32 items-center justify-between gap-1 px-1.5 py-1 cursor-pointer',
            'bg-tertiary hover:bg-quaternary text-[11px] text-tertiary-foreground',
          )}
        >
          <span className="truncate">
            {t('posts.sequence.mediaOn', { position: current + 1 })}
          </span>
          <CaretDownIcon className="size-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72">
        <DropdownMenuRadioGroup
          value={String(current)}
          onValueChange={(value) => thread.assign(attachmentId, Number(value))}
        >
          {thread.excerpts.map((excerpt, i) => (
            <DropdownMenuRadioItem key={i} value={String(i)}>
              <span className="shrink-0">
                {t('posts.sequence.mediaOn', { position: i + 1 })}
              </span>
              {/* The excerpt is the post's own words, not copy of ours — it is
                  how you tell post 4 from post 5 without counting paragraphs
                  back in the editor. */}
              {excerpt && (
                <span className="truncate text-tertiary-foreground">
                  {excerpt}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type TileProps = {
  attachment: PostAttachmentWithValidation
  index: number
  total: number
  frozen: boolean
  dropTarget: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
  onDrop: () => void
  onMove: (to: number) => void
  onRemove: () => void
}

function MediaTile({
  attachment,
  index,
  total,
  frozen,
  dropTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onMove,
  onRemove,
}: TileProps) {
  const kind = attachmentKind(attachment.mime_type)
  const issues = attachment.platform_validation ?? []
  // PDFs show their first page and video its poster frame; both live in the
  // thumbnail slot. A video's own presigned URL is the file itself, which is
  // not something to drop into an <img>.
  const src =
    kind === 'pdf' || kind === 'video'
      ? attachment.thumbnail_url
      : attachment.presigned_url

  return (
    <div
      draggable={!frozen}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onDrop()
      }}
      // Alt+arrows reorder from the keyboard — the drag handle alone would
      // leave ordering mouse-only.
      onKeyDown={(e) => {
        if (frozen || !e.altKey) return
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onMove(index - 1)
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          onMove(index + 1)
        }
      }}
      tabIndex={0}
      role="group"
      aria-label={`Attachment ${index + 1} of ${total}${frozen ? '' : ' — Alt+arrow keys to reorder'}`}
      className={cn(
        'group relative size-32 bg-tertiary outline-none',
        !frozen && 'cursor-grab active:cursor-grabbing',
        'focus-visible:ring-2 focus-visible:ring-foreground',
        dropTarget && 'ring-2 ring-foreground',
      )}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
          {/* The poster is a still — without this the tile is
              indistinguishable from an image attachment. */}
          {kind === 'video' && (
            <PlayCircleIcon
              weight="fill"
              className="pointer-events-none absolute inset-0 m-auto size-8 text-primary/90"
            />
          )}
        </>
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1 text-tertiary-foreground">
          {kind === 'pdf' ? (
            <FilePdfIcon className="size-6" />
          ) : kind === 'video' ? (
            <PlayCircleIcon className="size-6" />
          ) : (
            <ImageBrokenIcon className="size-6" />
          )}
          <span className="text-[11px]">
            {kind === 'pdf'
              ? `${attachment.page_count || '?'} pages`
              : kind === 'video'
                ? 'Video'
                : 'No preview'}
          </span>
        </div>
      )}

      <span className="absolute left-1 top-1 bg-primary/90 px-1 text-[11px] text-tertiary-foreground">
        {index + 1}
      </span>

      {issues.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute right-1 top-1 bg-primary/90 p-0.5">
              <WarningCircleIcon
                weight="fill"
                className="size-4 text-warning"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <ul className="flex flex-col gap-1">
              {issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}

      <span className="absolute inset-x-0 bottom-0 truncate bg-primary/90 px-1 py-0.5 text-[11px] text-tertiary-foreground">
        {kind === 'pdf'
          ? `PDF · ${formatBytes(attachment.size_bytes)}`
          : kind === 'video'
            ? videoTileLabel(attachment)
            : `${attachment.width}×${attachment.height} · ${formatBytes(attachment.size_bytes)}`}
      </span>

      {!frozen && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="absolute right-1 bottom-6 hidden bg-primary/90 p-1 cursor-pointer group-hover:block group-focus-within:block"
        >
          <TrashIcon className="size-4 text-destructive" />
        </button>
      )}
    </div>
  )
}

/**
 * "1:04 · 1920×1080 · 24.6 MB", dropping whatever the probe didn't fill in.
 *
 * `duration_ms: 0` and `width: 0` mean video-service was unreachable at
 * finalize, not a zero-length or zero-pixel file — so they are omitted rather
 * than rendered as "0:00", which would read as a broken upload.
 */
function videoTileLabel(attachment: PostAttachmentWithValidation): string {
  const parts: string[] = []
  if (attachment.duration_ms > 0)
    parts.push(formatTimecode(attachment.duration_ms))
  if (attachment.width > 0 && attachment.height > 0) {
    parts.push(`${attachment.width}×${attachment.height}`)
  }
  parts.push(formatBytes(attachment.size_bytes))
  return parts.join(' · ')
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-warning">
      <WarningCircleIcon weight="fill" className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
