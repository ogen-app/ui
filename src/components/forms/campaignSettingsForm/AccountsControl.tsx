import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CaretDownIcon, PlusIcon, SwapIcon, WarningCircleIcon } from '@phosphor-icons/react'

import { AccountAvatar } from '@/components/ui/account-avatar'
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
import type { PlatformInfo } from '@/lib/platformDictionary'
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

  const renderRow = (row: CampaignAccountRow) => {
    const platformId = row.view.platform.id
    const accountId = row.account?.id ?? PLACEHOLDER_ACCOUNT_ID
    const allowed = row.view.allowed.map((pt) => pt.slug)

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
        onTogglePostType={(slug) =>
          // Switching the last post type off leaves the account active
          // with nothing to publish, and it stays that way. Deactivating
          // on the user's behalf was one click doing two things — the row
          // would vanish mid-sentence while they were still deciding what
          // it posts. The row says it publishes nothing instead, and
          // DEACTIVATE is still right there when that is what they meant.
          apply(togglePostType(targets, platformId, accountId, slug))
        }
        onDeactivate={() => apply(deactivateTarget(targets, platformId, accountId))}
      />
    )
  }

  // Two groups rather than one list in two sorts: an active row and an
  // inactive one look alike at a glance — same tile, same name, same width —
  // and interleaving them made the campaign's actual choice something you had
  // to read the right-hand end of every row to find.
  //
  // Both filters preserve `accountRows`' order, which is already the display
  // order for both halves — accounts before placeholders, and inside the
  // active half by when each was chosen, so activating a row lands it at the
  // foot of its kind rather than somewhere up the group.
  const active = rows.filter((row) => row.selection !== undefined)
  const inactive = rows.filter((row) => row.selection === undefined)

  return (
    <div className="flex flex-col gap-1">
      <AccountsSummary targets={targets} />
      <GroupLabel>ACTIVE</GroupLabel>
      {active.length > 0 ? active.map(renderRow) : <NoneActive />}
      {inactive.length > 0 && (
        <>
          <GroupLabel className="mt-4">INACTIVE</GroupLabel>
          {inactive.map(renderRow)}
        </>
      )}
    </div>
  )
}

function GroupLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('mb-1 text-xs font-medium text-tertiary-foreground', className)}>
      {children}
    </p>
  )
}

/**
 * Holds the active group open at row height while it is empty.
 *
 * Without it the heading sits directly on top of INACTIVE and the card looks
 * like a list with a stray word in it — and the group the campaign is actually
 * defined by would be the one thing on screen with no substance to it.
 *
 * It carries the warning too, rather than repeating it in the summary line
 * above: a campaign with nowhere to publish is a state, and this is the shape
 * of the thing that is missing.
 */
