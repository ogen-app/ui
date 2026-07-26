import { useMemo } from 'react'
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CheckIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePlatformViews } from '@/hooks/usePlatforms'
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
 * The card above the post editor. Line 1: scheduling details next to the
 * status badge. Line 2: the platform / post type pickers (autosaving
 * through `changeDoc`) and the connected publishing account.
 *
 * Validation is inline — no separate checklist: a missing/past publish
 * date warns on line 1, a deselected platform or post type warns on its
 * own trigger, and a platform without a connected account warns in the
 * account slot. The pickers only offer what the campaign allows, plus a
 * deselect option.
 */
export function PostQuickSettingsBar({ doc, changeDoc, cancelling, className }: Props) {
  const platform = getPlatformInfo(doc.platform_id)
  const { data: campaign } = useCampaign(doc.campaign_id)
  const views = usePlatformViews()

  // platform id → post-type slugs enabled on this campaign.
  const campaignPostTypes = useMemo(
    () =>
      new Map(
        (campaign?.target_platforms ?? []).map((tp) => [tp.id, new Set(tp.post_types)]),
      ),
    [campaign],
  )
  // platform id → post-type slugs a CONNECTED publisher supports.
  const connectedPostTypes = useMemo(
    () =>
      new Map(views.map((v) => [v.platform.id, new Set(v.available.map((pt) => pt.slug))])),
    [views],
  )

  // Until the campaign loads, offer everything — avoids a flash of empty menus.
  const campaignPlatforms = campaign
    ? PLATFORMS.filter((p) => (campaignPostTypes.get(p.id)?.size ?? 0) > 0)
    : PLATFORMS
  const campaignTypes = (platform?.postTypes ?? []).filter(
    (t) => !campaign || (campaignPostTypes.get(doc.platform_id)?.has(t.slug) ?? false),
  )

  // The publishing account comes from the backend: the connected
  // publisher's account for the attached platform, not the app user.
  const view = views.find((v) => v.platform.id === doc.platform_id)
  const accounts = view?.connectedPublishers[0]?.accounts ?? []
  const account = accounts.find((a) => a.is_active) ?? accounts[0]
  const accountName =
    account?.display_name || account?.username || view?.connectedPublisherName || null

  const selectPlatform = (platformId: string) => {
    if (platformId === doc.platform_id) return
    changeDoc((d) => {
      d.platform_id = platformId
      if (!platformId) {
        // A post type without a platform is meaningless.
        d.platform_post_type = ''
        return
      }
      // Keep the post type when the new platform supports the same slug,
      // otherwise prefer the campaign's first enabled type for it.
      const next = getPlatformInfo(platformId)
      if (next && !next.postTypes.some((t) => t.slug === d.platform_post_type)) {
        const camp = campaignPostTypes.get(platformId)
        const preferred =
          next.postTypes.find((t) => camp?.has(t.slug)) ?? next.postTypes[0]
        d.platform_post_type = preferred?.slug ?? ''
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
    <div className={cn('w-full bg-primary px-10 py-4 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <SchedulingDetails post={doc} cancelling={cancelling} />
        <div className="shrink-0">
          <PostStatusBadge status={doc.status} />
        </div>
      </div>

      <div className="flex items-center gap-5 text-sm">
        <DropdownMenu>
          <QuickBarTrigger label="Change platform">
            {platform ? (
              <>
                <platform.icon size={16} weight="fill" color={platform.color} />
                <span>{platform.name}</span>
              </>
            ) : (
              <>
                <WarningCircleIcon weight="fill" className="size-4 text-warning" />
                <span>Platform</span>
              </>
            )}
            <CaretDownIcon className="size-3 text-tertiary-foreground" />
          </QuickBarTrigger>
          <DropdownMenuContent align="start">
            {campaignPlatforms.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => selectPlatform(p.id)}>
                <p.icon size={16} weight="fill" color={p.color} />
                <span>{p.name}</span>
                {p.id === doc.platform_id && <CheckIcon className="ml-auto size-3.5" />}
              </DropdownMenuItem>
            ))}
            {campaignPlatforms.length === 0 && (
              <DropdownMenuItem disabled>
                <span>No platforms on this campaign</span>
              </DropdownMenuItem>
            )}
            {platform && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => selectPlatform('')}>
                  <span>Deselect platform</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <QuickBarTrigger label="Change post type" disabled={!platform}>
            {doc.platform_post_type ? (
              <span>{getPostTypeLabel(doc.platform_id, doc.platform_post_type)}</span>
            ) : (
              <>
                <WarningCircleIcon weight="fill" className="size-4 text-warning" />
                <span>Post type</span>
              </>
            )}
            <CaretDownIcon className="size-3 text-tertiary-foreground" />
          </QuickBarTrigger>
          <DropdownMenuContent align="start">
            {campaignTypes.map((t) => {
              const connected =
                connectedPostTypes.get(doc.platform_id)?.has(t.slug) ?? false
              return (
                <DropdownMenuItem key={t.slug} onSelect={() => selectPostType(t.slug)}>
                  <span>{t.label}</span>
                  {t.slug === doc.platform_post_type ? (
                    <CheckIcon className="ml-auto size-3.5" />
                  ) : !connected ? (
                    <span className="ml-auto pl-3 text-xs text-tertiary-foreground">
                      Not connected
                    </span>
                  ) : null}
                </DropdownMenuItem>
              )
            })}
            {campaignTypes.length === 0 && (
              <DropdownMenuItem disabled>
                <span>No post types on this campaign</span>
              </DropdownMenuItem>
            )}
            {doc.platform_post_type && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => selectPostType('')}>
                  <span>Deselect post type</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {platform &&
          (accountName ? (
            // gap-1.5 matches the icon/label spacing inside the bar's triggers.
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-tertiary-foreground">by</span>
              <span className="truncate">{accountName}</span>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-tertiary-foreground">
              <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" />
              <span className="truncate">No account connected</span>
            </span>
          ))}
      </div>
    </div>
  )
}

function QuickBarTrigger({
  label,
  disabled,
  children,
}: {
  label: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="excluded"
        disabled={disabled}
        aria-label={label}
        className="gap-1.5 text-sm font-medium text-primary-foreground shrink-0"
      >
        {children}
      </Button>
    </DropdownMenuTrigger>
  )
}

const SCHEDULED_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatDate(iso: string): string | null {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : SCHEDULED_DATE_FORMAT.format(d)
}

function SchedulingDetails({ post, cancelling }: { post: Post; cancelling: boolean }) {
  const { text, warn } = schedulingDetails(post, cancelling)
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-sm',
        warn ? 'text-primary-foreground' : 'text-secondary-foreground',
      )}
    >
      {warn ? (
        <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" />
      ) : (
        <CalendarBlankIcon className="size-4 shrink-0" />
      )}
      <span className="truncate">{text}</span>
    </span>
  )
}

