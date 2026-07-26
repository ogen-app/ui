import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { cn } from '@/lib'
import { usePlatformViews } from '@/hooks/usePlatforms'
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
                  view.available.map((pt) => pt.slug),
                ),
              )
            }
          />
        )
      })}
    </div>
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
        >
          <PlusIcon className="size-4" />
        </Button>
      </div>
    </RowShell>
  )
}

/**
 * The clickable platform row. The whole area toggles the platform in and out
 * of the campaign; anything that means something else (Connect, Customise,
 * the explicit +/× buttons) stops the click from reaching here.
 */
function RowShell({
  onToggle,
  label,
  children,
}: {
  onToggle: () => void
  label: string
  children: ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        onToggle()
      }}
      className="flex items-center justify-between gap-3 px-3 py-2.5 bg-secondary cursor-pointer
        transition-colors hover:bg-quaternary focus-visible:outline-2 focus-visible:outline-ring"
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

  return (
    <div className="min-w-0 flex items-center gap-2.5">
      {/* Brand colour marks what the campaign targets: a platform stays
          desaturated until it is added, and lights up on "+". */}
      <Icon
        className={cn('size-10 shrink-0', !selected && 'grayscale opacity-50')}
        weight="fill"
        style={{ color: info.color }}
      />
      <div className="min-w-0 flex flex-col">
        <span className="text-base font-semibold text-foreground">
          {info.name}
        </span>
        <span className="text-xs text-tertiary-foreground truncate">
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
      <RowShell
        onToggle={onUnselect}
        label={`Remove ${info.name} from the campaign`}
      >
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
        'flex items-center justify-between gap-3 px-3 py-2 cursor-pointer select-none hover:bg-secondary/60',
        muted && 'opacity-60',
      )}
    >
      <span className="text-sm text-foreground">{label}</span>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        aria-label={ariaLabel}
      />
    </label>
  )
}
