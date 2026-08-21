import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CaretDownIcon,
  ClockIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AccountAvatar } from '@/components/ui/account-avatar'
import { PostStatusBadge } from '@/components/posts/PostStatusBadge'
import { useAutoPublishState } from '@/hooks/useAutoPublishAllowlist'
import { useCampaign } from '@/hooks/useCampaigns'
import { usePlatformViews } from '@/hooks/usePlatforms'
import {
  usePublishingAccount,
  type PublishingAccount,
} from '@/hooks/usePublishingAccount'
import { accountLabel } from '@/lib/publishingAccount'
import {
  PLATFORMS,
  getPlatformInfo,
  getPostTypeLabel,
} from '@/lib/platformDictionary'
import {
  canEditPublishingAccount,
  canEditScheduledAt,
  PUBLISH_METHOD_HINTS,
  PUBLISH_METHOD_LABELS,
  type PublishMethod,
} from '@/lib/postStatusMachine'
import { fromLocalParts, toLocalParts } from '@/lib/postSchedule'
import { formatDate as formatLocaleDate } from '@/lib/intl'
import { cn } from '@/lib'
import type { Post } from '@/types/posts'

type Props = {
  doc: Post
  changeDoc: (fn: (p: Post) => void) => void
  cancelling: boolean
  /**
   * Bumped by the header when a blocked status action is clicked. Each new
   * value flashes the bar — see the outline/shake below — because the fields
   * that block the transition all live in here.
   */
  attention?: number
  publishMethod: PublishMethod
  onPublishMethodChange: (method: PublishMethod) => void
  /**
   * Opens the "where did you publish it?" dialog. The only way back into
   * verification once a post is `published`: that status is terminal, so the
   * header has no button to offer (CON-149).
   */
  onAddPostLink: () => void
  className?: string
}

/** How long the attention flash runs. Matches the `attention-flash` keyframes. */
const ATTENTION_MS = 1500

/**
 * The card above the post editor. Line 1: when and how it publishes, next to
 * the status badge. Line 2: the platform / post type pickers (autosaving
 * through `changeDoc`) and the connected publishing account.
 *
 * Validation is inline — no separate checklist: a missing/past publish
 * date warns on line 1, a deselected platform warns on its own trigger,
 * and a platform without a connected account warns in the account slot.
 * The pickers only offer what the campaign allows, plus a deselect option.
 *
 * Everything here is editable in place — the date, the time and the publish
 * method all open pickers — so a post can be scheduled without opening the
 * settings rail. The status badge is read-only: moving between statuses is
 * the header's job.
 */
