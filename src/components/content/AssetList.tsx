import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { ZIndex } from '@/config/zIndex'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { cn } from '@/lib'
import type { AssetGrouping } from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import { useSettingsStore } from '@/stores/settingsStore'
import type { AssetGroupCount, AssetListItem } from '@/types/assetList'
import { AssetListRow } from './AssetListRow'

type Props = {
  /** The rows loaded so far, in the server's order — grouped, when grouped. */
  rows: AssetListItem[]
  /** Every group of the whole match with its count, in display order. */
  groups: AssetGroupCount[]
  grouping: AssetGrouping
  /** What a band is called: the group key in words. */
  groupLabel: (key: string) => string
  campaignId: string | null
  selectedIds: Set<string>
  onToggleRow: (id: string) => void
  onDelete: (row: AssetListItem) => void
  /**
   * When the server answered, as epoch ms: every date on screen is said
   * against that one clock — "added 2 minutes ago" as of the read — so the
   * rows don't each take their own `now`.
   */
  asOf: number
  /** The foot of the list is in view: ask for the next page, if any. */
  onEndReached: () => void
  loadingMore: boolean
  /** What the list says when it has no rows. */
  emptyState?: ReactNode
  className?: string
}

/** A band's id in the folded set: the grouping and its key. */
const bandId = (grouping: AssetGrouping, key: string) => `${grouping}:${key}`

/**
 * The Assets list (CON-378): documents under sticky group bands.
 *
 * **A list, not a table.** The rows are read top to bottom for what each
 * document offers, and they vary in height with what they say, so there are
 * no column headers to line them up under — the band above a run of rows is
 * the only heading, and it is an `<h2>`, which is what a screen reader's
 * heading list then offers as a way through.
 *
 * **The bands are sticky and pushed off by the next one.** That is plain
 * `position: sticky` on each band inside the list's own scroller, which is why
 * this list is not virtualised: a virtual window mounts only what is on
 * screen, so the band of a run that began above it would not exist to stick.
 * Pages are fifty rows, and the next is asked for as the foot comes into view.
 *
 * **Grouping is the server's** (CON-379). The rows arrive ordered by group, a
 * band is drawn where the group changes, and its count is the server's total
 * for the whole match — a band whose rows run onto the next page still says
 * how many it holds. A tag grouping lists a document once per tag, so the
 * same row may appear under two bands; that is the grouping, not a mistake.
 * A grouping with a single group draws no band at all: one band over
 * everything is chrome that says nothing.
 *
 * A band folds on its chevron. What is folded is display state, kept per
 * device (`settingsStore.collapsedAssetBands`), never the workspace's.
 */
export function AssetList({
  rows,
  groups,
  grouping,
  groupLabel,
  campaignId,
  selectedIds,
  onToggleRow,
  onDelete,
  asOf,
  onEndReached,
  loadingMore,
  emptyState,
  className,
}: Props) {
  const { t, i18n } = useTranslation()
  const { names, ready } = useCampaignNames()
  const collapsed = useSettingsStore((s) => s.collapsedAssetBands)
  const toggleBand = useSettingsStore((s) => s.toggleAssetBand)
  const scrollRef = useRef<HTMLDivElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(asOf), [asOf])
  const counts = useMemo(
    () => new Map(groups.map((g) => [g.key, g.count])),
    [groups],
  )
  const banded = grouping !== 'none' && groups.length > 1
  const selecting = selectedIds.size > 0

  // Where each band opens, worked out once per page of rows: the rows arrive
  // ordered by group, so a band starts wherever the key changes.
  const entries = useMemo(
    () =>
      rows.map((row, i) => ({
        row,
        key: row.group_key ?? '',
        opensBand:
          banded && (i === 0 || rows[i - 1].group_key !== row.group_key),
      })),
    [rows, banded],
  )

  // The foot coming into view is the cue for the next page. A ref to the
  // callback, so a new one each render doesn't re-observe.
  const endReached = useRef(onEndReached)
  useLayoutEffect(() => {
    endReached.current = onEndReached
  })
  useEffect(() => {
    const root = scrollRef.current
    const foot = footRef.current
    if (!root || !foot || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) endReached.current()
      },
      { root, rootMargin: '400px 0px' },
    )
    observer.observe(foot)
    return () => observer.disconnect()
  }, [])

  if (rows.length === 0) {
    return (
      <div className={cn('min-h-50 overflow-y-auto', className)}>
        {emptyState}
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={cn('@container min-h-0 overflow-y-auto bg-primary', className)}
    >
      <ul aria-label={t('content.list.label')}>
        {entries.map(({ row, key, opensBand }, index) => {
          const folded = banded && collapsed.includes(bandId(grouping, key))
          // A row listed under two tags is two rows; the key keeps them apart.
          const id = `${key}:${row.id}`
          return (
            <Fragment key={id}>
              {opensBand && (
                <Band
                  label={groupLabel(key)}
                  count={formatNumber(counts.get(key) ?? 0, {}, i18n.language)}
                  folded={folded}
                  onToggle={() => toggleBand(bandId(grouping, key))}
                  first={index === 0}
                />
              )}
              {!folded && (
                <AssetListRow
                  row={row}
                  campaignId={campaignId}
                  campaignNames={names}
                  campaignsReady={ready}
                  selected={selectedIds.has(row.id)}
                  selecting={selecting}
                  onToggle={onToggleRow}
                  onDelete={onDelete}
                  now={now}
                />
              )}
            </Fragment>
          )
        })}
      </ul>
      <div ref={footRef} aria-hidden className="h-px" />
      {loadingMore && (
        <p className="py-3 text-center text-xs text-secondary-foreground">
          {t('content.filter.loadingMore')}
        </p>
      )}
      {/* Room for the floating selection bar, so it never sits on the last row. */}
      {selecting && <div aria-hidden className="h-20" />}
    </div>
  )
}

/**
 * A group's band: its name and how many it holds, and the fold. The whole
 * band is the button, since a 16px chevron is a small target for the one
 * thing the band does.
 */
function Band({
  label,
  count,
  folded,
  onToggle,
  first,
}: {
  label: string
  count: string
  folded: boolean
  onToggle: () => void
  first: boolean
}) {
  const { t } = useTranslation()
  return (
    <li
      className={cn(
        'sticky top-0 border-b border-quaternary bg-secondary',
        !first && 'border-t',
      )}
      style={{ zIndex: ZIndex.stickyTableHeader }}
    >
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!folded}
          aria-label={t(folded ? 'content.list.unfold' : 'content.list.fold', {
            group: label,
          })}
          className="flex h-9.5 w-full items-center gap-3 px-4.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={16}
            strokeWidth={1.8}
            aria-hidden
            className={cn(
              'shrink-0 text-secondary-foreground transition-transform',
              folded && '-rotate-90',
            )}
          />
          <span className="font-semibold text-foreground">{label}</span>
          <span className="tabular-nums text-secondary-foreground">
            {count}
          </span>
        </button>
      </h2>
    </li>
  )
}
