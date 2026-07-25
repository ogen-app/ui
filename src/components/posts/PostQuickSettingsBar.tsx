import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge'
import { useAuthStore } from '@/stores/authStore'
import {
  PLATFORMS,
  getPlatformInfo,
  getPostTypeLabel,
} from '@/lib/platformDictionary'
import { cn } from '@/lib'
import type { Post } from '@/types/posts'

type Props = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  cancelling: boolean
  className?: string
}

/**
 * The bar above the post editor: quick access to the post's platform and
 * post type (both autosave through `changeDoc`), the author, and the
 * current status with its schedule summary.
 */
export function PostQuickSettingsBar({ doc, changeDoc, cancelling, className }: Props) {
  const { user } = useAuthStore()
  const platform = getPlatformInfo(doc.platform_id)

  const authorName =
    user && doc.created_by === user.id
      ? `${user.firstName} ${user.lastName}`.trim()
      : null

  const selectPlatform = (platformId: string) => {
    if (platformId === doc.platform_id) return
    changeDoc((d) => {
      d.platform_id = platformId
      // Keep the post type when the new platform supports the same slug,
      // otherwise fall back to the platform's first type.
      const next = getPlatformInfo(platformId)
      if (next && !next.postTypes.some((t) => t.slug === d.platform_post_type)) {
        d.platform_post_type = next.postTypes[0]?.slug ?? ''
      }
    })
  }

  const selectPostType = (slug: string) => {
    if (slug === doc.platform_post_type) return
    changeDoc((d) => {
      d.platform_post_type = slug
    })
  }

  return (
    <div
      className={cn(
        'w-full bg-primary h-12 px-6 flex items-center gap-5 text-sm',
        className,
      )}
    >
      <DropdownMenu>
        <QuickBarTrigger label="Change platform">
          {platform && (
            <platform.icon size={16} weight="fill" color={platform.color} />
          )}
          <span>{platform?.name ?? 'Platform'}</span>
          <CaretDownIcon className="size-3 text-tertiary-foreground" />
        </QuickBarTrigger>
        <DropdownMenuContent align="start">
          {PLATFORMS.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => selectPlatform(p.id)}>
              <p.icon size={16} weight="fill" color={p.color} />
              <span>{p.name}</span>
              {p.id === doc.platform_id && <CheckIcon className="ml-auto size-3.5" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <QuickBarTrigger label="Change post type">
          <span>
            {getPostTypeLabel(doc.platform_id, doc.platform_post_type) ||
              'Post type'}
          </span>
          <CaretDownIcon className="size-3 text-tertiary-foreground" />
        </QuickBarTrigger>
        <DropdownMenuContent align="start">
          {(platform?.postTypes ?? []).map((t) => (
            <DropdownMenuItem key={t.slug} onSelect={() => selectPostType(t.slug)}>
              <span>{t.label}</span>
              {t.slug === doc.platform_post_type && (
                <CheckIcon className="ml-auto size-3.5" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {authorName && (
        <span className="truncate">
          <span className="text-tertiary-foreground">by </span>
          <span>{authorName}</span>
        </span>
      )}

      <div className="ml-auto flex items-center gap-3 shrink-0">
        <ScheduleSummary post={doc} cancelling={cancelling} />
        <PostStatusBadge status={doc.status} />
      </div>
    </div>
  )
}

function QuickBarTrigger({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="excluded"
        aria-label={label}
        className="gap-1.5 text-sm font-medium text-primary-foreground shrink-0"
      >
        {children}
      </Button>
    </DropdownMenuTrigger>
  )
}

const SCHEDULED_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function ScheduleSummary({ post, cancelling }: { post: Post; cancelling: boolean }) {
  if (post.status !== 'scheduled' && post.status !== 'scheduled_for_manual_publishing') {
    return null
  }
  // The badge still reads `scheduled` until the worker confirms, so this
  // is the textual signal that an unschedule is in progress.
  if (cancelling) {
    return <span className="text-xs text-tertiary-foreground">Unscheduling…</span>
  }
  if (!post.scheduled_at) {
    return <span className="text-xs text-tertiary-foreground">No date set</span>
  }
  const d = new Date(post.scheduled_at)
  if (isNaN(d.getTime())) return null
  const verb = post.status === 'scheduled' ? 'Auto-publishes' : 'Reminder'
  return (
    <span className="text-xs text-tertiary-foreground">
      {verb} {SCHEDULED_DATE_FORMAT.format(d)}
    </span>
  )
}
