import { memo, useMemo } from 'react'
import {
  ClockCountdownIcon,
  ClockIcon,
  InfinityIcon,
  TrashIcon,
  WarningIcon,
  type Icon,
  type IconWeight,
} from '@phosphor-icons/react'
import { VirtualTable } from '../VirtualTable'
import type { ColumnConfig } from '../types'
import { tableDate } from '../utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib'
import { formatRelative } from '@/lib/intl'
import {
  FACT_KINDS,
  FACT_SUBJECTS,
  daysBetween,
  expiryDistance,
  factKind,
  factStatus,
  factSubject,
  type BrandFact,
  type FactStatus,
} from '@/components/brand/facts'

/**
 * The facts ledger, as a table — the app's table, the one posts and documents
 * are listed in.
 *
 * It was hand-rolled `<table>` markup for exactly as long as it took to put it
 * next to the posts list: same page, same job, two different column headers,
 * two different row heights, two different ideas of what a sorted column looks
 * like. A ledger is a list of records with dates on it, which is what
 * `VirtualTable` is for, so it is one of those now and inherits the sorting,
 * the sticky header and the column sizing rather than reimplementing the first
 * of the three and going without the others.
 *
 * **Sorted by expiry, soonest first.** The other tables in the app open in the
 * order somebody would file things in — newest document, next post out — and
 * this one opens in the order somebody has to *act* in: what is being repeated
 * today and is already wrong, then what goes wrong next. A fact with no expiry
 * sorts last in both directions (`sortUndefined`), because "never goes off" is
 * not an early date, it is the absence of one.
 *
 * The statement is the only cell that opens the row — the same rule the posts
 * table follows with its title, and the reason the delete button at the end of
 * the row can be clicked without a modal appearing over it.
 */

/** One line of type, the app's table row. */
const ROW_HEIGHT = 34

/**
 * The cell fills the box the table gives it and adds the inset — no height of
 * its own, and no hairline: `VirtualTable` already draws `border-b-2` on the
 * wrapper around every custom cell.
 */
const CELL = 'flex h-full items-center px-3'

type FactRow = BrandFact & Record<string, unknown>