function schedulingDetails(
  post: Post,
  cancelling: boolean,
): { text: string; warn: boolean } {
  // The badge still reads `scheduled` until the worker confirms, so this
  // is the textual signal that an unschedule is in progress.
  if (cancelling) return { text: 'Unscheduling…', warn: false }
  const when = post.scheduled_at ? formatDate(post.scheduled_at) : null
  switch (post.status) {
    case 'scheduled':
      return { text: when ? `Auto-publishes ${when}` : 'No publish date set', warn: false }
    case 'scheduled_for_manual_publishing':
      return {
        text: when ? `Manual publish — reminder ${when}` : 'No publish date set',
        warn: false,
      }
    case 'published': {
      const at = post.published_at ? formatDate(post.published_at) : null
      return { text: at ? `Published ${at}` : 'Published', warn: false }
    }
    case 'failed':
      return {
        text: when ? `Publish failed — was scheduled for ${when}` : 'Publish failed',
        warn: false,
      }
    case 'not_published':
      return {
        text: when ? `Not published — was planned for ${when}` : 'Not published',
        warn: false,
      }
    default: {
      // draft / ready_for_publish: the date still gates scheduling, so a
      // missing or past date is a warning.
      if (!when) return { text: 'Not scheduled yet', warn: true }
      const inPast = new Date(post.scheduled_at as string).getTime() <= Date.now()
      return inPast
        ? { text: `Planned for the past: ${when}`, warn: true }
        : { text: `Planned for ${when}`, warn: false }
    }
  }
}
