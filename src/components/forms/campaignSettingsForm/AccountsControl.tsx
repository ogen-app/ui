import { useMemo, useRef, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { PlusIcon, WarningCircleIcon } from '@phosphor-icons/react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAutoPublishState } from '@/hooks/useAutoPublishAllowlist'
import { useCampaignAccounts } from '@/hooks/useCampaignAccounts'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { cn } from '@/lib'
import {
  accountRows,
  activateTarget,
  deactivateTarget,
  togglePostType,
  PLACEHOLDER_ACCOUNT_ID,
  type CampaignAccountRow,
  type CampaignAccountTarget,
} from '@/lib/campaignAccounts'
import { accountLabel } from '@/lib/publishingAccount'
import type { CampaignPlatform, PublisherAccount } from '@/types/campaigns'

type Props = {
  campaignId: string
  /** The campaign's `target_platforms` — seeds a campaign with no stored choice. */
  targetPlatforms: CampaignPlatform[]
  /**
   * Every change persists straight away instead of waiting for the header
   * Save: the rows read as toggles, not as an edit, and the account choice is
   * stored outside the form anyway — leaving the derived platforms behind
   * would put the two out of step until Save.
   */
  onCommitPlatforms: (next: CampaignPlatform[]) => void
}

/** Keeps a nested control from also triggering the row's add. */
function stopRowClick(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

/**
 * The accounts this campaign publishes as, and what each of them posts.
 *
 * One row per connected account, then one per platform nobody has connected
 * yet — see `lib/campaignAccounts` for why those two kinds never stack and why
 * connecting an account doesn't take a placeholder's place on its own.
 */
export function AccountsControl({
  campaignId,
  targetPlatforms,
  onCommitPlatforms,
}: Props) {
  const views = usePlatformViews()
  // The hook owns both writes — the account choice into the settings key and
  // the platform-level view of it onto the campaign — so a burst of clicks
  // costs one request each and they can't disagree.
  const { targets, isPending, write: apply } = useCampaignAccounts(
    campaignId,
    targetPlatforms,
    onCommitPlatforms,
  )

  const rows = useMemo(() => accountRows(views, targets), [views, targets])

  if (views.length === 0) {
    return <span className="text-xs text-tertiary-foreground">No platforms available</span>
  }

  // The list would otherwise draw every row as untargeted and then correct
  // itself — a campaign flashing "nothing to publish to" it doesn't mean.
  if (isPending) {
    return (
      <div className="flex flex-col gap-1">
        <Skeleton className="mb-3 h-5 w-64" />
        {views.map((view) => (
          <Skeleton key={view.platform.id} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <AccountsSummary targets={targets} />
      {rows.map((row) => {
        const platformId = row.view.platform.id
        const accountId = row.account?.id ?? PLACEHOLDER_ACCOUNT_ID
        const allowed = row.view.allowed.map((pt) => pt.slug)
        const deactivate = () =>
          apply(deactivateTarget(targets, platformId, accountId))

        return (
          <AccountRow
            key={row.key}
            row={row}
            onAdd={() =>
              // Everything the expanded region renders starts switched on —
              // `allowed`, not `available`, so a placeholder arrives fully
              // targeted rather than as a row of dormant switches.
              apply(activateTarget(targets, platformId, accountId, allowed))
            }
            onSupersede={(account) =>
              // The placeholder's own post types come across with it —
              // `activateTarget` treats this as the same row gaining a name.
              apply(activateTarget(targets, platformId, account.id, allowed))
            }
            onTogglePostType={(slug) => {
              const next = togglePostType(targets, platformId, accountId, slug)
              // Switching the last post type off leaves an account that is
              // targeted but publishes nothing — a state the campaign has no
              // use for and no obvious way out of. Treat it as the same
              // intention as DEACTIVATE ALL.
              const entry = next.find(
                (t) => t.platform_id === platformId && t.account_id === accountId,
              )
              if (entry?.post_types.length === 0) {
                deactivate()
                return
              }
              apply(next)
            }}
            onDeactivate={deactivate}
          />
        )
      })}
    </div>
  )
}

/**
 * What the campaign currently publishes as, in one line above the list.
 *
 * The list only says this by omission, and targeting nothing is a dead
 * campaign — so it reads as a warning rather than a neutral count, matching
 * the dot on the card heading.
 */
function AccountsSummary({ targets }: { targets: CampaignAccountTarget[] }) {
  if (targets.length === 0) {
    return (
      <p className="mb-3 text-sm text-warning">
        No accounts selected — this campaign has nowhere to publish.
      </p>
    )
  }

  const postTypes = targets.reduce((n, t) => n + t.post_types.length, 0)
  const placeholders = targets.filter(
    (t) => t.account_id === PLACEHOLDER_ACCOUNT_ID,
  ).length

  return (
    <p className="mb-3 text-sm text-tertiary-foreground">
      {targets.length} account{targets.length === 1 ? '' : 's'} added with {postTypes}{' '}
      post type{postTypes === 1 ? '' : 's'}.
      {placeholders > 0 && (
        // Not left to the rows: a placeholder cannot publish, and a reader
        // who takes the count above at face value would think it can.
        <span className="text-warning">
          {' '}
          {placeholders} of {placeholders === 1 ? 'them has' : 'them have'} no account
          behind {placeholders === 1 ? 'it' : 'them'} yet.
        </span>
      )}
    </p>
  )
}

const ROW = 'group flex items-center justify-between gap-3 px-3 py-3 bg-secondary'

/**
 * One row, targeted or not.
 *
 * Both states are one component so the post-type region can be a height
 * transition rather than a mount: swapping components here would unmount the
 * region on deactivate, and an unmounted element cannot animate out.
 *
 * There is no collapse control. Being expanded *is* how the list says a row is
 * targeted, so a caret would let the row lie about its own state. Activation
 * lives at both ends: the row itself on the way in, DEACTIVATE ALL at the foot
 * of the expanded region on the way out.
 */
function AccountRow({
  row,
  onAdd,
  onSupersede,
  onTogglePostType,
  onDeactivate,
}: {
  row: CampaignAccountRow
  onAdd: () => void
  onSupersede: (account: PublisherAccount) => void
  onTogglePostType: (slug: string) => void
  onDeactivate: () => void
}) {
  const { view, account, selection, supersededBy } = row
  const { info, available, unavailable } = view
  const selected = selection !== undefined
  const name = account ? accountLabel(account) : info.name

  // Deactivating drops the entry on the same click that starts the collapse,
  // so the switches would flip off under the user while the region is still
  // closing. They keep their last state on the way out.
  const lastPostTypes = useRef<string[]>([])
  if (selection) lastPostTypes.current = selection.post_types
  const postTypes = selection?.post_types ?? lastPostTypes.current

  return (
    <div className="flex flex-col bg-secondary">
      {/* Clickable only while untargeted. Adding is the safe direction — one
          click to undo — so it gets the whole row; leaving is DEACTIVATE ALL
          alone, at the far end of what it throws away. */}
      <RowShell onToggle={selected ? undefined : onAdd} label={`Add ${name} to the campaign`}>
        <div className="flex-1 min-w-0">
          <AccountLabel
            row={row}
            selectedCount={selected ? postTypes.length : undefined}
          />
        </div>
        {!selected && (
          <div className="flex shrink-0 items-center gap-1" onClick={stopRowClick}>
            <Button
              type="button"
              variant="ghost"
              size="smIcon"
              onClick={onAdd}
              aria-label={`Add ${name}`}
              title={`Add ${name}`}
              className="group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        )}
      </RowShell>

      {/* `grid-template-rows` rather than `height`: the post-type list has no
          height to name up front, and 0fr→1fr animates to whatever it turns
          out to be. `visibility` rides along because a zero-height row still
          holds focusable switches — a keyboard user would tab into a list
          nobody can see. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-200 ease-out',
          selected ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pb-2">
            {supersededBy.length > 0 && (
              <SupersedeOffer accounts={supersededBy} onSupersede={onSupersede} />
            )}
            {[...available, ...unavailable].map((pt) => (
              <PostTypeSwitchRow
                key={pt.slug}
                label={pt.label}
                ariaLabel={`${name} — ${pt.label}`}
                checked={postTypes.includes(pt.slug)}
                onToggle={() => onTogglePostType(pt.slug)}
                muted={unavailable.includes(pt)}
              />
            ))}
            {/* Under the switches rather than up on the row: it is the end of
                what this account does for the campaign, and the last switch off
                reaches the same place. `ml-13` is the button's own px-3 backed
                out of the switch rows' pl-16, so the label starts on their left
                edge while the button stays the width of its text. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeactivate}
              className="mt-1 ml-13 self-start"
            >
              DEACTIVATE ALL
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The swap a connected account offers an active placeholder.
 *
 * Deliberately an offer and not a migration: the campaign said "post to
 * Facebook" before anyone connected a page, and quietly resolving that to
 * whichever page turned up would publish to an audience nobody chose. Accepting
 * carries the placeholder's post types across, so the row keeps everything but
 * its anonymity.
 *
 * It lives inside the expanded region rather than on the row because it is only
 * ever true of a targeted placeholder, and it has to sit above the switches it
 * is about to move.
 */
function SupersedeOffer({
  accounts,
  onSupersede,
}: {
  accounts: PublisherAccount[]
  onSupersede: (account: PublisherAccount) => void
}) {
  return (
    <div className="mx-3 mb-2 flex flex-col gap-2 border border-warning/40 px-3 py-2">
      <p className="text-sm text-warning">
        {accounts.length === 1
          ? 'This platform is connected now. Use the account instead of the placeholder?'
          : 'This platform is connected now. Pick the account to use instead of the placeholder.'}
      </p>
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between gap-3">
          <AccountIdentity account={account} className="size-8" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSupersede(account)}
          >
            {/* Literal caps, not `uppercase` — the caps are the copy. */}
            USE THIS ACCOUNT
          </Button>
        </div>
      ))}
    </div>
  )
}

/**
 * The row's clickable shell. Only the untargeted one is a button: adding is the
 * safe direction and it persists immediately, so it gets the big target. A
 * targeted row is inert and renders as a plain container.
 */
function RowShell({
  onToggle,
  label,
  children,
}: {
  onToggle?: () => void
  label?: string
  children: ReactNode
}) {
  if (!onToggle) return <div className={ROW}>{children}</div>

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        // Only the row's own keys: Enter/Space on a nested control bubbles
        // here too, and must not also toggle.
        if (e.target !== e.currentTarget) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onToggle()
      }}
      className={cn(ROW, 'cursor-pointer focus-visible:outline-2 focus-visible:outline-ring')}
    >
      {children}
    </div>
  )
}

/** Avatar over `@handle` — an account is a face, which is what tells it apart
 *  from the placeholder rows below it. */
function AccountIdentity({
  account,
  className,
}: {
  account: PublisherAccount
  className?: string
}) {
  const name = accountLabel(account)
  return (
    <div className="min-w-0 flex items-center gap-2">
      <Avatar className={cn('shrink-0', className)}>
        {account.avatar_url && <AvatarImage src={account.avatar_url} alt={name} />}
        <AvatarFallback>{(name || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate text-sm">
        {name}
        <span className="text-tertiary-foreground"> @{account.username}</span>
      </span>
    </div>
  )
}

/**
 * Sends the user to Workspace Settings, where accounts are actually linked.
 *
 * A text link in the subline rather than a button on the row's right edge: it
 * belongs to the sentence that explains the problem, and the right edge is
 * reserved for the one control that acts on this campaign. It only appears on a
 * placeholder the campaign already targets, where the missing account is not
 * information but a campaign that cannot publish.
 */
function ConnectLink({ platformName }: { platformName: string }) {
  return (
    <Link
      to="/workspace-settings"
      aria-label={`Connect ${platformName}`}
      onClick={stopRowClick}
      className="text-warning underline underline-offset-2"
    >
      Connect
    </Link>
  )
}

function AccountLabel({
  row,
  selectedCount,
}: {
  row: CampaignAccountRow
  selectedCount?: number
}) {
  const { view, account } = row
  const { info } = view
  const Icon = info.icon
  // Only a targeted row passes a count, so this doubles as "is targeted".
  const selected = selectedCount !== undefined
  const placeholder = account === null
  const name = account ? accountLabel(account) : info.name

  // `allowed`, not `available`, on both sides: those are the rows the expanded
  // block actually renders. An untargeted placeholder gives up the count
  // entirely — how many kinds of post it could take is the wrong thing to
  // answer when the workspace cannot reach the platform at all.
  const counts = selected
    ? `${selectedCount} of ${view.allowed.length} post types`
    : placeholder
      ? null
      : `${view.allowed.length} post types available`

  // Set in Workspace Settings, not here: this is the workspace's decision
  // showing through, so the campaign can see how its posts will go out without
  // having to leave the page to find out.
  const autoPublish = useAutoPublishState(view.platform.id)

  return (
    <div className="min-w-0 flex items-center gap-3">
      <span className="relative shrink-0">
        {placeholder ? (
          // The logo alone, desaturated until targeted: a placeholder has no
          // face to show, and the platform is the whole of what it names.
          <Icon
            className={cn(
              'size-10 transition-[filter]',
              !selected && 'grayscale group-hover:grayscale-0',
            )}
            weight="fill"
            style={{ color: info.color }}
          />
        ) : (
          <>
            <Avatar className="size-10">
              {account.avatar_url && <AvatarImage src={account.avatar_url} alt={name} />}
              <AvatarFallback>{(name || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            {/* Which platform this face belongs to. Full colour whether or not
                the campaign targets it — it is identity, not selection. */}
            <Icon
              aria-hidden
              weight="fill"
              className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-secondary"
              style={{ color: info.color }}
            />
          </>
        )}
        {/* A targeted placeholder is a campaign that cannot publish, and from a
            distance the row looks like any other. The badge is the one thing
            the identity block can't say on its own. */}
        {placeholder && selected && (
          <WarningCircleIcon
            weight="fill"
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-secondary text-warning"
          />
        )}
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="text-base font-semibold text-primary-foreground truncate">
          {name}
        </span>
        <span className="text-xs text-tertiary-foreground truncate">
          {/* The platform first on an account row: the name above it is a page,
              not a channel, and "Acme" alone doesn't say where it posts. */}
          {!placeholder && (
            <>
              {info.name}
              {' · '}
            </>
          )}
          {/* Ahead of the post-type count: whether Ogen posts on the user's
              behalf outranks how many kinds of post it may send. Held while
              `unknown` — "Manual publishing only" is not a sentence to write
              before asking. */}
          {selected && autoPublish !== 'unknown' && (
            <>
              {autoPublish === 'allowed' ? 'Auto-publishing allowed' : 'Manual publishing only'}
              {counts && ' · '}
            </>
          )}
          {counts}
          {/* The same fact in two registers. On a platform nobody has targeted
              it is grey and it is the whole line — the normal state of most of
              this list, stated and left alone. Once the campaign targets it,
              it turns into a campaign that cannot publish, so it escalates to
              the warning colour and carries the way out. */}
          {placeholder &&
            (selected ? (
              <>
                {counts && ' · '}
                <span className="text-warning">No account connected.</span>{' '}
                <ConnectLink platformName={info.name} />
              </>
            ) : (
              'No account connected — add it as a placeholder.'
            ))}
        </span>
      </div>
    </div>
  )
}

function PostTypeSwitchRow({
  label,
  ariaLabel,
  checked,
  onToggle,
  muted = false,
}: {
  label: string
  ariaLabel: string
  checked: boolean
  onToggle: () => void
  muted?: boolean
}) {
  return (
    <label
      className={cn(
        // Left edge lines up with the name: row padding (12) + avatar (40) +
        // gap (12).
        'flex items-center justify-between gap-3 pl-16 pr-[18px] py-2',
        'cursor-pointer select-none hover:bg-secondary/60',
        muted && 'opacity-60',
      )}
    >
      {/* On/off is legible from the label as well as the switch, so a glance
          down the column reads as a list of what publishes. */}
      <span
        className={cn(
          'text-sm',
          checked ? 'text-primary-foreground' : 'text-tertiary-foreground',
        )}
      >
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onToggle} aria-label={ariaLabel} />
    </label>
  )
}
