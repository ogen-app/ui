import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BookmarkSimpleIcon,
  CaretDownIcon,
  FunnelSimpleIcon,
  PlusIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import { cn } from '@/lib'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { formatDate } from '@/lib/intl'
import { CAMPAIGNS } from './fixtures'
import {
  ASSETS,
  SHELF_TOTALS,
  WAITING,
  type HarnessAsset,
} from './-assetFixtures'
import {
  Arrange,
  BandHead,
  Pill,
  ROW_GRID,
  ROW_GRID_CAMPAIGN,
  ViewsMenu,
} from './-shared'

/**
 * The Assets list on the Ideas rules: the same strips, the same card, the
 * same two sizes and 4px rhythm, the same selection. What differs is only
 * what fills the slots —
 *
 * - **Tabs** are the two shelves (Knowledge, Media), with the only counts.
 * - **The mark** is the kind, or the picture, or what is happening to the
 *   file (uploading, reading, failed) — one 20px thing on the title line.
 * - **The line under** says what the file is and when it came, then at most
 *   one fact about where it stands.
 * - **The right column** is its ideas: how many are waiting, and nothing when
 *   none are. The verdict pill, the next idea and the tags move into the
 *   opened card.
 */

type Shelf = 'knowledge' | 'media'
const SHELVES: { key: Shelf; label: string }[] = [
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'media', label: 'Media' },
]

const TODAY = '2026-11-19'
const bandOf = (iso: string) => {
  const days = (Date.parse(TODAY) - Date.parse(iso)) / 86_400_000
  return days < 1 ? 'Today' : days <= 7 ? 'Past week' : 'Earlier'
}

