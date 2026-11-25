import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  BookmarkSimpleIcon,
  FunnelSimpleIcon,
  PlusIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CampaignIcon } from '@/components/layout/CampaignIcon'
import { KIND_ICON } from '@/components/content/AssetKindMark'
import { KIND_TONE } from '@/components/content/kindTone'
import {
  HORIZON_KEYS,
  VERDICTS,
  VERDICT_ORDER,
} from '@/components/ideas/verdicts'
import { cn } from '@/lib'
import { fitPlace } from '@/lib/ideaFit'
import { identityAbbr, identityColorVar } from '@/lib/identity'
import { POSTPONE_HORIZONS, type IdeaVerdict } from '@/lib/ideas'
import { formatDate } from '@/lib/intl'
import { CAMPAIGNS, IDEAS, PILE_TOTALS, type HarnessIdea } from './fixtures'
import {
  Arrange,
  BandHead,
  BaselineGrid,
  Choice,
  HarnessBar,
  Pill,
  ROW_GRID,
  ROW_GRID_CAMPAIGN,
  Toggle,
  ViewsMenu,
} from './-shared'
import { AssetsList } from './-assets'

/**
 * The Ideas list, redrawn to three rules (design/ideas-cards):
 *
 * 1. **Two text sizes.** 14/20 for anything you read — titles, summaries,
 *    tabs, buttons — and 12/16 for anything you glance at — the line under a
 *    row, pills, bands, column values. The page title is the only exception.
 *    Two weights (regular, medium) and two greys (foreground, secondary).
 *    Teal is only the affirmative: Yes, and the one link that widens a
 *    selection.
 * 2. **A 4px rhythm.** A row is 16 · title 20 · 4 · summary 20×n · 8 ·
 *    details 16 · 16, so a list has two row heights rather than one per
 *    combination of facts. Every mark in the row's leading columns is 20px —
 *    one title line — and sits on it.
 * 3. **One job per strip.** Tabs (with the only counts) and Filter; the
 *    filters as pills, only while there are any; the list's head — the
 *    select box, then the selection or Group and Sort; then the rows.
 *
 * Selection is the mail-client pattern: the boxes are always there, faint
 * until hovered; the head box takes the page, and widening to every match is
 * a separate, named step; a half-ticked head box clears.
 */

type Pile = 'waiting' | 'yes' | 'later' | 'no'
const PILES: { key: Pile; label: string }[] = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'yes', label: 'Yes' },
  { key: 'later', label: 'Later' },
  { key: 'no', label: 'No' },
]

const pileOf = (v: IdeaVerdict | null): Pile => v ?? 'waiting'