function NoneActive() {
  return (
    <div className="flex h-16 items-center justify-center border border-dashed border-warning/40 px-3">
      <span className="text-sm text-warning">
        No accounts active — this campaign has nowhere to publish.
      </span>
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
  // Nothing to summarise, and the empty ACTIVE group says it in the place the
  // eye is already going. Two sentences about the same nothing read as two
  // problems.
  if (targets.length === 0) return null

  const postTypes = targets.reduce((n, t) => n + t.post_types.length, 0)
  const placeholders = targets.filter(
    (t) => t.account_id === PLACEHOLDER_ACCOUNT_ID,
  ).length

  return (
    <p className="mb-3 text-sm text-tertiary-foreground">
      {/* "Active", the same word the rows and their buttons use — the campaign
          has one verb for this and the summary shouldn't invent a second. */}
      {targets.length} account{targets.length === 1 ? '' : 's'} active with {postTypes}{' '}
      post type{postTypes === 1 ? '' : 's'}.
      {/* Not left to the rows: a placeholder is an active row that cannot
          publish at all, and a reader who takes the count above at face value
          would think it can. A row with no post types is the rows' own
          business — it says so on its face and again when opened, and a
          second tally up here was one warning too many for a state the user
          is usually halfway through creating. */}
      {placeholders > 0 && (
        <span className="text-warning">
          {' '}
          {placeholders} of {placeholders === 1 ? 'them has' : 'them have'} no account
          behind {placeholders === 1 ? 'it' : 'them'} yet.
        </span>
      )}
    </p>
  )
}

// `pr-5` against `pl-3`: the right end carries a label and an icon rather than
// a fixed control, and at the row's own padding they sat on the card's edge.
// Everything inside the expanded region uses the same right inset.
const ROW = 'group flex items-center justify-between gap-3 pl-3 pr-5 py-3 bg-secondary'

/**
 * One row, targeted or not.
 *
 * Both states are one component so the post-type region can be a height
 * transition rather than a mount: swapping components here would unmount the
 * region on deactivate, and an unmounted element cannot animate out.
 *
 * The row is one click target throughout, and what that click does is what the
 * right-hand end says it does: ACTIVATE + while the campaign doesn't target
 * this account, a caret once it does. Those are different verbs, so they never
 * share an affordance — a plus that sometimes expands and sometimes adds is the
 * thing this replaced.
 *
 * Expansion is therefore its own state rather than a reading of `selection`: a
 * targeted row can be folded away without losing its post types, and a row
 * being open no longer claims the campaign publishes there.
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

  // Targeted rows start open, the way they did when being open *was* being
  // targeted; from then on it is the user's to set. Activating opens the row
  // it activated — the post types are the rest of that decision, and burying
  // them behind a second click would be an odd place to stop.
  const [expanded, setExpanded] = useState(selected)
  const open = selected && expanded

  // Deactivating drops the entry on the same click that starts the collapse,
  // so the switches would flip off under the user while the region is still
  // closing. They keep their last state on the way out.
  const lastPostTypes = useRef<string[]>([])
  if (selection) lastPostTypes.current = selection.post_types
  const postTypes = selection?.post_types ?? lastPostTypes.current

  const activate = () => {
    setExpanded(true)
    onAdd()
  }

  return (
    <div className="flex flex-col bg-secondary">
      <RowShell
        onToggle={selected ? () => setExpanded((v) => !v) : activate}
        label={selected ? `${name} — post types` : `Activate ${name} for this campaign`}
        expanded={selected ? expanded : undefined}
      >
        <div className="flex-1 min-w-0">
          <AccountLabel
            row={row}
            selectedCount={selected ? postTypes.length : undefined}
            open={open}
          />
        </div>
        {/* Not a nested button in either state: the row is the control, and a
            second tab stop that does exactly what the row does would be one
            more thing for a keyboard user to step past. Colour is the whole of
            the hover feedback — the row keeps its background, so a pointer
            moving down the list doesn't set off a column of blocks. */}
        {/* Bolder and a couple of pixels larger than the plus it replaces: a
            caret is two strokes where a plus is a filled cross, so matching
            box sizes leaves it looking like the lighter of the two. */}
        {selected ? (
          <CaretDownIcon
            aria-hidden
            weight="bold"
            className={cn(
              'size-[18px] shrink-0 text-tertiary-foreground',
              'transition-[transform,color] duration-200 group-hover:text-primary-foreground',
              expanded && 'rotate-180',
            )}
          />
        ) : (
          <span
            aria-hidden
            className="flex shrink-0 items-center gap-2.5 text-tertiary-foreground transition-colors group-hover:text-primary-foreground"
          >
            {/* Literal caps, matching every other action label in the app. */}
            <span className="text-[13px]/4 font-medium">ACTIVATE</span>
            <PlusIcon className="size-4" weight="bold" />
          </span>
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
          open ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pb-2">
            {supersededBy.length > 0 && (
              <SupersedeOffer
                accounts={supersededBy}
                platform={info}
                onSupersede={onSupersede}
              />
            )}
            {/* An active row with every switch off publishes nothing, and
                nothing else on screen says so — the switches are all in their
                normal off state and the row looks targeted. Only while
                targeted: on the way out `postTypes` is the last state, which
                is not this. */}
            {selected && postTypes.length === 0 && (
              <p className="ml-3 mr-5 mb-2 border border-warning/40 px-3 py-2 text-sm text-warning">
                No post types selected — this{' '}
                {account ? 'account' : 'platform'} won’t publish anything.
              </p>
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
            {/* The last line of the same list, not a button parked under it:
                the label starts where the switch labels do and what it says
                sits where their switches do, so the column reads straight
                down. It ends what this account does for the campaign, which is
                why it comes after everything that account does.

                Two controls in this app take an account away from something,
                and they take it away from different things. Workspace
                Settings' Disconnect is a red plug icon that ends the
                connection for the whole tenant; this one is words only, and
                the line beside it names what it removes — a campaign's
                targeting comes back with one click, an OAuth grant does not.
                Literal caps, per the app's action-label convention. */}
            <div className="flex items-center justify-between gap-4 pl-16 pr-5 py-2">
              <Button
                type="button"
                variant="ghost"
                size="excluded"
                // Nothing to close by hand: dropping the entry closes the
                // region on its own, and reactivating opens it again.
                onClick={onDeactivate}
              >
                {account ? 'DEACTIVATE ACCOUNT' : 'DEACTIVATE PLATFORM'}
              </Button>
              <span className="text-right text-xs text-tertiary-foreground">
                {account
                  ? 'The account stays connected to the workspace.'
                  : 'Removes this platform from the campaign.'}
              </span>
            </div>
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
 *
 * Presented as a heading over ordinary account rows rather than as a notice:
 * the accounts are the point, and drawing them the way the card draws every
 * other account — round avatar, platform badge, name over platform — is what
 * says they are the same kind of thing as the rows above. No warning colour;
 * this is something the user has gained, not something wrong. A rule under it
 * keeps it from reading as the first two entries of the post-type list.
 */
function SupersedeOffer({
  accounts,
  platform,
  onSupersede,
}: {
  accounts: PublisherAccount[]
  platform: PlatformInfo
  onSupersede: (account: PublisherAccount) => void
}) {
  return (
    // The rule is drawn by the block's own bottom edge, inset to the content
    // it is separating rather than run to the card's edges — a full-bleed line
    // would cut the row in half instead of ending a section inside it.
    <div className="ml-16 mr-5 mb-2 border-b border-border pb-2">
      <GroupLabel>
        {accounts.length === 1 ? 'AVAILABLE ACCOUNT' : 'AVAILABLE ACCOUNTS'}
      </GroupLabel>
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between gap-3 py-1">
          <AccountIdentity account={account} platform={platform} />
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onSupersede(account)}
            aria-label={`Use ${accountLabel(account)} instead of the placeholder`}
          >
            {/* Literal caps, not `uppercase` — the caps are the copy. The
                glyph is a swap, which is what this does: the placeholder
                leaves as the account arrives, carrying its post types. */}
            <span>USE</span>
            <SwapIcon />
          </Button>
        </div>
      ))}
    </div>
  )
}

