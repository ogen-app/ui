import { useMemo, useRef, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CheckCircleIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { usePlatformViews } from '@/hooks/usePlatforms'
import { useAutoPublishState } from '@/hooks/useAutoPublishAllowlist'
import type { PlatformView } from '@/lib/platformDictionary'
import type { CampaignPlatform } from '@/types/campaigns'

type Props = {
  value: CampaignPlatform[]
  onChange: (next: CampaignPlatform[]) => void
  /**
   * Adding or removing a platform persists straight away instead of waiting
   * for the header Save — it reads as a toggle, not as an edit.
   */
  onCommitPlatforms: (next: CampaignPlatform[]) => void
}

/** Keeps a nested control from also triggering the row's add/remove. */
function stopRowClick(e: { stopPropagation: () => void }) {
  e.stopPropagation()
}

function addPlatform(
  current: CampaignPlatform[],
  platformId: string,
  defaultSlugs: string[],
): CampaignPlatform[] {
  if (current.some((p) => p.id === platformId)) return current
  return [...current, { id: platformId, post_types: defaultSlugs }]
}

function removePlatform(
  current: CampaignPlatform[],
  platformId: string,
): CampaignPlatform[] {
  return current.filter((p) => p.id !== platformId)
}

function togglePostType(
  current: CampaignPlatform[],
  platformId: string,
  slug: string,
): CampaignPlatform[] {
  return current.map((p) => {
    if (p.id !== platformId) return p
    const has = p.post_types.includes(slug)
    return {
      ...p,
      post_types: has ? p.post_types.filter((s) => s !== slug) : [...p.post_types, slug],
    }
  })
}

export function PlatformsControl({ value, onChange, onCommitPlatforms }: Props) {
  const views = usePlatformViews()
  const selectedById = useMemo(
    () => new Map(value.map((p) => [p.id, p])),
    [value],
  )

  if (views.length === 0) {
    return (
      <span className="text-xs text-tertiary-foreground">No platforms available</span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <PlatformsSummary value={value} />
      {views.map((view) => {
        const deactivate = () =>
          onCommitPlatforms(removePlatform(value, view.platform.id))
        return (
          <PlatformRow
            key={view.platform.id}
            view={view}
            selection={selectedById.get(view.platform.id)}
            onAdd={() =>
              onCommitPlatforms(
                addPlatform(
                  value,
                  view.platform.id,
                  // Everything the expanded region will render starts switched
                  // on — `allowed`, not `available`, so a platform that is not
                  // connected yet still arrives fully targeted rather than as
                  // a row of dormant switches.
                  view.allowed.map((pt) => pt.slug),
                ),
              )
            }
            onTogglePostType={(slug) => {
              const next = togglePostType(value, view.platform.id, slug)
              // Switching the last post type off leaves a platform that is
              // targeted but publishes nothing — a state the campaign has no
              // use for and no obvious way out of. Treat it as the same
              // intention as DEACTIVATE ALL, which also means it persists
              // straight away rather than waiting for the header Save.
              if (next.find((p) => p.id === view.platform.id)?.post_types.length === 0) {
                deactivate()
                return
              }
              onChange(next)
            }}
            onDeactivate={deactivate}
          />
        )
      })}
    </div>
  )
}

/**
 * What the campaign currently targets, in one line above the list.
 *
 * The list itself only says this by omission — every row looks similar and the
 * reader has to scan for coloured logos to work out whether anything is
 * selected at all. Targeting nothing is a dead campaign, so it reads as a
 * warning rather than as a neutral count, matching the dot on the card heading.
 */
function PlatformsSummary({ value }: { value: CampaignPlatform[] }) {
  const postTypes = value.reduce((n, p) => n + p.post_types.length, 0)

  // Stands off the list rather than sitting one gap above it: it summarises the
  // rows below, and at `gap-1` it read as a first row of its own.
  if (value.length === 0) {
    return (
      <p className="mb-3 text-sm text-warning">
        No platforms selected — this campaign has nowhere to publish.
      </p>
    )
  }

  return (
    <p className="mb-3 text-sm text-tertiary-foreground">
      {value.length} platform{value.length === 1 ? '' : 's'} added with {postTypes} post
      type{postTypes === 1 ? '' : 's'}.
    </p>
  )
}

type PlatformRowProps = {
  view: PlatformView
  /** The campaign's entry for this platform, or undefined when inactive. */
  selection: CampaignPlatform | undefined
  onAdd: () => void
  onTogglePostType: (slug: string) => void
  onDeactivate: () => void
}

/**
 * One platform, active or not.
 *
 * Both states are one component so the post-type region can be a height
 * transition rather than a mount: swapping components at this position would
 * unmount the region on deactivate, and an unmounted element cannot animate
 * out. It also means activation animates the region open in place instead of
 * the whole row blinking out and back with a taller one.
 *
 * There is no collapse control. Being expanded *is* how the list says a
 * platform is active, so a caret would let the row lie about its own state.
 * Activation is the only control, and it lives at both ends: the row itself on
 * the way in, DEACTIVATE ALL at the foot of the list on the way out.
 */
function PlatformRow({
  view,
  selection,
  onAdd,
  onTogglePostType,
  onDeactivate,
}: PlatformRowProps) {
  const { info, available, unavailable } = view
  const selected = selection !== undefined

  // Deactivating drops the platform from `value` on the same click that starts
  // the collapse, so the switches would flip off under the user while the
  // region is still closing. They keep their last state on the way out.
  const lastPostTypes = useRef<string[]>([])
  if (selection) lastPostTypes.current = selection.post_types
  const postTypes = selection?.post_types ?? lastPostTypes.current

  return (
    <div className="flex flex-col bg-secondary">
      {/* Clickable only while inactive. Adding is the safe direction — one
          click to undo — so it gets the whole row; leaving is DEACTIVATE ALL
          alone, at the far end of what it throws away. */}
      <RowShell
        onToggle={selected ? undefined : onAdd}
        label={`Add ${info.name} to the campaign`}
      >
        <div className="flex-1 min-w-0">
          <PlatformLabel
            view={view}
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
              aria-label={`Add ${info.name}`}
              title={`Add ${info.name}`}
              className="group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        )}
      </RowShell>
      {/* `grid-template-rows` rather than `height`: the post-type list has no
          height to name up front, and 0fr→1fr animates to whatever it turns out
          to be. The transition is skipped on first paint, so a campaign that
          loads with platforms already active renders them open rather than
          unrolling three lists at once.

          `visibility` rides along because a zero-height row still holds
          focusable switches — a keyboard user would tab into a list nobody can
          see. It is in the transition so it flips at the far end when hiding
          and immediately when showing, which is what keeps the switches on
          screen for the length of the collapse. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows,visibility] duration-200 ease-out',
          selected ? 'grid-rows-[1fr] visible' : 'grid-rows-[0fr] invisible',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pb-2">
            {[...available, ...unavailable].map((pt) => (
              <PostTypeSwitchRow
                key={pt.slug}
                label={pt.label}
                ariaLabel={`${info.name} — ${pt.label}`}
                checked={postTypes.includes(pt.slug)}
                onToggle={() => onTogglePostType(pt.slug)}
                muted={unavailable.includes(pt)}
              />
            ))}
            {/* Under the switches rather than up on the row: it is the end of
                what this platform does for the campaign, and the last switch
                off reaches the same place. `ml-13` is the button's own px-3
                backed out of the switch rows' pl-16, so the label starts on
                their left edge while the button stays the width of its text. */}
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

const ROW = 'group flex items-center justify-between gap-3 px-3 py-3 bg-secondary'

/**
 * The platform row. Only the unselected one is clickable as a whole: adding is
 * the safe direction — one click to undo — and it persists immediately
 * (`onCommitPlatforms`), so it gets the big target. A selected row is inert:
 * `onToggle` is omitted and it renders as a plain container, with the caret as
 * its only control.
 *
 * Hover leaves the row's fill alone — too loud at this size — and instead
 * warms the logo and lifts the + button. Both hang off `group`.
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
        // Only the row's own keys: Enter/Space on a nested control (+,
        // Connect) bubbles here too, and must not also toggle.
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

function isConnected(view: PlatformView): boolean {
  return view.connectedPublisherName !== null
}

/**
 * Sends the user to Workspace Settings, where accounts are actually linked.
 *
 * A text link in the subline rather than a button on the row's right edge: it
 * belongs to the sentence that explains the problem, and the right edge is
 * reserved for the one control that acts on this campaign (+ / caret). It only
 * appears on a platform the campaign already targets, where the missing
 * connection is not information but a campaign that cannot publish — so it
 * carries the warning colour of the sentence it follows.
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

function PlatformLabel({
  view,
  selectedCount,
}: {
  view: PlatformView
  selectedCount?: number
}) {
  const { info } = view
  const Icon = info.icon
  // Only the selected block passes a count, so this doubles as "is targeted".
  const selected = selectedCount !== undefined
  const connected = isConnected(view)
  const Mark = connected ? CheckCircleIcon : WarningCircleIcon

  // `allowed`, not `available`, on both sides: those are the rows the expanded
  // block actually renders, connected or not. An inactive platform with no
  // account gives up the count entirely — how many kinds of post it could take
  // is the wrong thing to answer when the workspace cannot reach it at all.
  const counts = selected
    ? `${selectedCount} of ${view.allowed.length} post types`
    : connected
      ? `${view.allowed.length} post types available`
      : null

  // Set in Workspace Settings, not here: this is the workspace's decision
  // showing through, so the campaign can see how its posts will go out
  // without having to leave the page to find out.
  const autoPublish = useAutoPublishState(view.platform.id)

  return (
    // The logo alone carries "not targeted yet". The text used to fade with
    // it, which read as disabled — an unselected platform is the one thing on
    // this row the user is most likely to want to click, so its name stays at
    // full strength.
    <div className="min-w-0 flex items-center gap-3">
      {/* Brand colour marks what the campaign targets: a platform stays
          desaturated until it is added, and lights up on "+". */}
      <span className="relative shrink-0">
        <Icon
          className={cn(
            'size-10 transition-[filter]',
            !selected && 'grayscale group-hover:grayscale-0',
          )}
          weight="fill"
          style={{ color: info.color }}
        />
        {/* Only on a platform the campaign targets, and then it always says
            something: green once the workspace can actually publish to it,
            orange while it cannot. That pairing is the one thing the row can't
            say with the logo alone — a targeted platform with no account looks
            identical from a distance — so the badge is the "ready" mark, not a
            second selection mark. The cut-out glyph reads in the row's own
            fill, hence the matching disc behind it. */}
        {selected && (
          <Mark
            weight="fill"
            aria-hidden
            className={cn(
              'absolute -right-0.5 -bottom-0.5 size-4 rounded-full bg-secondary',
              connected ? 'text-positive' : 'text-warning',
            )}
          />
        )}
      </span>
      <div className="min-w-0 flex flex-col">
        <span className="text-base font-semibold text-primary-foreground">
          {info.name}
        </span>
        <span className="text-xs text-tertiary-foreground truncate">
          {/* Ahead of the post-type count: whether Ogen posts on the user's
              behalf outranks how many kinds of post it may send. Held while
              `unknown` — "Manual publishing only" is not a sentence to write
              before asking. */}
          {selected && autoPublish !== 'unknown' && (
            <>
              {autoPublish === 'allowed'
                ? 'Auto-publishing allowed'
                : 'Manual publishing only'}
              {counts && ' · '}
            </>
          )}
          {counts}
          {/* The same fact in two registers. On a platform nobody has added it
              is grey and it is the whole line — the normal state of most of
              this list, stated and left alone. Once the campaign targets one,
              it turns into a campaign that cannot publish, so it escalates to
              the warning colour and carries the way out. */}
          {!connected &&
            (selected ? (
              <>
                {counts && ' · '}
                <span className="text-warning">Not connected to the workspace.</span>{' '}
                <ConnectLink platformName={info.name} />
              </>
            ) : (
              'Not connected to the workspace.'
            ))}
        </span>
      </div>
    </div>
  )
}

type PostTypeSwitchRowProps = {
  label: string
  ariaLabel: string
  checked: boolean
  onToggle: () => void
  muted?: boolean
}

function PostTypeSwitchRow({
  label,
  ariaLabel,
  checked,
  onToggle,
  muted = false,
}: PostTypeSwitchRowProps) {
  return (
    <label
      className={cn(
        // Left edge lines up with the platform name: row padding (12) +
        // logo (40) + gap (12).
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
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={ariaLabel}
      />
    </label>
  )
}
