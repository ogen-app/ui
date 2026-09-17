import { memo, useMemo } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import { VirtualTable } from '../VirtualTable'
import type { ColumnConfig } from '../types'
import { tableDate } from '../utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib'
import {
  FACT_KINDS,
  FACT_SUBJECTS,
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
/** The sticky header: a `size="sm"` header button plus its hairline. */
const HEADER_HEIGHT = 34
/**
 * How many rows the box is tall. Past this the ledger scrolls inside itself
 * rather than pushing the editor's own controls off the screen — the card
 * under it holds `ADD A FACT`, and a hundred-row workspace must not bury it.
 */
const VISIBLE_ROWS = 12

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
          <ExpiryCell fact={row} status={factStatus(row, today)} />
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

  return (
    // An explicit height rather than a share of the page: this table lives in
    // a card in a column that scrolls, so there is no leftover space for it to
    // fill — it is as tall as it needs to be, up to the point where it starts
    // scrolling on its own.
    <div
      className="grid min-h-0 overflow-hidden"
      style={{
        height:
          HEADER_HEIGHT + Math.min(facts.length, VISIBLE_ROWS) * ROW_HEIGHT,
      }}
    >
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
      />
    </div>
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
 * The column the screen is opened to read.
 *
 * Three states and only one of them is a plain date: a fact past its expiry is
 * being repeated wrongly *right now*, and one a few weeks off is the only
 * moment anybody can do something about it cheaply. No expiry at all is a
 * legitimate answer — a founding year does not go off — so it is stated rather
 * than left blank, which would read as a field somebody skipped.
 */
function ExpiryCell({ fact, status }: { fact: BrandFact; status: FactStatus }) {
  if (!fact.expiresAt)
    return (
      <div className={CELL}>
        <span className="table-text text-senary-foreground">
          doesn’t expire
        </span>
      </div>
    )
  return (
    <div className={CELL}>
      <span
        className={cn(
          'table-text tabular-nums',
          status === 'expired' && 'text-destructive',
          status === 'due' && 'text-warning',
          status === 'current' && 'text-tertiary-foreground',
        )}
      >
        {status === 'expired' && 'Expired '}
        {tableDate(fact.expiresAt)}
      </span>
    </div>
  )
}

export const FactsTable = memo(FactsTableComponent)