/**
 * The row's clickable shell — always pressable, whichever verb the row is
 * currently offering.
 *
 * `aria-expanded` is passed only by a targeted row, which is the only one that
 * has a region to open; on an untargeted row the same click activates, and
 * announcing it as collapsed would name the wrong action.
 */
function RowShell({
  onToggle,
  label,
  expanded,
  children,
}: {
  onToggle: () => void
  label: string
  expanded?: boolean
  children: ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-expanded={expanded}
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

/**
 * An offered account, drawn exactly as an account row draws itself: round
 * avatar with the platform badged on it, name over the platform's name.
 *
 * The badge repeats what the row it sits in already says, and it stays anyway —
 * the point of this block is that these are the same objects as the rows above,
 * and dropping a piece of the identity to save a repetition would make them
 * look like something lesser.
 *
 * No post-type count, which is the one thing an account row carries that this
 * doesn't: nothing has been decided about these yet.
 */
function AccountIdentity({
  account,
  platform,
}: {
  account: PublisherAccount
  platform: PlatformInfo
}) {
  const name = accountLabel(account)
  return (
    <div className="min-w-0 flex items-center gap-3">
      <AccountAvatar src={account.avatar_url} name={name} platform={platform} size="md" />
      <div className="min-w-0 flex flex-col">
        <span className="truncate text-base font-semibold text-primary-foreground">
          {name}
        </span>
        <span className="truncate text-xs text-tertiary-foreground">{platform.name}</span>
      </div>
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
  open = false,
}: {
  row: CampaignAccountRow
  selectedCount?: number
  /** Whether the row's own region is showing — some of this line is a pointer at it. */
  open?: boolean
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
  // Zero is not a count worth reporting neutrally — "0 of 4 post types" reads
  // as a setting, and it is a row that publishes nothing. The folded row has
  // to carry that on its own, since the warning inside is folded away with it.
  const counts = selected ? (
    selectedCount === 0 ? (
      <span className="text-warning">No post types selected</span>
    ) : (
      `${selectedCount} of ${view.allowed.length} post types`
    )
  ) : placeholder ? null : (
    `${view.allowed.length} post types available`
  )

  // Set in Workspace Settings, not here: this is the workspace's decision
  // showing through, so the campaign can see how its posts will go out without
  // having to leave the page to find out.
  const autoPublish = useAutoPublishState(view.platform.id)

  return (
    <div className="min-w-0 flex items-center gap-3">
      <span className="relative shrink-0">
        {placeholder ? (
          // Square where an account is round, and that is the whole of the
          // difference at a glance: a circle is somebody's face, a tile is a
          // network.
          //
          // Monochrome, not the brand's colour: this row is a platform with
          // nobody behind it, and a full-colour logo would out-shout the
          // connected accounts above it — the rows that can actually publish.
          // Selection is the whole of what the tile encodes, so it darkens
          // and the mark turns white; hover only moves the unselected tile,
          // because a selected one has nowhere left to go.
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded-lg transition-colors',
              selected
                ? 'bg-secondary-foreground'
                : 'bg-platform-tile group-hover:bg-platform-tile-hover',
            )}
          >
            <Icon
              className={cn(
                'size-7',
                selected ? 'text-primary' : 'text-platform-tile-foreground',
              )}
              weight="fill"
            />
          </span>
        ) : (
          // The badge is full colour whether or not the campaign targets this
          // account — which platform a face belongs to is identity, not
          // selection.
          <AccountAvatar src={account.avatar_url} name={name} platform={info} size="md" />
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
                {row.supersededBy.length > 0 ? (
                  // The offer that says this is inside the row, and the row
                  // folds — so the line has to carry it, or a collapsed
                  // placeholder would go on claiming nothing is connected
                  // while an account sits waiting one click away. Once the row
                  // is open the accounts are on screen with a button each, and
                  // the directions come off: nothing ages worse than being
                  // told to open something you are looking inside.
                  <span className="text-warning">
                    {row.supersededBy.length === 1
                      ? 'Account available'
                      : 'Accounts available'}
                    {!open &&
                      ` — open the row to use ${row.supersededBy.length === 1 ? 'it' : 'one'}`}
                    .
                  </span>
                ) : (
                  <>
                    <span className="text-warning">No account connected.</span>{' '}
                    <ConnectLink platformName={info.name} />
                  </>
                )}
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
        'flex items-center justify-between gap-3 pl-16 pr-5 py-2',
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