export function IdeasCardsHarness() {
  const [scope, setScope] = useState<'workspace' | 'campaign'>('workspace')
  const [filtered, setFiltered] = useState(false)
  const [view, setView] = useState<string | null>(null)
  const [grouped, setGrouped] = useState(false)
  const [grid, setGrid] = useState(false)
  const [list, setList] = useState<'ideas' | 'assets'>('ideas')

  const [pile, setPile] = useState<Pile>('waiting')
  const [verdicts, setVerdicts] = useState<Record<string, IdeaVerdict | null>>(
    {},
  )
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [allMatching, setAllMatching] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const anchor = useRef<string | null>(null)

  const showCampaign = scope === 'workspace'
  const filterClear = () => {
    setTicked(new Set())
    setAllMatching(false)
  }

  // The pile is the verdict the row had when the page loaded: an answered
  // row stays until the list is read again, never leaving from under the
  // pointer.
  const rows = useMemo(
    () =>
      IDEAS.filter((i) => pileOf(i.verdict) === pile)
        .filter(
          (i) =>
            scope === 'workspace' || i.campaign?.id === CAMPAIGNS.russie.id,
        )
        .filter((i) => !filtered || i.campaign?.id === CAMPAIGNS.russie.id),
    [pile, scope, filtered],
  )
  const verdictOf = (i: HarnessIdea) =>
    i.id in verdicts ? verdicts[i.id] : i.verdict

  const totals = useMemo(() => {
    const t = { ...PILE_TOTALS }
    for (const idea of IDEAS) {
      if (!(idea.id in verdicts)) continue
      t[pileOf(idea.verdict)] -= 1
      t[pileOf(verdicts[idea.id])] += 1
    }
    return t
  }, [verdicts])
  const total = totals[pile]

  const onPage = rows.filter((r) => ticked.has(r.id)).length
  const elsewhere = ticked.size - onPage
  const pageAll = rows.length > 0 && onPage === rows.length
  const headState: boolean | 'indeterminate' =
    allMatching || pageAll ? true : ticked.size > 0 ? 'indeterminate' : false

  const toggleRow = (id: string, shift: boolean) => {
    setAllMatching(false)
    setTicked((prev) => {
      const next = new Set(prev)
      const on = !prev.has(id)
      // Shift extends from the last box clicked, the way a file list does.
      if (shift && anchor.current) {
        const a = rows.findIndex((r) => r.id === anchor.current)
        const b = rows.findIndex((r) => r.id === id)
        if (a >= 0 && b >= 0) {
          for (const r of rows.slice(Math.min(a, b), Math.max(a, b) + 1))
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
  // A group's box takes the group: half-ticked, it fills the group rather
  // than clearing it — clearing everything is the head box's job.
  const toggleBand = (rs: HarnessIdea[]) => {
    const next = allMatching ? new Set(rows.map((r) => r.id)) : new Set(ticked)
    const all = rs.every((r) => next.has(r.id))
    for (const r of rs)
      if (all) next.delete(r.id)
      else next.add(r.id)
    setAllMatching(false)
    setTicked(next)
  }
  const selecting = ticked.size > 0 || allMatching
  const toggleHead = () => {
    if (ticked.size > 0 || allMatching) return filterClear()
    setTicked(new Set(rows.map((r) => r.id)))
  }

  const bands = useMemo(() => {
    if (!grouped) return [{ key: 'all', label: null, rows }]
    const map = new Map<string, HarnessIdea[]>()
    for (const r of rows) {
      const key =
        r.origin === 'analysed'
          ? r.source!.title
          : r.origin === 'suggested'
            ? 'Suggested by Ogen'
            : 'Written by people'
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return [...map].map(([key, rs]) => ({ key, label: key, rows: rs }))
  }, [grouped, rows])

  return (
    <div className="min-h-screen bg-primary text-foreground" style={FIT_SCALE}>
      <HarnessBar>
        <Choice
          label="List"
          value={list}
          options={[
            ['ideas', 'Ideas'],
            ['assets', 'Assets'],
          ]}
          onChange={setList}
        />
        <Choice
          label="Level"
          value={scope}
          options={[
            ['workspace', 'Workspace'],
            ['campaign', 'Campaign'],
          ]}
          onChange={(v) => {
            setScope(v)
            filterClear()
          }}
        />
        <Toggle
          label="Filters"
          on={filtered}
          onChange={(v) => {
            setFiltered(v)
            if (!v) setView(null)
            filterClear()
          }}
        />
        <Toggle
          label={list === 'ideas' ? 'Grouped by source' : 'Grouped by date'}
          on={grouped}
          onChange={setGrouped}
        />
        <Toggle label="4px grid" on={grid} onChange={setGrid} />
      </HarnessBar>

      <div className="relative mx-8 max-w-[1040px] pb-24">
        {grid && <BaselineGrid />}

        {list === 'assets' ? (
          <AssetsList
            scope={scope}
            filtered={filtered}
            setFiltered={setFiltered}
            grouped={grouped}
            setGrouped={setGrouped}
          />
        ) : (
          <>
            {/* The page header: the place, and the views over it. */}
            <header className="flex h-20 items-center gap-3">
              <h1 className="text-xl/7 font-medium">Ideas</h1>
              <Button className="ml-auto" size="sm">
                <PlusIcon className="size-4" />
                New idea
              </Button>
            </header>

            {/* Tabs, with the only counts on the page, and Filter. */}
            <div className="flex items-end border-b border-quaternary">
              {PILES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setPile(p.key)
                    setOpenId(null)
                  }}
                  aria-current={pile === p.key}
                  className={cn(
                    '-mb-px flex h-10 cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm/5 outline-none first:pl-0 focus-visible:underline',
                    pile === p.key
                      ? 'border-foreground font-medium text-foreground'
                      : 'border-transparent text-secondary-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                  <span className="font-normal text-secondary-foreground tabular-nums">
                    {totals[p.key]}
                  </span>
                </button>
              ))}
              <ViewsMenu
                view={view}
                filtered={filtered}
                onPick={(v) => {
                  setView(v)
                  setFiltered(true)
                  filterClear()
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setFiltered((v) => !v)
                  setView(null)
                  filterClear()
                }}
                className="mb-2 ml-4 flex h-6 cursor-pointer items-center gap-1.5 text-sm/5 text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
              >
                <FunnelSimpleIcon className="size-4" />
                Filter
                {filtered && (
                  <span className="font-medium text-foreground tabular-nums">
                    2
                  </span>
                )}
              </button>
            </div>

            {/* The filters, as pills, only while there are any. */}
            {filtered && (
              <div className="flex h-12 items-center gap-2">
                {view && (
                  <span className="mr-1 flex items-center gap-1.5 text-xs/4 font-medium">
                    <BookmarkSimpleIcon className="size-3" weight="fill" />
                    {view}
                  </span>
                )}
                <Pill
                  field="Campaign"
                  value={CAMPAIGNS.russie.name}
                  onRemove={() => {
                    setFiltered(false)
                    setView(null)
                  }}
                />
                <Pill
                  field="Fit"
                  value="high or medium"
                  onRemove={() => {
                    setFiltered(false)
                    setView(null)
                  }}
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
                    filterClear()
                  }}
                  className="ml-auto cursor-pointer text-xs/4 text-secondary-foreground hover:text-foreground"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* The list's head: the box over the boxes, then the selection — or,
            with nothing ticked, how the list is arranged. */}
            <div
              className={cn(
                ROW_GRID,
                'sticky top-0 z-10 h-12 items-center border-transparent bg-primary',
                showCampaign && ROW_GRID_CAMPAIGN,
              )}
            >
              <Checkbox
                checked={headState}
                disabled={rows.length === 0}
                onCheckedChange={toggleHead}
                aria-label={
                  headState === false
                    ? 'Select the ideas on this page'
                    : 'Clear the selection'
                }
                className="size-4"
              />
              {!selecting ? (
                <div className="col-span-full col-start-2 flex items-center justify-end gap-5 text-xs/4">
                  <Arrange
                    label="Group"
                    value={grouped ? 'Source' : 'None'}
                    onClick={() => setGrouped((g) => !g)}
                  />
                  <Arrange label="Sort" value="Best fit" />
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
                      onClick={filterClear}
                      className="cursor-pointer text-secondary-foreground hover:text-foreground hover:underline"
                    >
                      Clear selection
                    </button>
                  )}
                  {!allMatching && elsewhere > 0 && (
                    <span className="text-secondary-foreground">
                      {elsewhere} in other tabs
                    </span>
                  )}
                  {!allMatching && pageAll && total > rows.length && (
                    <button
                      type="button"
                      onClick={() => setAllMatching(true)}
                      className="cursor-pointer font-medium text-accent hover:underline"
                    >
                      Select all {total} in{' '}
                      {PILES.find((p) => p.key === pile)!.label}
                    </button>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      Make posts
                    </Button>
                    <Button variant="ghost" size="sm">
                      Move to…
                    </Button>
                    <Button variant="ghost" size="sm" onClick={filterClear}>
                      DELETE
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="py-10 text-sm/5 text-secondary-foreground">
                Nothing in this pile.
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
                    {band.rows.map((idea) => (
                      <Row
                        key={idea.id}
                        idea={idea}
                        verdict={verdictOf(idea)}
                        showCampaign={showCampaign}
                        underBand={grouped}
                        open={openId === idea.id}
                        onOpen={() =>
                          setOpenId((o) => (o === idea.id ? null : idea.id))
                        }
                        selected={allMatching || ticked.has(idea.id)}
                        selecting={selecting}
                        onTick={(shift) => toggleRow(idea.id, shift)}
                        onAnswer={(v) =>
                          setVerdicts((prev) => ({ ...prev, [idea.id]: v }))
                        }
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </>
        )}

        <Spec />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function Row({
  idea,
  verdict,
  showCampaign,
  underBand,
  open,
  onOpen,
  selected,
  selecting,
  onTick,
  onAnswer,
}: {
  idea: HarnessIdea
  verdict: IdeaVerdict | null
  showCampaign: boolean
  underBand: boolean
  open: boolean
  onOpen: () => void
  selected: boolean
  selecting: boolean
  onTick: (shift: boolean) => void
  onAnswer: (v: IdeaVerdict | null) => void
}) {
  return (
    <li
      // The whole row opens it; the box and the answers are their own
      // targets. Hover only tints — nothing appears, moves or swaps.
      onClick={onOpen}
      className={cn(
        ROW_GRID,
        showCampaign && ROW_GRID_CAMPAIGN,
        // Its own surface: a hairline card, 4px from the next, no dividers.
        'group cursor-pointer rounded-md py-4',
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
        <Checkbox
          checked={selected}
          onClick={(e) => {
            e.preventDefault()
            onTick(e.shiftKey)
          }}
          aria-label={`Select “${idea.title}”`}
          className={cn(
            'size-4 transition-opacity',
            !selected && !selecting && 'opacity-40 group-hover:opacity-100',
          )}
        />
      </span>

      <Mark idea={idea} />

      <div className="min-w-0">
        <h3
          className={cn(
            'text-sm/5 font-medium break-words',
            !open && 'line-clamp-2',
          )}
        >
          {idea.title}
        </h3>
        {idea.summary && (
          <p
            className={cn(
              'mt-1 text-sm/5 text-secondary-foreground',
              !open && 'line-clamp-2',
            )}
          >
            {idea.summary}
          </p>
        )}
        <Details
          idea={idea}
          verdict={verdict}
          open={open}
          underBand={underBand}
        />
      </div>

      {showCampaign && (
        <span className="flex h-5 min-w-0 items-center gap-2 text-xs/4 text-secondary-foreground">
          {idea.campaign && (
            <>
              <CampaignIcon
                abbr={identityAbbr(idea.campaign.name)}
                color={identityColorVar(idea.campaign.id)}
                className="size-4"
              />
              <span className="truncate">{idea.campaign.name}</span>
            </>
          )}
        </span>
      )}

      <span
        className="flex h-5 items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Answers verdict={verdict} onAnswer={onAnswer} />
      </span>
    </li>
  )
}

/**
 * One mark for every kind of idea, in the 20px column: the fit
 * ring, a person's initials on their colour, or Ogen's spark for one the
 * assistant suggested from nothing.
 */
function Mark({ idea }: { idea: HarnessIdea }) {
  const base =
    'flex size-5 shrink-0 items-center justify-center self-start rounded-full text-xs/4 font-medium tabular-nums'
  if (idea.origin === 'analysed' && idea.fit != null)
    return <FitRing fit={idea.fit} />
  if (idea.origin === 'suggested')
    return (
      <span
        role="img"
        aria-label="Suggested by Ogen"
        className={cn(base, 'bg-secondary')}
      >
        <SparkleIcon className="size-3 text-accent" weight="fill" />
      </span>
    )
  const who = idea.author?.name ?? 'Someone'
  return (
    <span
      role="img"
      aria-label={`Written by ${who}`}
      className={cn(base, 'text-[10px] text-primary')}
      style={{ background: identityColorVar(idea.author?.id ?? who) }}
    >
      {identityAbbr(who)}
    </span>
  )
}

/**
 * The fit score as a 20px ring on the title line, its arc the score in one
 * colour from a continuous red–yellow–green scale over a grey track — the
 * same size and shape as the initials and Ogen's spark beside it, so the mark
 * column reads as one family. The number shows on hover, and is the ring's
 * accessible name.
 */
const FIT_SCALE = {
  // Harness-only stops; the port names these as tokens in index.css.
  '--fit-0': 'oklch(0.63 0.2 28)',
  '--fit-50': 'oklch(0.8 0.16 85)',
  '--fit-100': 'oklch(0.66 0.15 150)',
} as CSSProperties

function fitColor(fit: number) {
  const t = 1 - fitPlace(fit) // 0 at the bottom of the scale, 1 at the top
  return t < 0.5
    ? `color-mix(in oklch, var(--fit-50) ${Math.round(t * 200)}%, var(--fit-0))`
    : `color-mix(in oklch, var(--fit-100) ${Math.round((t - 0.5) * 200)}%, var(--fit-50))`
}

const RING_R = 8.5
const RING_C = 2 * Math.PI * RING_R

function FitRing({ fit }: { fit: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={`Fit ${fit} of 100`}
          className="flex size-5 items-center justify-center self-start"
        >
          <svg viewBox="0 0 20 20" className="size-5 -rotate-90" aria-hidden>
            <circle
              cx="10"
              cy="10"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              className="stroke-quaternary"
            />
            <circle
              cx="10"
              cy="10"
              r={RING_R}
              fill="none"
              strokeWidth="3"
              stroke={fitColor(fit)}
              strokeDasharray={`${(RING_C * fit) / 100} ${RING_C}`}
            />
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        Fit <span className="font-medium tabular-nums">{fit}</span>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The line under a row: where it came from, then at most one fact about
 * where it stands — in that order, always. Opened, it says everything.
 */
function Details({
  idea,
  verdict,
  open,
  underBand,
}: {
  idea: HarnessIdea
  verdict: IdeaVerdict | null
  open: boolean
  /** Grouped by source, the band already names the document. */
  underBand: boolean
}) {
  const { i18n } = useTranslation()
  const day = (iso: string) =>
    formatDate(iso, { day: 'numeric', month: 'short' }, i18n.language) ?? ''

  const source: ReactNode =
    idea.origin === 'analysed' && idea.source ? (
      <span className="flex min-w-0 items-center gap-1.5">
        <HugeiconsIcon
          icon={KIND_ICON[idea.source.kind]}
          size={12}
          strokeWidth={1.75}
          aria-hidden
          className={cn('shrink-0', KIND_TONE[idea.source.kind])}
        />
        {!underBand && <span className="truncate">{idea.source.title}</span>}
        {idea.source.places && (
          <span className="shrink-0 tabular-nums">
            {open || idea.source.places.length < 3
              ? idea.source.places.join(', ')
              : `${idea.source.places[0]} +${idea.source.places.length - 1}`}
          </span>
        )}
      </span>
    ) : idea.origin === 'suggested' ? (
      <span className="shrink-0">Suggested by Ogen, {day(idea.createdAt)}</span>
    ) : (
      <span className="shrink-0">
        {idea.author?.name}, {day(idea.createdAt)}
      </span>
    )

  // Where it stands, most urgent first; closed, only the first of them.
  const standing: ReactNode[] = []
  if (idea.wokeUp)
    standing.push(<span className="text-foreground">Back from Later</span>)
  if (verdict === 'later' && idea.remindAt)
    standing.push(<span>Back on {day(idea.remindAt)}</span>)
  if (idea.postCount)
    standing.push(
      <span className="text-foreground">
        Used in {idea.postCount} {idea.postCount === 1 ? 'post' : 'posts'}
      </span>,
    )
  if (idea.series) standing.push(<span>Series: {idea.series}</span>)

  const bits = [source, ...(open ? standing : standing.slice(0, 1))]
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

function Spec() {
  const rows: [string, string][] = [
    ['14/20 medium', 'Row title, active tab, selection count'],
    ['14/20 regular', 'Summary, tabs, buttons'],
    ['12/16', 'Details line, campaign, pills, bands, Group / Sort'],
    ['20/28 medium', 'Page title — the one exception'],
    ['Card', 'Hairline border, 2px radius, 4px apart; no dividers'],
    ['Row', '16 · title 20 (×≤2) · 4 · summary 20 (×≤2) · 8 · details 16 · 16'],
    ['Marks', '20px column: 20px circles: fit ring, initials or Ogen'],
    ['Fit', 'Arc = score, one colour on red → yellow → green; number on hover'],
  ]
  return (
    <section className="mt-16 border-t border-dashed border-quaternary pt-6">
      <h2 className="mb-3 text-xs/4 font-medium text-secondary-foreground">
        Harness spec
      </h2>
      <dl className="grid grid-cols-[10rem_1fr] gap-x-6 gap-y-2 text-xs/4">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-medium">{k}</dt>
            <dd className="text-secondary-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * The three answers, always on the row and always in the same place — the
 * one given is pressed, and pressing it again takes it back. No verdict mark
 * that turns into buttons on hover.
 */
function Answers({
  verdict,
  onAnswer,
}: {
  verdict: IdeaVerdict | null
  onAnswer: (v: IdeaVerdict | null) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="group"
      aria-label="Answer"
      className="-my-0.5 flex items-center gap-0.5"
    >
      {VERDICT_ORDER.map((v) => {
        const { icon: Glyph, tone, actionKey } = VERDICTS[v]
        const on = verdict === v
        const cls = cn(
          'flex size-6 cursor-pointer items-center justify-center rounded-button outline-none focus-visible:ring-2 focus-visible:ring-ring',
          on
            ? 'bg-primary ring-1 ring-quaternary'
            : 'hover:bg-primary hover:ring-1 hover:ring-quaternary',
        )
        const glyph = (
          <Glyph
            className={cn('size-4', on ? tone : 'text-secondary-foreground')}
            weight={on ? 'bold' : 'regular'}
          />
        )
        if (v === 'later' && !on)
          return (
            <DropdownMenu key={v}>
              <DropdownMenuTrigger aria-label={t(actionKey)} className={cls}>
                {glyph}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4}>
                {POSTPONE_HORIZONS.map((h) => (
                  <DropdownMenuItem key={h} onSelect={() => onAnswer('later')}>
                    {t(HORIZON_KEYS[h])}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        return (
          <button
            key={v}
            type="button"
            aria-label={t(actionKey)}
            aria-pressed={on}
            onClick={() => onAnswer(on ? null : v)}
            className={cls}
          >
            {glyph}
          </button>
        )
      })}
    </div>
  )
}