export function PostQuickSettingsBar({
  doc,
  changeDoc,
  cancelling,
  attention = 0,
  publishMethod,
  onPublishMethodChange,
  onAddPostLink,
  className,
}: Props) {
  const platform = getPlatformInfo(doc.platform_id)
  const { data: campaign, isLoading: campaignPending } = useCampaign(doc.campaign_id)
  // The same source the route resolves the method against, so the two can't
  // disagree. `unknown` holds the picker: "manual publish" is a promise about
  // what happens to this post, and it waits until we can keep it.
  const autoPublish = useAutoPublishState(doc.platform_id)
  const views = usePlatformViews()
  const flashing = useAttentionFlash(attention)

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

  // While it is loading the triggers are disabled (`campaignPending` below),
  // so the unfiltered fallback is what an *errored* campaign leaves behind —
  // an over-wide menu beats no menu once there is nothing left to wait for.
  const campaignPlatforms = campaign
    ? PLATFORMS.filter((p) => (campaignPostTypes.get(p.id)?.size ?? 0) > 0)
    : PLATFORMS
  const campaignTypes = (platform?.postTypes ?? []).filter(
    (t) => !campaign || (campaignPostTypes.get(doc.platform_id)?.has(t.slug) ?? false),
  )

  // The publishing account comes from the backend: one of the connected
  // publisher's accounts for the attached platform, not the app user. Shared
  // with the preview panel, which has to render as that same account.
  const account = usePublishingAccount(
    doc.platform_id,
    doc.social_account_id,
    doc.social_account,
  )

  const selectAccount = (accountId: string) => {
    if (accountId === doc.social_account_id) return
    changeDoc((d) => {
      d.social_account_id = accountId
    })
  }

  const selectPlatform = (platformId: string) => {
    if (platformId === doc.platform_id) return
    changeDoc((d) => {
      d.platform_id = platformId
      // The account belongs to the platform it was picked under, so it
      // never survives the move — keeping it would send the server an
      // `account_platform_mismatch` on the next schedule.
      d.social_account_id = ''
      if (!platformId) {
        // A post type without a platform is meaningless.
        d.platform_post_type = ''
        return
      }
      // Keep the post type when the new platform supports the same slug,
      // otherwise prefer the campaign's first enabled type for it. Both
      // sides read the selectable list, so switching platforms can never
      // land the post on a video type the picker would not have offered.
      const next = getPlatformInfo(platformId)
      const types = next?.postTypes ?? []
      if (next && !types.some((t) => t.slug === d.platform_post_type)) {
        const camp = campaignPostTypes.get(platformId)
        const preferred = types.find((t) => camp?.has(t.slug)) ?? types[0]
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

  const setScheduledAt = (iso: string | null) => {
    changeDoc((d) => {
      d.scheduled_at = iso
    })
  }

  return (
    <div
      className={cn(
        'w-full bg-primary px-10 py-4 flex flex-col gap-3',
        // Blocked-action feedback: shake, then the ring fades out. Defined
        // in index.css because the ring's colour is animated, and it uses
        // `outline` rather than `border` so the bar never reflows.
        flashing && 'animate-attention',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* text-sm, like the row below: the bare Dot inherits the card's
            24px line-height otherwise and makes this row 4px taller than
            its 20px siblings. */}
        <span className="flex min-w-0 items-center gap-2.5 text-sm">
          <SchedulingDetails
            post={doc}
            cancelling={cancelling}
            onChange={setScheduledAt}
            onAddPostLink={onAddPostLink}
          />
          {/* Only where the fork is still ahead of the post. Once it's
              scheduled the status itself records which way it went, and
              SchedulingDetails spells it out ("Auto-publishes …"). */}
          {(doc.status === 'draft' || doc.status === 'ready_for_publish') && (
            <>
              <Dot />
              {autoPublish === 'unknown' ? (
                <Skeleton className="h-4 w-28" />
              ) : (
                <PublishMethodPicker
                  method={publishMethod}
                  onChange={onPublishMethodChange}
                  platformName={platform?.name ?? null}
                  hasAccount={account.connected}
                  autoAllowed={autoPublish === 'allowed'}
                />
              )}
            </>
          )}
        </span>
        {/* flex, not a plain block: the badge is inline-flex, so a block
            parent gives it a line box at the bar's 24px line-height and the
            row renders 24.5px against its 20px siblings. */}
        <div className="shrink-0 flex items-center">
          <PostStatusBadge
            status={doc.status}
            className="text-sm text-primary-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-sm">
        <DropdownMenu>
          <QuickBarTrigger label="Change platform" disabled={campaignPending}>
            {platform ? (
              <>
                <platform.icon size={16} weight="fill" color={platform.color} />
                <span>{platform.name}</span>
              </>
            ) : (
              <>
                <WarningHint text="Pick the platform this post publishes to — it decides the available post types and the publishing account." />
                <span>Select platform</span>
              </>
            )}
            <CaretDownIcon className="size-3 text-tertiary-foreground" />
          </QuickBarTrigger>
          <DropdownMenuContent align="start">
            {campaignPlatforms.map((p) => (
              <DropdownMenuItem key={p.id} onSelect={() => selectPlatform(p.id)}>
                <p.icon size={16} weight="fill" color={p.color} />
                <span className={cn(p.id === doc.platform_id && 'font-medium')}>
                  {p.name}
                </span>
              </DropdownMenuItem>
            ))}
            {campaignPlatforms.length === 0 && (
              <InfoRow>No platforms on this campaign</InfoRow>
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

        {/* Post types are a property of the platform, so there is nothing to
            choose from until one is picked — the slot is hidden rather than
            shown disabled next to its own warning. */}
        {platform && <Dot />}

        {platform && (
          <DropdownMenu>
            <QuickBarTrigger label="Change post type" disabled={campaignPending}>
              {doc.platform_post_type ? (
                <span>{getPostTypeLabel(doc.platform_id, doc.platform_post_type)}</span>
              ) : (
                <>
                  <WarningHint text={`Pick the ${platform.name} post type — it sets the format this post publishes as.`} />
                  <span>Select post type</span>
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
                    <span
                      className={cn(
                        t.slug === doc.platform_post_type && 'font-medium',
                      )}
                    >
                      {t.label}
                    </span>
                    {!connected && (
                      <span className="ml-auto pl-4 text-xs text-tertiary-foreground">
                        Not connected
                      </span>
                    )}
                  </DropdownMenuItem>
                )
              })}
              {campaignTypes.length === 0 && (
                <InfoRow>No post types on this campaign</InfoRow>
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
        )}

        {platform && <Dot />}

        {platform && (
          <AccountSlot
            account={account}
            platformName={platform.name}
            editable={canEditPublishingAccount(doc.status)}
            onSelect={selectAccount}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Holds a flash on for ATTENTION_MS each time `attention` changes. The
 * counter (not a boolean) is what lets a second blocked click re-trigger
 * the animation while the first is still running.
 */
function useAttentionFlash(attention: number): boolean {
  const [flashing, setFlashing] = useState(false)
  const seen = useRef(attention)

  useEffect(() => {
    if (attention === seen.current) return
    seen.current = attention
    setFlashing(false)
    // Two frames: drop the class, let the browser paint, then re-add it so
    // the animation restarts from the top on a repeat click.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setFlashing(true))
    })
    const timer = setTimeout(() => setFlashing(false), ATTENTION_MS + 50)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [attention])

  return flashing
}

const PUBLISH_METHODS: PublishMethod[] = ['auto', 'manual']

/**
 * Auto-publish vs manual. This is the one scheduling decision the status
 * machine can't hold — there is no field for it, the choice *is* which
 * status SCHEDULE moves the post into — so it's made here, in the open,
 * rather than by picking between two identically-named menu entries.
 */
function PublishMethodPicker({
  method,
  onChange,
  platformName,
  hasAccount,
  autoAllowed,
}: {
  method: PublishMethod
  onChange: (method: PublishMethod) => void
  platformName: string | null
  hasAccount: boolean
  /** The workspace allowlists this platform for auto-publishing. */
  autoAllowed: boolean
}) {
  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change how this post publishes">
        <span>{PUBLISH_METHOD_LABELS[method]}</span>
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start" className="max-w-[300px]">
        {PUBLISH_METHODS.map((m) => {
          // Auto is not offered where the workspace hasn't allowed it: the
          // schedule endpoint would route the post to manual regardless, so
          // presenting it as a choice would be a promise the server breaks.
          const blocked = m === 'auto' && !autoAllowed
          return (
            <DropdownMenuItem
              key={m}
              disabled={blocked}
              className="flex-col items-start gap-0.5"
              onSelect={() => {
                if (blocked) return
                onChange(m)
              }}
            >
              <span className={cn(m === method && 'font-medium')}>
                {PUBLISH_METHOD_LABELS[m]}
              </span>
              <span className="text-xs text-tertiary-foreground">
                {PUBLISH_METHOD_HINTS[m]}
              </span>
              {blocked && (
                <span className="text-xs text-tertiary-foreground">
                  Not allowed for {platformName ?? 'this platform'} in this
                  workspace — change it in Workspace Settings.
                </span>
              )}
              {/* Auto needs a connected publisher; without one the server
                  routes it to manual anyway, so say that up front. */}
              {m === 'auto' && !blocked && !hasAccount && (
                <span className="text-xs text-warning">
                  No {platformName ?? 'publishing'} account is connected — this
                  will fall back to a reminder.
                </span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * "by <account>" — and, where the platform has more than one connected
 * account, the picker that decides which (CON-150).
 *
 * Three shapes, matching the three the server distinguishes:
 *   - nothing connected → a warning; there is no choice to offer and no
 *     post can publish.
 *   - exactly one → plain text. The submit worker auto-selects it, so a
 *     one-item menu would be a decision the user doesn't have to make.
 *   - two or more → a real picker, required. The server rejects a
 *     scheduled post that names none of them, so leaving it unset is not a
 *     state the bar lets the user rest in.
 *
 * Once the post is scheduled or published the choice is read-only text —
 * the submission already carries the account (see canEditPublishingAccount).
 */
function AccountSlot({
  account,
  platformName,
  editable,
  onSelect,
}: {
  account: PublishingAccount
  platformName: string
  editable: boolean
  onSelect: (accountId: string) => void
}) {
  // `account.name` survives disconnection via the post's hydrated relation,
  // so a published post still names what it went out as even once that
  // account has left the platform's connected list.
  if (!account.name && !account.connected) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-tertiary-foreground">
        <WarningHint
          focusable
          text={`No ${platformName} account is connected, so nothing can publish this post. Connect one in Platform settings.`}
        />
        <span className="truncate">No account connected</span>
      </span>
    )
  }

  // Settled: nothing left to decide, or the post has moved past the point
  // where the account can still change.
  if (!editable || (account.accounts.length < 2 && !account.mismatched)) {
    // A post scheduled before a second account was connected never recorded
    // which one the worker picked. Saying so beats naming the wrong one.
    if (!account.name) {
      return (
        <span className="truncate text-tertiary-foreground">Account not recorded</span>
      )
    }
    // gap-1.5 matches the icon/label spacing inside the bar's triggers.
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="text-tertiary-foreground">by</span>
        <span className="truncate">{account.name}</span>
      </span>
    )
  }

  return (
    <DropdownMenu>
      <QuickBarTrigger label="Change the account this post publishes as">
        {account.mismatched ? (
          <>
            <WarningHint
              text={
                account.name
                  ? `${account.name} is no longer connected to ${platformName}, so this post can't publish as it. Pick another account.`
                  : `The account this post publishes as is no longer connected to ${platformName}. Pick another one.`
              }
            />
            <span className="truncate">
              {account.name ? `${account.name} — disconnected` : 'Account disconnected'}
            </span>
          </>
        ) : account.account ? (
          <>
            <span className="text-tertiary-foreground">by</span>
            <span className="truncate">{account.name}</span>
          </>
        ) : (
          <>
            <WarningHint
              text={`This workspace has ${account.accounts.length} ${platformName} accounts connected — pick the one this post publishes as.`}
            />
            <span>Select account</span>
          </>
        )}
        <CaretDownIcon className="size-3 text-tertiary-foreground" />
      </QuickBarTrigger>
      <DropdownMenuContent align="start">
        {account.accounts.map((a) => (
          <DropdownMenuItem key={a.id} onSelect={() => onSelect(a.id)}>
            <AccountAvatar src={a.avatar_url} name={accountLabel(a)} size="sm" />
            <div className="flex min-w-0 flex-col">
              <span
                className={cn('truncate', a.id === account.account?.id && 'font-medium')}
              >
                {accountLabel(a)}
              </span>
              {a.username && (
                <span className="truncate text-xs text-tertiary-foreground">
                  @{a.username}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * A "nothing to choose here" note inside a menu. Styled like the settings
 * panel's own selects: quieter than a disabled row, and not selectable, so
 * it can't be mistaken for an option.
 */
function InfoRow({ children }: { children: React.ReactNode }) {
  return <div className="px-2 py-1.5 text-xs text-tertiary-foreground">{children}</div>
}

/**
 * Separator between the bar's inline controls. Without it neighbouring
 * triggers read as one run-on phrase ("Select publish date Add time",
 * "LinkedIn Text post by Ogen").
 */
function Dot() {
  return (
    <span aria-hidden className="text-tertiary-foreground select-none">
      ·
    </span>
  )
}

/**
 * The orange marker on an incomplete field, carrying the reason on hover.
 * The icon alone says "something is wrong here" but not what or why — the
 * tooltip is where that gets answered.
 *
 * `focusable` is opt-in: these sit inside dropdown triggers in most places,
 * and a focusable span nested in a button is a keyboard trap.
 */
function WarningHint({ text, focusable }: { text: string; focusable?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="flex shrink-0 items-center"
          tabIndex={focusable ? 0 : undefined}
          role="img"
          aria-label={text}
        >
          <WarningCircleIcon weight="fill" className="size-4 text-warning" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        {text}
      </TooltipContent>
    </Tooltip>
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
        className="gap-1.5 text-sm font-normal text-primary-foreground shrink-0"
      >
        {children}
      </Button>
    </DropdownMenuTrigger>
  )
}

const SCHEDULED_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}

function formatDate(iso: string): string | null {
  return formatLocaleDate(iso, SCHEDULED_DATE_FORMAT)
}

function SchedulingDetails({
  post,
  cancelling,
  onChange,
  onAddPostLink,
}: {
  post: Post
  cancelling: boolean
  onChange: (iso: string | null) => void
  onAddPostLink: () => void
}) {
  // While `scheduled`/`published` the date is owned elsewhere (the Zernio
  // submission, or history) — show it as text, same as the settings rail.
  const editable = canEditScheduledAt(post.status) && !cancelling
  if (!editable) {
    const { text, warn } = schedulingDetails(post, cancelling)
    // Published, but nothing ties it to the post that actually went out — so
    // its analytics can never resolve. Offering the link here is the only
    // route back in: `published` is terminal, so the header shows no actions.
    const unlinked = post.status === 'published' && !post.publisher_post_id
    return (
      <span
        className={cn(
          'flex min-w-0 items-center gap-2.5 text-sm',
          warn ? 'text-primary-foreground' : 'text-secondary-foreground',
        )}
      >
        {/* The icon and the thing it labels are one unit at gap-1.5, matching
            the platform trigger below (icon + name). The row's own gap-2.5 is
            for what separates units — the Dot — so leaving the icon to inherit
            it made the same pairing read two different ways on two lines. */}
        <span className="flex min-w-0 items-center gap-1.5">
          {warn ? (
            <WarningCircleIcon weight="fill" className="size-4 shrink-0 text-warning" />
          ) : (
            <ClockIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">{text}</span>
        </span>
        {unlinked && (
          <>
            <Dot />
            <Button
              variant="link"
              size="excluded"
              className="shrink-0 text-sm underline underline-offset-4"
              onClick={onAddPostLink}
            >
              Add post link
            </Button>
          </>
        )}
      </span>
    )
  }
  return <ScheduleEditor post={post} onChange={onChange} />
}

/**
 * The date and the time as two separate inline pickers. Splitting them is
 * what makes the empty state actionable: "Select publish date" opens a
 * calendar and reads as its own control. The time only appears once a date
 * is set — before that there is nothing for it to qualify.
 */
function ScheduleEditor({
  post,
  onChange,
}: {
  post: Post
  onChange: (iso: string | null) => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const { dateStr, timeStr } = toLocalParts(post.scheduled_at)
  const selected = post.scheduled_at ? new Date(post.scheduled_at) : null
  const valid = selected && !isNaN(selected.getTime())
  const inPast = valid ? selected.getTime() <= Date.now() : false

  return (
    <span className="flex min-w-0 items-center gap-2.5 text-sm">
      {/* Icon and date as one unit at gap-1.5 — see the note in
          `SchedulingDetails`. The row's gap-2.5 stays for the Dot that
          separates the date from the time. */}
      <span className="flex min-w-0 items-center gap-1.5">
        {!valid ? (
          <WarningHint
            focusable
            text="This post has no publish date, so it can't be scheduled. Pick a date and time to publish it."
          />
        ) : inPast ? (
          <WarningHint
            focusable
            text="The publish date is in the past. Scheduling needs a date in the future — pick a new one."
          />
        ) : (
          <ClockIcon className="size-4 shrink-0 text-secondary-foreground" />
        )}

        <DropdownMenu open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="excluded"
            aria-label="Set publish date"
            className="gap-1.5 text-sm font-normal text-primary-foreground shrink-0"
          >
            {valid ? formatLocaleDate(selected, DAY_FORMAT) : 'Select publish date'}
            <CaretDownIcon className="size-3 text-tertiary-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="p-0">
          <Calendar
            mode="single"
            selected={valid ? selected : undefined}
            onSelect={(d) => {
              if (d) {
                // Keep the time already chosen; fromLocalParts falls back to
                // the default hour when there isn't one yet.
                const [y, m, day] = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
                const next = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                onChange(fromLocalParts(next, timeStr))
              }
              setCalendarOpen(false)
            }}
            onClear={
              valid
                ? () => {
                    onChange(null)
                    setCalendarOpen(false)
                  }
                : undefined
            }
          />
          </DropdownMenuContent>
        </DropdownMenu>
      </span>

      {valid && (
        <>
          <Dot />
          <TimeField dateStr={dateStr} timeStr={timeStr} onChange={onChange} />
        </>
      )}
    </span>
  )
}

/**
 * The time half of the schedule line. Only rendered once a date exists: a
 * time with no day to hang it on means nothing, and the calendar already
 * supplies DEFAULT_HOUR, so there is never a dated post without a time.
 */
function TimeField({
  dateStr,
  timeStr,
  onChange,
}: {
  dateStr: string
  timeStr: string
  onChange: (iso: string | null) => void
}) {
  // A half-typed time ("1" of "11:45") is an empty value on the element. A
  // plain controlled input would snap it back to the saved time on every
  // keystroke, so the draft is local and only re-syncs when the post's own
  // time changes underneath us — e.g. an edit in the settings rail.
  const [draft, setDraft] = useState(timeStr)
  useEffect(() => setDraft(timeStr), [timeStr])

  return (
    <input
      type="time"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value) onChange(fromLocalParts(dateStr, e.target.value))
      }}
      aria-label="Publish time"
      // Bare input: the bar's own text styling, no chrome. The webkit
      // indicator is hidden because the field itself is the affordance.
      className={cn(
        // font-sans: inputs don't inherit the family, so without it the time
        // renders in the browser default and breaks the line's text style.
        'bg-transparent border-0 outline-none p-0 font-sans text-sm text-primary-foreground shrink-0 cursor-pointer',
        'focus-visible:underline underline-offset-4',
        '[&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
      )}
    />
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
    default:
      return { text: when ? `Planned for ${when}` : 'Not scheduled yet', warn: !when }
  }
}
