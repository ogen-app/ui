import type { ReactNode } from 'react'
import { BookmarkSimpleIcon, CaretDownIcon, XIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib'

/**
 * The parts the Ideas and Assets lists share in this harness: the row grid,
 * the group head, the strips' controls, and the harness's own chrome.
 */

/**
 * The row's columns: box, mark, the words, (the campaign), the answer. The
 * head uses the same template, so its box sits over the rows' boxes by
 * construction rather than by matching padding. Every user of the grid
 * carries the card's 1px border — transparent on the head and the group
 * heads — so the columns line up to the pixel.
 */
export const ROW_GRID =
  'grid grid-cols-[16px_20px_minmax(0,1fr)_auto] gap-x-4 border px-4'
export const ROW_GRID_CAMPAIGN =
  'grid-cols-[16px_20px_minmax(0,1fr)_minmax(0,13rem)_auto]'

/**
 * A group's head, on the rows' grid: its own box over theirs, which ticks the
 * group — a subset of the page — then the group's name and count.
 */
export function BandHead({
  label,
  count,
  ticked,
  selecting,
  showCampaign,
  onToggle,
}: {
  label: string
  count: number
  ticked: number
  selecting: boolean
  showCampaign: boolean
  onToggle: () => void
}) {
  const state: boolean | 'indeterminate' =
    ticked === 0 ? false : ticked === count ? true : 'indeterminate'
  return (
    <div
      className={cn(
        ROW_GRID,
        showCampaign && ROW_GRID_CAMPAIGN,
        'group h-12 items-end border-transparent pb-2',
      )}
    >
      <Checkbox
        checked={state}
        onCheckedChange={onToggle}
        aria-label={`Select everything in ${label}`}
        className={cn(
          'size-4 transition-opacity',
          state === false && !selecting && 'opacity-40 group-hover:opacity-100',
        )}
      />
      <div className="col-span-full col-start-2 flex min-w-0 items-center gap-2 text-xs/4">
        <span className="truncate font-medium">{label}</span>
        <span className="text-secondary-foreground tabular-nums">{count}</span>
      </div>
    </div>
  )
}

/**
 * Smart groups are saved filters, so they sit with Filter rather than beside
 * the page's name: picking one fills the pills row, which then leads with the
 * view's name. With none picked there is nothing to name — no "All ideas".
 */
export function ViewsMenu({
  view,
  filtered,
  onPick,
}: {
  view: string | null
  filtered: boolean
  onPick: (v: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="mb-2 ml-auto flex h-6 cursor-pointer items-center gap-1.5 text-sm/5 text-secondary-foreground outline-none hover:text-foreground focus-visible:underline">
        <BookmarkSimpleIcon className="size-4" />
        Views
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4} className="w-56">
        <DropdownMenuRadioGroup value={view ?? ''} onValueChange={onPick}>
          {['Strong fits this month', 'From the brochure'].map((v) => (
            <DropdownMenuRadioItem key={v} value={v}>
              {v}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!filtered || view !== null}>
          Save this filter…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------------------ */

export function Arrange({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer items-center gap-1 text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
    >
      {label}
      <span className="font-medium text-foreground">{value}</span>
      <CaretDownIcon className="size-3" />
    </button>
  )
}

export function Pill({
  field,
  value,
  onRemove,
}: {
  field: string
  value: string
  onRemove: () => void
}) {
  return (
    <span className="flex h-6 items-center gap-1 rounded-button bg-secondary pr-1 pl-2 text-xs/4">
      <span className="text-secondary-foreground">{field}</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${field}`}
        className="flex size-4 cursor-pointer items-center justify-center text-secondary-foreground hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </span>
  )
}

/** Lines every 4px, to check the rhythm by eye. */
export function BaselineGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, color-mix(in oklab, var(--accent) 14%, transparent) 0 1px, transparent 1px 4px)',
      }}
    />
  )
}

export function HarnessBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-dashed border-quaternary bg-secondary px-8 py-2 text-xs/4">
      <span className="font-medium">design/ideas-cards</span>
      {children}
    </div>
  )
}

export function Toggle({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <Checkbox checked={on} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  )
}

export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <span className="flex items-center gap-2">
      {label}
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'cursor-pointer',
            v === value ? 'font-medium underline' : 'text-secondary-foreground',
          )}
        >
          {text}
        </button>
      ))}
    </span>
  )
}
