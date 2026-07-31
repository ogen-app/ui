import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
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
        const selected = selectedById.get(view.platform.id)
        return selected ? (
          <SelectedPlatformBlock
            key={view.platform.id}
            view={view}
            selectedPostTypes={selected.post_types}
            onTogglePostType={(slug) =>
              onChange(togglePostType(value, view.platform.id, slug))
            }
            onUnselect={() =>
              onCommitPlatforms(removePlatform(value, view.platform.id))
            }
          />
        ) : (
          <UnselectedPlatformRow
            key={view.platform.id}
            view={view}
            onAdd={() =>
              onCommitPlatforms(
                addPlatform(
                  value,
                  view.platform.id,
                  // Everything the expanded block will render starts switched
                  // on — `allowed`, not `available`, so a platform that is not
                  // connected yet still arrives fully targeted rather than as
                  // a row of dormant switches.
                  view.allowed.map((pt) => pt.slug),
                ),
              )
            }
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

  if (value.length === 0) {
    return (
      <p className="text-sm text-warning">
        No platforms selected — this campaign has nowhere to publish.
      </p>
    )
  }

  return (
    <p className="text-sm text-tertiary-foreground">
      {value.length} platform{value.length === 1 ? '' : 's'} added with {postTypes} post
      type{postTypes === 1 ? '' : 's'}.
    </p>
  )
}

function UnselectedPlatformRow({ view, onAdd }: { view: PlatformView; onAdd: () => void }) {
  return (
    <RowShell onToggle={onAdd} label={`Add ${view.info.name} to the campaign`}>
      <PlatformLabel view={view} />
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={stopRowClick}
      >
        {!isConnected(view) && <ConnectLink platformName={view.info.name} />}
        <Button
          type="button"
          variant="ghost"
          size="smIcon"
          onClick={onAdd}
          aria-label={`Add ${view.info.name}`}
          title={`Add ${view.info.name}`}
          className="group-hover:bg-primary group-hover:text-primary-foreground"
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </RowShell>
  )
}

const ROW = 'group flex items-center justify-between gap-3 px-3 py-3 bg-secondary'

/**
 * The platform row. Adding and removing are deliberately asymmetric: the whole
 * row adds a platform, but only the × removes one.
 *
 * They are not equally recoverable. A stray click that adds a platform costs
 * one click to undo; a stray click that removes one throws away its post-type
 * selection, and both halves persist immediately (`onCommitPlatforms`). So the
 * big target is the safe direction, and the destructive one asks for the small
 * button. A selected row is therefore inert — `onToggle` is omitted and it
 * renders as a plain container.
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
        // Only the row's own keys: Enter/Space on a nested control (×, +,
        // CONNECT, Customise) bubbles here too, and must not also toggle.
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

/** Sends the user to Workspace Settings, where accounts are actually linked. */
function ConnectLink({ platformName }: { platformName: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="uppercase">
      <Link to="/workspace-settings" aria-label={`Connect ${platformName}`}>
        Connect
      </Link>
    </Button>
  )
}

function PlatformLabel({
  view,
  selectedCount,
  open,
  onCustomise,
}: {
  view: PlatformView
  selectedCount?: number
  /** Present only when the post-type list can be opened. */
  open?: boolean
  onCustomise?: () => void
}) {
  const { info } = view
  const Icon = info.icon
  // Only the selected block passes a count, so this doubles as "is targeted".
  const selected = selectedCount !== undefined
  const connected = isConnected(view)

  // Denominator is `allowed`, not `available` — those are the rows the
  // expanded block actually renders, connected or not.
  const counts = selected
    ? `${selectedCount} of ${view.allowed.length} post types`
    : connected
      ? `${view.available.length} post types available`
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
      <Icon
        className={cn(
          'size-10 shrink-0 transition-[filter]',
          !selected && 'grayscale group-hover:grayscale-0',
        )}
        weight="fill"
        style={{ color: info.color }}
      />
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
          {onCustomise && (
            <>
              {counts && ' · '}
              {/* Opens the post-type list. This replaces a caret so the row's
                  right edge holds only X / + / Connect, aligned across rows. */}
              <button
                type="button"
                onClick={(e) => {
                  stopRowClick(e)
                  onCustomise()
                }}
                aria-expanded={open}
                className="underline underline-offset-2 cursor-pointer hover:text-foreground"
              >
                Customise
              </button>
            </>
          )}
          {!connected && (
            <>
              {(counts || onCustomise) && ' · '}
              {/* Targeting a platform the workspace can't publish to is a
                  real problem, so it escalates from grey to a warning. */}
              <span className={cn(selected && 'text-warning')}>
                Not connected to the current workspace.
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

type SelectedBlockProps = {
  view: PlatformView
  selectedPostTypes: string[]
  onTogglePostType: (slug: string) => void
  onUnselect: () => void
}

function SelectedPlatformBlock({
  view,
  selectedPostTypes,
  onTogglePostType,
  onUnselect,
}: SelectedBlockProps) {
  const [open, setOpen] = useState(false)
  const { info, available, unavailable } = view

  const toggleOpen = () => setOpen((o) => !o)

  return (
    <div className="flex flex-col bg-secondary">
      {/* No row-level toggle: removing is the × alone. */}
      <RowShell>
        <div className="flex-1 min-w-0">
          <PlatformLabel
            view={view}
            selectedCount={selectedPostTypes.length}
            open={open}
            onCustomise={toggleOpen}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={stopRowClick}>
          {!isConnected(view) && <ConnectLink platformName={info.name} />}
          <Button
            type="button"
            variant="ghost"
            size="smIcon"
            onClick={onUnselect}
            aria-label={`Unselect ${info.name}`}
            title={`Unselect ${info.name}`}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </RowShell>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col pb-2">
            {available.map((pt) => (
              <PostTypeSwitchRow
                key={pt.slug}
                label={pt.label}
                ariaLabel={`${info.name} — ${pt.label}`}
                checked={selectedPostTypes.includes(pt.slug)}
                onToggle={() => onTogglePostType(pt.slug)}
              />
            ))}
            {unavailable.map((pt) => (
              <PostTypeSwitchRow
                key={pt.slug}
                label={pt.label}
                ariaLabel={`${info.name} — ${pt.label}`}
                checked={selectedPostTypes.includes(pt.slug)}
                onToggle={() => onTogglePostType(pt.slug)}
                muted
              />
            ))}
          </div>
        </div>
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