function FactsTableComponent({
  facts,
  today,
  showSubject = true,
  onEdit,
  onRemove,
  className,
  onEmptyStateAction,
}: {
  facts: BrandFact[]
  /** `YYYY-MM-DD`, passed in so every row ages against one clock. */
  today: string
  /**
   * Whether the About column is drawn.
   *
   * Off under a tab that has already answered it: a column reading *Problem*
   * on every row of the Problems ledger is a column spent saying where you are
   * standing, and the statement it takes the width from is the reason anybody
   * opened the screen.
   */
  showSubject?: boolean
  onEdit: (id: string) => void
  onRemove: (id: string) => void
  className?: string
  /**
   * Offered when the table is empty *because something narrowed it* — a tab,
   * a search. An empty ledger is not this state and never reaches the table:
   * the page says what the absence costs in its own words, which the shared
   * empty state has no room for.
   */
  onEmptyStateAction?: () => void
}) {
  const data = facts as FactRow[]

  const columnConfigs = useMemo<ColumnConfig<FactRow>[]>(
    () => [
      {
        id: 'statement',
        accessorKey: 'statement',
        header: 'Statement',
        isAutoSize: true,
        minSize: 190,
        cell: (_value, row) => (
          <button
            type="button"
            onClick={() => onEdit(row.id)}
            className={cn(CELL, 'w-full text-left')}
          >
            {/* The statement is what the row *is*, so it is the only cell in
                the foreground ink; everything else about a fact qualifies it.
                Truncated rather than wrapped — the whole sentence is one click
                away, and a ledger whose rows are different heights cannot be
                read down a column. */}
            <span
              className={cn(
                'table-text truncate hover:underline',
                !row.statement && 'text-tertiary-foreground',
              )}
            >
              {row.statement || 'Not written yet'}
            </span>
          </button>
        ),
      },
      {
        id: 'subject',
        header: 'About',
        size: 120,
        minSize: 105,
        // Ordered as `FACT_SUBJECTS` is — us, the problem, the opening — which
        // is the order the three make an argument in, and the only order they
        // have. Alphabetical would be an accident of the words.
        accessorFn: (row) =>
          FACT_SUBJECTS.findIndex((s) => s.id === row.subject),
        cell: (_value, row) => {
          const Subject = factSubject(row.subject).icon
          return (
            <div className={cn(CELL, 'gap-1.5 text-tertiary-foreground')}>
              <Subject className="size-4 shrink-0" aria-hidden />
              <span className="table-text truncate">
                {factSubject(row.subject).label}
              </span>
            </div>
          )
        },
      },
      {
        id: 'kind',
        header: 'Kind',
        size: 130,
        minSize: 110,
        // Sorted down the subjectivity ladder rather than alphabetically: the
        // order of `FACT_KINDS` is the only order this column has, and it is
        // the one the column was added to make visible — what is measured, at
        // the top, and what is opinion, at the bottom.
        accessorFn: (row) => FACT_KINDS.findIndex((k) => k.id === row.kind),
        cell: (_value, row) => {
          const Kind = factKind(row.kind).icon
          return (
            <div className={cn(CELL, 'gap-1.5 text-tertiary-foreground')}>
              <Kind className="size-4 shrink-0" aria-hidden />
              <span className="table-text truncate">
                {factKind(row.kind).label}
              </span>
            </div>
          )
        },
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: 'Source',
        size: 160,
        minSize: 120,
        cell: (_value, row) => (
          <div className={CELL}>
            <span
              className={cn(
                'table-text truncate',
                row.source
                  ? 'text-tertiary-foreground'
                  : 'text-senary-foreground',
              )}
            >
              {row.source || 'nobody said'}
            </span>
          </div>
        ),
      },
      {
        id: 'added',
        accessorFn: (row) => row.addedAt || undefined,
        sortUndefined: 'last',
        header: 'Added',
        size: 105,
        minSize: 95,
        cell: (_value, row) => <Stamp value={row.addedAt} />,
      },
      {
        id: 'checked',
        accessorFn: (row) => row.checkedAt || undefined,
        sortUndefined: 'last',
        header: 'Checked',
        size: 110,
        minSize: 95,
        // Not the same column as `Added` with a different label: a figure that
        // went in a year ago and was confirmed last week is worth repeating,
        // and the identical sentence never looked at since is what this
        // section exists to surface. "Never" says which one this is.
        cell: (_value, row) => <Stamp value={row.checkedAt} unset="never" />,
      },
      {
        id: 'expires',
        accessorFn: (row) => row.expiresAt || undefined,
        sortUndefined: 'last',
        header: 'Expires',
        size: 130,
        minSize: 110,
        cell: (_value, row) => (
          <ExpiryCell
            fact={row}
            today={today}
            status={factStatus(row, today)}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 56,
        minSize: 50,
        sortable: false,
        isControl: true,
        cell: (_value, row) => (
          <div className={cn(CELL, 'justify-center')}>
            <Button
              variant="ghost"
              size="xsIcon"
              aria-label={`Remove “${row.statement || 'this fact'}”`}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(row.id)
              }}
            >
              <TrashIcon className="size-4 text-tertiary-foreground hover:text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [today, onEdit, onRemove],
  )

  const activeColumns = useMemo(
    () => (showSubject ? COLUMNS : COLUMNS.filter((id) => id !== 'subject')),
    [showSubject],
  )

  // No box of its own: the ledger is the page now, so it takes the height the
  // page has left over — the arrangement the posts and documents tables are in,
  // and the caller owns the grid cell that bounds it.
  return (
    <VirtualTable
      data={data}
      columnConfigs={columnConfigs}
      activeColumns={activeColumns}
      initialSorting={DEFAULT_SORT}
      estimatedRowHeight={ROW_HEIGHT}
      overscan={6}
      showFooter={false}
      fillHeight={false}
      className={className}
      onEmptyStateAction={onEmptyStateAction}
    />
  )
}

const COLUMNS = [
  'statement',
  'subject',
  'kind',
  'source',
  'added',
  'checked',
  'expires',
  'actions',
]

const DEFAULT_SORT = [{ id: 'expires', desc: false }]

/** A date, or what its absence means. */
function Stamp({ value, unset = '—' }: { value: string; unset?: string }) {
  const stamped = tableDate(value)
  return (
    <div className={CELL}>
      <span
        className={cn(
          'table-text tabular-nums',
          stamped ? 'text-tertiary-foreground' : 'text-senary-foreground',
        )}
      >
        {stamped ?? unset}
      </span>
    </div>
  )
}

/**
 * What each status looks like — **the colour is on the mark, not on the words.**
 *
 * The three states were told apart by the ink of the text, which put the one
 * loud thing in the column on the one part of it that has to stay readable:
 * red type reads as broken type, and a row of amber sentences in a table of
 * grey ones is a column shouting a sentence nobody needs to read twice. A glyph
 * is the thing that can be scanned down a column at a glance and carries a
 * colour without costing legibility, so the status is the glyph and the
 * duration beside it is ordinary table ink.
 *
 * `current` is deliberately not green. Colour here means *something to do*, and
 * a fact that is fine is not an achievement to announce — a column of green
 * ticks would spend the reader's attention on the rows that do not need it and
 * leave the two that do competing with sixty others.
 */
const EXPIRY_MARK: Record<
  FactStatus,
  { icon: Icon; weight: IconWeight; tone: string }
> = {
  // Filled, and the only filled glyph in the table: a fact being repeated
  // after its date is the one thing on this screen that is wrong right now.
  expired: { icon: WarningIcon, weight: 'fill', tone: 'text-destructive' },
  due: { icon: ClockCountdownIcon, weight: 'regular', tone: 'text-warning' },
  current: {
    icon: ClockIcon,
    weight: 'regular',
    tone: 'text-tertiary-foreground',
  },
}

/**
 * The column the screen is opened to read.
 *
 * **A distance, not a date.** "01 Aug 26" is a subtraction somebody has to do
 * against today before it means anything, and the meaning is the whole point
 * of the column: *in 3 months* and *2 months ago* are read at a glance and
 * *01 Aug 26* is not. See `expiryDistance` for where days give way to months.
 * The date itself is still one hover away, because it is what you check
 * against the source when you go to re-confirm the fact.
 *
 * Three states and only two of them say anything in colour — see
 * `EXPIRY_MARK`. No expiry at all is the fourth answer and a legitimate one: a
 * founding year does not go off, so it is stated rather than left blank, which
 * would read as a field somebody skipped.
 */
function ExpiryCell({
  fact,
  today,
  status,
}: {
  fact: BrandFact
  today: string
  status: FactStatus
}) {
  if (!fact.expiresAt)
    return (
      <div className={cn(CELL, 'gap-1.5 text-senary-foreground')}>
        {/* Marked rather than left empty, so the durations below and above it
            start at the same x — a column of text with one unindented row in
            it reads as a rendering fault. */}
        <InfinityIcon className="size-4 shrink-0" aria-hidden />
        <span className="table-text truncate">doesn’t expire</span>
      </div>
    )

  const { icon: Mark, weight, tone } = EXPIRY_MARK[status]
  const { value, unit } = expiryDistance(daysBetween(today, fact.expiresAt))

  return (
    <Tooltip>
      {/* The whole cell is the trigger, not the glyph: the duration is the
          vague half, so hovering the words is what somebody does to find out
          exactly when. `tabIndex` because a fact's date must be reachable
          without a pointer — Radix ties the content to it with
          `aria-describedby`, which is also how the status word gets said out
          loud, the glyph being decoration to a screen reader. */}
      <TooltipTrigger asChild>
        <div className={cn(CELL, 'gap-1.5')} tabIndex={0}>
          <Mark className={cn('size-4 shrink-0', tone)} weight={weight} />
          <span className="table-text truncate text-tertiary-foreground tabular-nums">
            {formatRelative(value, unit)}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {status === 'expired' ? 'Expired ' : 'Expires '}
        {tableDate(fact.expiresAt)}
      </TooltipContent>
    </Tooltip>
  )
}

export const FactsTable = memo(FactsTableComponent)