export function AssetsList({
  scope,
  filtered,
  setFiltered,
  grouped,
  setGrouped,
}: {
  scope: 'workspace' | 'campaign'
  filtered: boolean
  setFiltered: (v: boolean) => void
  grouped: boolean
  setGrouped: (v: boolean) => void
}) {
  const [shelf, setShelf] = useState<Shelf>('knowledge')
  const [view, setView] = useState<string | null>(null)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const anchor = useRef<string | null>(null)

  const showCampaign = scope === 'workspace'
  const clear = () => {
    setTicked(new Set())
    setAllMatching(false)
  }

  const rows = useMemo(
    () =>
      ASSETS.filter((a) => a.shelf === shelf)
        .filter(
          (a) =>
            scope === 'workspace' ||
            a.campaigns.some((c) => c.id === CAMPAIGNS.russie.id),
        )
        .filter(
          (a) =>
            !filtered || a.campaigns.some((c) => c.id === CAMPAIGNS.russie.id),
        ),
    [shelf, scope, filtered],
  )
  const total = SHELF_TOTALS[shelf]
  // An upload in flight is a card, but not yet something to select.
  const selectable = rows.filter((r) => r.state !== 'uploading')

  const onPage = selectable.filter((r) => ticked.has(r.id)).length
  const elsewhere = ticked.size - onPage
  const pageAll = selectable.length > 0 && onPage === selectable.length
  const selecting = ticked.size > 0 || allMatching
  const headState: boolean | 'indeterminate' =
    allMatching || pageAll ? true : selecting ? 'indeterminate' : false

  const toggleRow = (id: string, shift: boolean) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const on = !prev.has(id)
      if (shift && anchor.current) {
        const a = selectable.findIndex((r) => r.id === anchor.current)
        const b = selectable.findIndex((r) => r.id === id)
        if (a >= 0 && b >= 0) {
          for (const r of selectable.slice(Math.min(a, b), Math.max(a, b) + 1))
            if (on) next.add(r.id)
            else next.delete(r.id)
          return next
        }
      }
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    anchor.current = id
  }
  const toggleBand = (rs: HarnessAsset[]) => {
    const next = allMatching
      ? new Set(selectable.map((r) => r.id))
      : new Set(ticked)
    const mine = rs.filter((r) => r.state !== 'uploading')
    const all = mine.every((r) => next.has(r.id))
    for (const r of mine)
      if (all) next.delete(r.id)
      else next.add(r.id)
    setAllMatching(false)
    setTicked(next)
  }
  const toggleHead = () => {
    if (selecting) return clear()
    setTicked(new Set(selectable.map((r) => r.id)))
  }

  const bands = useMemo(() => {
    if (!grouped) return [{ key: 'all', label: null as string | null, rows }]
    const map = new Map<string, HarnessAsset[]>()
    for (const r of rows) {
      const key = bandOf(r.addedAt)
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return [...map].map(([key, rs]) => ({ key, label: key, rows: rs }))
  }, [grouped, rows])

  return (
    <>
      <header className="flex h-20 items-center gap-3">
        <h1 className="text-xl/7 font-medium">Assets</h1>
        <Button className="ml-auto" size="sm">
          <PlusIcon className="size-4" />
          Add content
          <CaretDownIcon className="size-3" />
        </Button>
      </header>

      {/* The two shelves, with the only counts, and Views and Filter. */}
      <div className="flex items-end border-b border-quaternary">
        {SHELVES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => {
              setShelf(s.key)
              setOpenId(null)
            }}
            aria-current={shelf === s.key}
            className={cn(
              '-mb-px flex h-10 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm/5 outline-none first:pl-0 focus-visible:underline',
              shelf === s.key
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-secondary-foreground hover:text-foreground',
            )}
          >
            {s.label}
            <span className="font-normal text-secondary-foreground tabular-nums">
              {SHELF_TOTALS[s.key]}
            </span>
          </button>
        ))}
        <ViewsMenu
          view={view}
          filtered={filtered}
          onPick={(v) => {
            setView(v)
            setFiltered(true)
            clear()
          }}
        />
        <button
          type="button"
          onClick={() => {
            setFiltered(!filtered)
            setView(null)
            clear()
          }}
          className="mb-2 ml-4 flex h-6 cursor-pointer items-center gap-1.5 text-sm/5 text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
        >
          <FunnelSimpleIcon className="size-4" />
          Filter
          {filtered && (
            <span className="font-medium text-foreground tabular-nums">2</span>
          )}
        </button>
      </div>

      {filtered && (
        <div className="flex h-12 items-center gap-2">
          {view && (
            <span className="mr-1 flex items-center gap-1.5 text-xs/4 font-medium">
              <BookmarkSimpleIcon className="size-3" weight="fill" />
              {view}
            </span>
          )}
          <Pill
            field="Type"
            value="PDFs and documents"
            onRemove={() => setFiltered(false)}
          />
          <Pill
            field="Campaign"
            value={CAMPAIGNS.russie.name}
            onRemove={() => setFiltered(false)}
          />
          <button
            type="button"
            className="flex h-6 cursor-pointer items-center gap-1 px-1 text-xs/4 text-secondary-foreground hover:text-foreground"
          >
            <PlusIcon className="size-3" />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setFiltered(false)
              setView(null)
              clear()
            }}
            className="ml-auto cursor-pointer text-xs/4 text-secondary-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* The list's head: the box, then the selection — or, with nothing
          ticked, the shelf's waiting ideas and how the list is arranged. */}
      <div
        className={cn(
          ROW_GRID,
          'sticky top-0 z-10 h-12 items-center border-transparent bg-primary',
          showCampaign && ROW_GRID_CAMPAIGN,
        )}
      >
        <Checkbox
          checked={headState}
          disabled={selectable.length === 0}
          onCheckedChange={toggleHead}
          aria-label={
            headState === false
              ? 'Select the assets on this page'
              : 'Clear the selection'
          }
          className="size-4"
        />
        {!selecting ? (
          <div className="col-span-full col-start-2 flex items-center gap-5 text-xs/4">
            {shelf === 'knowledge' && (
              <button
                type="button"
                className="cursor-pointer text-secondary-foreground hover:text-foreground"
              >
                <span className="font-medium text-foreground tabular-nums">
                  {WAITING.ideas} ideas
                </span>{' '}
                from {WAITING.documents} documents are waiting →
              </button>
            )}
            <span className="ml-auto" />
            <Arrange
              label="Group"
              value={grouped ? 'Date added' : 'None'}
              onClick={() => setGrouped(!grouped)}
            />
            <Arrange label="Sort" value="Newest" />
          </div>
        ) : (
          <div className="col-span-full col-start-2 flex min-w-0 items-center gap-3 text-sm/5">
            <span className="font-medium tabular-nums">
              {allMatching
                ? `All ${total} selected`
                : `${ticked.size} selected`}
            </span>
            {allMatching && (
              <button
                type="button"
                onClick={clear}
                className="cursor-pointer text-secondary-foreground hover:text-foreground hover:underline"
              >
                Clear selection
              </button>
            )}
            {!allMatching && elsewhere > 0 && (
              <span className="text-secondary-foreground">
                {elsewhere} on the other shelf
              </span>
            )}
            {!allMatching && pageAll && total > selectable.length && (
              <button
                type="button"
                onClick={() => setAllMatching(true)}
                className="cursor-pointer font-medium text-accent hover:underline"
              >
                Select all {total} in{' '}
                {SHELVES.find((s) => s.key === shelf)!.label}
              </button>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm">
                Tag…
              </Button>
              <Button variant="ghost" size="sm">
                Add to campaign…
              </Button>
              <Button variant="ghost" size="sm" onClick={clear}>
                DELETE
              </Button>
            </div>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-sm/5 text-secondary-foreground">
          Nothing on this shelf.
        </p>
      ) : (
        bands.map((band) => (
          <section key={band.key}>
            {band.label && (
              <BandHead
                label={band.label}
                count={band.rows.length}
                ticked={
                  allMatching
                    ? band.rows.length
                    : band.rows.filter((r) => ticked.has(r.id)).length
                }
                selecting={selecting}
                showCampaign={showCampaign}
                onToggle={() => toggleBand(band.rows)}
              />
            )}
            <ul className="flex flex-col gap-1">
              {band.rows.map((asset) => (
                <AssetRow
                  key={asset.id}
                  asset={asset}
                  showCampaign={showCampaign}
                  open={openId === asset.id}
                  onOpen={() =>
                    setOpenId((o) => (o === asset.id ? null : asset.id))
                  }
                  selected={allMatching || ticked.has(asset.id)}
                  selecting={selecting}
                  onTick={(shift) => toggleRow(asset.id, shift)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}

function AssetRow({
  asset,
  showCampaign,
  open,
  onOpen,
  selected,
  selecting,
  onTick,
}: {
  asset: HarnessAsset
  showCampaign: boolean
  open: boolean
  onOpen: () => void
  selected: boolean
  selecting: boolean
  onTick: (shift: boolean) => void
}) {
  const busy = asset.state === 'uploading' || asset.state === 'reading'
  const muted = busy || asset.state === 'failed'
  return (
    <li
      onClick={asset.state === 'uploading' ? undefined : onOpen}
      className={cn(
        ROW_GRID,
        showCampaign && ROW_GRID_CAMPAIGN,
        'group rounded-md py-4',
        asset.state !== 'uploading' && 'cursor-pointer',
        selected
          ? 'border-accent/40 bg-accent/5'
          : 'border-quaternary bg-primary hover:bg-secondary',
        open && !selected && 'bg-secondary',
      )}
    >
      <span
        className="flex h-5 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {asset.state !== 'uploading' && (
          <Checkbox
            checked={selected}
            onClick={(e) => {
              e.preventDefault()
              onTick(e.shiftKey)
            }}
            aria-label={`Select “${asset.title}”`}
            className={cn(
              'size-4 transition-opacity',
              !selected && !selecting && 'opacity-40 group-hover:opacity-100',
            )}
          />
        )}
      </span>

      <AssetMark asset={asset} />

      <div className="min-w-0">
        <h3
          className={cn(
            'text-sm/5 font-medium break-words',
            muted && 'text-secondary-foreground',
            !open && 'line-clamp-2',
          )}
        >
          {asset.title}
        </h3>
        {asset.gist && !muted && (
          <p
            className={cn(
              'mt-1 text-sm/5 text-secondary-foreground',
              !open && 'line-clamp-2',
            )}
          >
            {asset.gist}
          </p>
        )}
        <AssetDetails asset={asset} open={open} />
        {open && <Opened asset={asset} />}
      </div>

      {showCampaign && (
        <span className="flex h-5 min-w-0 items-center gap-2 text-xs/4 text-secondary-foreground">
          {asset.campaigns[0] && (
            <>
              <CampaignIcon
                abbr={identityAbbr(asset.campaigns[0].name)}
                color={identityColorVar(asset.campaigns[0].id)}
                className="size-4"
              />
              <span className="truncate">{asset.campaigns[0].name}</span>
              {asset.campaigns.length > 1 && (
                <span className="shrink-0 tabular-nums">
                  +{asset.campaigns.length - 1}
                </span>
              )}
            </>
          )}
        </span>
      )}

      <span
        className="flex h-5 w-[76px] items-center justify-end text-xs/4"
        onClick={(e) => e.stopPropagation()}
      >
        <IdeasCount asset={asset} />
      </span>
    </li>
  )
}

/**
 * The 20px mark: what is happening to the file while something is, and
 * otherwise what it is — the kind's icon, or the picture itself.
 */
function AssetMark({ asset }: { asset: HarnessAsset }) {
  const box = 'flex size-5 items-center justify-center self-start'
  if (asset.state === 'uploading')
    return (
      <span
        role="img"
        aria-label={`Uploading, ${asset.progress}%`}
        className={box}
      >
        <Ring value={asset.progress ?? 0} />
      </span>
    )
  if (asset.state === 'reading')
    return (
      <span role="img" aria-label="Reading" className={box}>
        <Ring value={25} spinning />
      </span>
    )
  if (asset.state === 'failed')
    return (
      <span role="img" aria-label="Couldn’t read" className={box}>
        <WarningCircleIcon className="size-5 text-destructive" />
      </span>
    )
  if (asset.kind === 'image')
    return (
      <span
        role="img"
        aria-label="Picture"
        className={cn(box, 'rounded-sm')}
        style={{
          background: `linear-gradient(135deg, ${identityColorVar(asset.id)}, color-mix(in oklch, ${identityColorVar(asset.id)} 40%, var(--primary)))`,
        }}
      />
    )
  return (
    <span className={box}>
      <HugeiconsIcon
        icon={KIND_ICON[asset.kind]}
        size={20}
        strokeWidth={1.5}
        aria-hidden
        className={KIND_TONE[asset.kind] ?? 'text-secondary-foreground'}
      />
    </span>
  )
}

/** The fit ring's geometry, in the accent: progress, or a spinner. */
function Ring({ value, spinning }: { value: number; spinning?: boolean }) {
  const r = 8.5
  const c = 2 * Math.PI * r
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn('size-5 -rotate-90', spinning && 'animate-spin')}
      aria-hidden
    >
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="3"
        className="stroke-quaternary"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap={spinning ? 'round' : undefined}
        className="stroke-accent"
        strokeDasharray={`${(c * value) / 100} ${c}`}
      />
    </svg>
  )
}

/**
 * The line under: what the file is, when it came, then at most one fact
 * about where it stands — the one that asks for something first.
 */
function AssetDetails({ asset, open }: { asset: HarnessAsset; open: boolean }) {
  const { i18n } = useTranslation()
  const day =
    formatDate(
      asset.addedAt,
      { day: 'numeric', month: 'short' },
      i18n.language,
    ) ?? ''

  const standing: ReactNode[] = []
  if (asset.state === 'uploading')
    standing.push(
      <span className="text-foreground tabular-nums">
        Uploading, {asset.progress}%
      </span>,
    )
  if (asset.state === 'reading')
    standing.push(<span className="text-foreground">Reading it…</span>)
  if (asset.state === 'failed')
    standing.push(<span className="text-destructive">Couldn’t read it</span>)
  if (asset.state === 'noIdeas')
    standing.push(<span>No ideas came out of it</span>)
  if (asset.partial) standing.push(<span>Partly read</span>)

  const bits: ReactNode[] = [
    <span className="shrink-0 tabular-nums">{asset.facts}</span>,
    ...(asset.state === 'uploading'
      ? []
      : [<span className="shrink-0">Added {day}</span>]),
    ...(open ? standing : standing.slice(0, 1)),
  ]
  return (
    <div
      className={cn(
        'mt-2 flex min-w-0 items-center gap-1.5 text-xs/4 text-secondary-foreground',
        open && 'flex-wrap',
      )}
    >
      {bits.map((bit, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden>·</span>}
          {bit}
        </span>
      ))}
    </div>
  )
}

/**
 * What the opened card adds, each on its own 12px line on the 4px rhythm:
 * the why and the fix for a failure or a cut-short reading, the ideas'
 * tally and the next one waiting, every campaign, and the tags.
 */
function Opened({ asset }: { asset: HarnessAsset }) {
  const lines: ReactNode[] = []
  if (asset.failure)
    lines.push(
      <>
        {asset.failure} <LinkText>Upload it again</LinkText>
      </>,
    )
  if (asset.partial)
    lines.push(
      <>
        {asset.partial} — the rest was past the limit.{' '}
        <LinkText>Read the rest</LinkText>
      </>,
    )
  if (asset.state === 'noIdeas')
    lines.push(<LinkText>Analyse it again</LinkText>)
  if (asset.ideas) {
    const { waiting, yes, later, no } = asset.ideas
    const parts = [
      waiting && `${waiting} waiting`,
      yes && `${yes} yes`,
      later && `${later} later`,
      no && `${no} no`,
    ].filter(Boolean)
    lines.push(<>Ideas: {parts.join(' · ')}</>)
  }
  if (asset.nextIdea)
    lines.push(
      <>
        Next: <span className="text-foreground">{asset.nextIdea}</span>
      </>,
    )
  if (asset.campaigns.length > 1)
    lines.push(<>In {asset.campaigns.map((c) => c.name).join(', ')}</>)
  if (asset.tags.length)
    lines.push(
      <span className="flex gap-1">
        {asset.tags.map((t) => (
          <span key={t} className="rounded-button bg-tertiary px-1.5">
            {t}
          </span>
        ))}
      </span>,
    )
  if (!lines.length) return null
  return (
    <div className="mt-2 flex flex-col gap-1 text-xs/4 text-secondary-foreground">
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  )
}

function LinkText({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      className="cursor-pointer font-medium text-foreground hover:underline"
    >
      {children}
    </button>
  )
}

/**
 * The right-hand slot, where an idea has its answers: the asset's waiting
 * ideas, which open the Ideas list on this document. Nothing when none wait.
 */
function IdeasCount({ asset }: { asset: HarnessAsset }) {
  const waiting = asset.ideas?.waiting ?? 0
  if (!waiting) return null
  return (
    <button
      type="button"
      className="cursor-pointer font-medium tabular-nums hover:underline"
    >
      {waiting} {waiting === 1 ? 'idea' : 'ideas'} →
    </button>
  )
}
