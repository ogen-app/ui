import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CaretDownIcon,
  FunnelSimpleIcon,
  PlusIcon,
  SparkleIcon,
  XIcon,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [grouped, setGrouped] = useState(false)
  const [grid, setGrid] = useState(false)

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
    <div className="min-h-screen bg-primary text-foreground">
      <HarnessBar>
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
            filterClear()
          }}
        />
        <Toggle label="Grouped by source" on={grouped} onChange={setGrouped} />
        <Toggle label="4px grid" on={grid} onChange={setGrid} />
      </HarnessBar>

      <div className="relative mx-8 max-w-[1040px] pb-24">
        {grid && <BaselineGrid />}

        {/* The page header: the place, and the views over it. */}
        <header className="flex h-20 items-center gap-3">
          <h1 className="text-xl/7 font-medium">Ideas</h1>
          <ViewsMenu />
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
          <button
            type="button"
            onClick={() => {
              setFiltered((v) => !v)
              filterClear()
            }}
            className="mb-2 ml-auto flex h-6 cursor-pointer items-center gap-1.5 text-sm/5 text-secondary-foreground outline-none hover:text-foreground focus-visible:underline"
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
          <div className="flex h-12 items-center gap-2 border-b border-quaternary">
            <Pill
              field="Campaign"
              value={CAMPAIGNS.russie.name}
              onRemove={() => setFiltered(false)}
            />
            <Pill
              field="Fit"
              value="high or medium"
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
            'sticky top-0 z-10 h-12 items-center border-b border-quaternary bg-primary',
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
          {ticked.size === 0 && !allMatching ? (
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
                <div className="flex h-10 items-end gap-2 border-b border-quaternary pb-2 text-xs/4">
                  <span className="font-medium">{band.label}</span>
                  <span className="text-secondary-foreground tabular-nums">
                    {band.rows.length}
                  </span>
                </div>
              )}
              <ul>
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
                    selecting={ticked.size > 0 || allMatching}
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

        <Spec />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

/**
 * The row's columns: box, mark, the words, (the campaign), the answer. The
 * head uses the same template, so its box sits over the rows' boxes by
 * construction rather than by matching padding.
 */
const ROW_GRID =
  '-mx-4 grid grid-cols-[16px_20px_minmax(0,1fr)_auto] gap-x-4 px-4'
const ROW_GRID_CAMPAIGN =
  'grid-cols-[16px_20px_minmax(0,1fr)_minmax(0,13rem)_auto]'

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
        'group cursor-pointer border-b border-quaternary py-4',
        selected ? 'bg-accent/5' : 'hover:bg-secondary',
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
 * One 20px mark for every kind of idea, on the title's line: the fit score
 * on the fit scale's colour, a person's initials on theirs, or Ogen's spark
 * for one the assistant suggested from nothing.
 */
function Mark({ idea }: { idea: HarnessIdea }) {
  const base =
    'flex size-5 shrink-0 items-center justify-center rounded-full text-xs/4 font-medium tabular-nums'
  if (idea.origin === 'analysed' && idea.fit != null) {
    const strong = Math.round((1 - fitPlace(idea.fit)) * 100)
    return (
      <span
        role="img"
        aria-label={`Fit ${idea.fit}`}
        className={base}
        style={{
          background: `color-mix(in oklab, var(--fit-high) ${strong}%, var(--fit-low))`,
        }}
      >
        {idea.fit}
      </span>
    )
  }
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

/* ------------------------------------------------------------------------ */

function ViewsMenu() {
  const [view, setView] = useState('All ideas')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 cursor-pointer items-center gap-1 rounded-button px-2 text-sm/5 text-secondary-foreground outline-none hover:bg-secondary hover:text-foreground">
        {view}
        <CaretDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-56">
        <DropdownMenuRadioGroup value={view} onValueChange={setView}>
          {['All ideas', 'Strong fits this month', 'From the brochure'].map(
            (v) => (
              <DropdownMenuRadioItem key={v} value={v}>
                {v}
              </DropdownMenuRadioItem>
            ),
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Arrange({
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

function Pill({
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
function BaselineGrid() {
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

function Spec() {
  const rows: [string, string][] = [
    ['14/20 medium', 'Row title, active tab, selection count'],
    ['14/20 regular', 'Summary, tabs, buttons'],
    ['12/16', 'Details line, campaign, pills, bands, Group / Sort'],
    ['20/28 medium', 'Page title — the one exception'],
    ['Row', '16 · title 20 (×≤2) · 4 · summary 20 (×≤2) · 8 · details 16 · 16'],
    ['Marks', '20px, on the title line: fit, initials, Ogen'],
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

function HarnessBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-6 border-b border-dashed border-quaternary bg-secondary px-8 py-2 text-xs/4">
      <span className="font-medium">design/ideas-cards</span>
      {children}
    </div>
  )
}

function Toggle({
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

function Choice<T extends string>({
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
