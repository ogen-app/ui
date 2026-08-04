import { useRef, useState } from 'react'
import {
  FileArrowUpIcon,
  FilePdfIcon,
  ImageBrokenIcon,
  PlayCircleIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.tsx'
import { toast } from '@/stores/toastStore.ts'
import { cn } from '@/lib'
import { describeImageConstraints, formatBytes } from '@/lib/platformMedia.ts'
import { describeVideoConstraints, formatDuration } from '@/lib/platformVideo.ts'
import { acceptAttribute, checkFile, mediaNoun, type MediaPolicy } from '@/lib/postMedia.ts'
import { attachmentKind, type PostAttachmentWithValidation } from '@/types/attachments.ts'
import type { PendingUpload } from '@/hooks/usePostAttachments.ts'
import type { Post } from '@/types/posts.ts'

type Props = {
  post: Post
  attachments: PostAttachmentWithValidation[]
  pending: PendingUpload[]
  policy: MediaPolicy
  upload: (files: File[]) => Promise<{ uploaded: number; errors: string[] }>
  remove: (attachmentId: string) => Promise<void>
  reorder: (ordered: PostAttachmentWithValidation[]) => void
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
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // Attachments freeze once the post is published (the server rejects
  // mutations with a 409), so the card becomes a read-only record.
  const frozen = post.status === 'published'
  const canAdd =
    !frozen && policy.accepts && (policy.max === null || attachments.length < policy.max)

  if (attachments.length === 0 && pending.length === 0 && (!policy.accepts || frozen)) {
    return null
  }

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
    const room = policy.max === null ? accepted.length : policy.max - attachments.length
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
    <div className={cn('w-full bg-primary px-10 py-6 flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-foreground">
          Media
          {attachments.length > 0 && (
            <span className="ml-2 font-normal text-tertiary-foreground">
              {attachments.length}
              {/* Only against a cap the post type can actually reach — a text
                  post caps at 0, and "2 / 0" reads as a broken counter. */}
              {policy.accepts && policy.max !== null && ` / ${policy.max}`}
            </span>
          )}
        </h2>
        {policy.accepts && (
          <span className="text-xs text-tertiary-foreground">
            {/* One hint, for the kind the post type actually takes — a video
                post type showing image rules would describe an upload it
                won't accept. */}
            {policy.kinds.includes('video') && !policy.kinds.includes('image')
              ? policy.video && describeVideoConstraints(policy.video)
              : policy.image && describeImageConstraints(policy.image)}
          </span>
        )}
      </div>

      {!policy.accepts && attachments.length > 0 && (
        <Notice>
          This post type publishes without media. These files stay attached — remove
          them, or pick a post type that uses them.
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
          'flex flex-wrap gap-3 transition-colors',
          dragging && 'bg-tertiary',
        )}
      >
        {attachments.map((att, index) => (
          <MediaTile
            key={att.id}
            attachment={att}
            index={index}
            total={attachments.length}
            frozen={frozen}
            dropTarget={overIndex === index && dragIndex !== null && dragIndex !== index}
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
              try {
                await remove(att.id)
              } catch (err) {
                toast.error('Unable to remove file', {
                  description: err instanceof Error ? err.message : undefined,
                })
              }
            }}
          />
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

        {canAdd && (
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
              <WarningCircleIcon weight="fill" className="size-4 text-warning" />
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
  if (attachment.duration_ms > 0) parts.push(formatDuration(attachment.duration_ms))
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
