import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowsClockwiseIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react'
import {
  scrollerOf,
  usePinnedBands,
} from '@/components/page-primitives/pinnedBands'
import {
  CARD,
  CARD_GRID,
  CARD_GRID_WIDE,
  CARD_LIST,
  CardBand,
} from '@/components/page-primitives/listCards'
import { useCampaignNames } from '@/hooks/useCampaignNames'
import { cn } from '@/lib'
import type { AssetGrouping } from '@/lib/assetFilter'
import { formatNumber } from '@/lib/intl'
import { uploadErrorMessage } from '@/lib/uploadError'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUploadStore, type UploadItem } from '@/stores/uploadStore'
import type { AssetGroupCount, AssetListItem } from '@/types/assetList'
import { AssetListRow, StateRing } from './AssetListRow'
import { Button } from '@/components/ui/button'

type Props = {
  /** The list's head (`CardHead`), its first item and the edge it pins by. */
  head: ReactNode
  /** The rows loaded so far, in the server's order — grouped, when grouped. */
  rows: AssetListItem[]
  /** Every group of the whole match with its count, in display order. */
  groups: AssetGroupCount[]
  grouping: AssetGrouping
  /** What a group head is called: the group key in words. */
  groupLabel: (key: string) => string
  campaignId: string | null
  /** Files still in transit to this scope, or refused on the way. */
  uploads?: UploadItem[]
  selectedIds: Set<string>
  /** Something is ticked somewhere: every box at full ink. */
  selecting: boolean
  onToggleRow: (id: string, shift: boolean) => void
  /** A group head's box: its loaded cards' ids. */
  onToggleBand: (ids: string[]) => void
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

/** A group's id in the folded set: the grouping and its key. */
const bandId = (grouping: AssetGrouping, key: string) => `${grouping}:${key}`

/**
 * The Assets list: documents as cards (design/ideas-cards), under the list's
 * head and, grouped, under a group head wherever the group changes.
 *
 * **A list, not a table.** The cards are read top to bottom for what each
 * document offers, and there are no column headers to line them up under —
 * a group head is the only heading over a run of cards, and it is an `<h2>`,
 * which is what a screen reader's heading list then offers as a way through.
 *
 * **The head pins** in the *page's* scroller (CON-392): the list has none
 * of its own; the head pins at the foot of the page header (`pinnedBands`),
 * and the group heads scroll with their cards. The list is not virtualised:
 * pages are fifty rows, the next asked for as the foot comes into view.
 *
 * **Grouping is the server's** (CON-379). The rows arrive ordered by group, a
 * head is drawn where the group changes, and its count is the server's total
 * for the whole match — a group whose rows run onto the next page still says
 * how many it holds; its box ticks the cards loaded. A tag grouping lists a
 * document once per tag, so the same card may appear under two heads; that
 * is the grouping, not a mistake. A group folds on its name; what is folded
 * is display state, kept per device (`settingsStore.collapsedAssetBands`).
 */
export function AssetList({
  head,
  rows,
  groups,
  grouping,
  groupLabel,
  campaignId,
  uploads = [],
  selectedIds,
  selecting,
  onToggleRow,
  onToggleBand,
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
  const listRef = useRef<HTMLUListElement>(null)
  const footRef = useRef<HTMLDivElement>(null)
  const now = useMemo(() => new Date(asOf), [asOf])
  const counts = useMemo(
    () => new Map(groups.map((g) => [g.key, g.count])),
    [groups],
  )
  const grouped = grouping !== 'none' && groups.length > 0

  // Where each group opens, worked out once per page of rows: the rows arrive
  // ordered by group, so a group starts wherever the key changes.
  const entries = useMemo(
    () =>
      rows.map((row, i) => ({
        row,
        key: grouped ? (row.group_key ?? '') : '',
        opensBand:
          grouped && (i === 0 || rows[i - 1].group_key !== row.group_key),
      })),
    [rows, grouped],
  )
  /** Each group's loaded cards, for its box. */
  const members = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const { row, key } of entries)
      map.set(key, [...(map.get(key) ?? []), row.id])
    return map
  }, [entries])

  // The foot coming into view is the cue for the next page. A ref to the
  // callback, so a new one each render doesn't re-observe. The observer is
  // attached again whenever the list goes from empty to not, because the
  // empty state mounts neither the scroller nor the foot it watches.
  const hasRows = rows.length > 0 || uploads.length > 0
  const endReached = useRef(onEndReached)
  useLayoutEffect(() => {
    endReached.current = onEndReached
  })
  useEffect(() => {
    const foot = footRef.current
    const root = scrollerOf(foot)
    if (!foot || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) endReached.current()
      },
      { root, rootMargin: '400px 0px' },
    )
    observer.observe(foot)
    return () => observer.disconnect()
  }, [hasRows])

  usePinnedBands(listRef, hasRows, [entries, collapsed, grouping])

  if (!hasRows) {
    // The head stays, so the filter that emptied the list can be changed
    // where it was set.
    return (
      <div className={cn('min-h-50', className)}>
        <ul className={CARD_LIST}>{head}</ul>
        {emptyState}
      </div>
    )
  }

  return (
    // `@container`: the campaigns' column needs the room.
    <div className={cn('@container pb-4', className)}>
      <ul
        ref={listRef}
        aria-label={t('content.list.label')}
        className={CARD_LIST}
      >
        {head}
        {uploads.map((file) => (
          <UploadCard key={file.id} file={file} />
        ))}
        {entries.map(({ row, key, opensBand }) => {
          const folded = grouped && collapsed.includes(bandId(grouping, key))
          const ids = members.get(key) ?? []
          // A row listed under two tags is two rows; the key keeps them apart.
          const id = `${key}:${row.id}`
          return (
            <Fragment key={id}>
              {opensBand && (
                <CardBand
                  label={groupLabel(key)}
                  count={formatNumber(counts.get(key) ?? 0, {}, i18n.language)}
                  ticked={{
                    on: ids.filter((i) => selectedIds.has(i)).length,
                    of: ids.length,
                  }}
                  selectable
                  selecting={selecting}
                  folded={folded}
                  onFold={() => toggleBand(bandId(grouping, key))}
                  onTick={() => onToggleBand(ids)}
                  wide
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
                  now={now}
                />
              )}
            </Fragment>
          )
        })}
      </ul>
      <div ref={footRef} aria-hidden className="h-px" />
      {loadingMore && (
        <p className="py-3 text-center text-xs/4 text-secondary-foreground">
          {t('content.filter.loadingMore')}
        </p>
      )}
    </div>
  )
}

/**
 * A file in flight, or refused on the way in, as a card at the head of the
 * list. It has no box — there is nothing yet to select — and opens nothing:
 * the moment the server has it, it leaves and joins the list as a document
 * being read. A refusal stays here, where the file was dropped and where the
 * user is looking, with its reason and the way on.
 */
function UploadCard({ file }: { file: UploadItem }) {
  const { t } = useTranslation()
  const retry = useUploadStore((s) => s.retry)
  const remove = useUploadStore((s) => s.remove)
  const failed = file.phase === 'failed'
  return (
    <li
      className={cn(CARD_GRID, CARD_GRID_WIDE, CARD, 'py-4 hover:bg-primary')}
    >
      <span aria-hidden />
      <span
        role="img"
        aria-label={
          failed
            ? t('uploads.failed')
            : t('content.list.uploading', { progress: file.progress })
        }
        className="flex size-5 items-center justify-center"
      >
        {failed ? (
          <WarningCircleIcon aria-hidden className="size-5 text-destructive" />
        ) : (
          <StateRing value={file.progress} />
        )}
      </span>
      <div className="flex min-w-0 flex-col">
        <h3 className="truncate text-sm/5 font-medium text-secondary-foreground">
          {file.filename}
        </h3>
        <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs/4 text-secondary-foreground tabular-nums">
          {failed ? (
            // The reason in words (`lib/uploadError`), under the name it is
            // about.
            <span className="truncate text-destructive">
              {file.error
                ? uploadErrorMessage(t, file.error)
                : t('uploads.failed')}
            </span>
          ) : (
            <span className="text-foreground">
              {t('content.list.uploading', { progress: file.progress })}
            </span>
          )}
        </div>
      </div>
      <span className="hidden @4xl:block" />
      <span className="flex h-5 items-center justify-end gap-1">
        {/* Not for a file this client refused before sending it — the same
            file fails the same check again. */}
        {failed && file.kind !== null && (
          <Button
            variant="ghost"
            size="rowIcon"
            aria-label={t('content.list.retryUpload', { name: file.filename })}
            onClick={() => retry(file.id)}
          >
            <ArrowsClockwiseIcon className="size-4" />
          </Button>
        )}
        {failed && (
          <Button
            variant="ghost"
            size="rowIcon"
            aria-label={t('content.list.dismissUpload', {
              name: file.filename,
            })}
            onClick={() => remove(file.id)}
          >
            <XIcon className="size-4" />
          </Button>
        )}
      </span>
    </li>
  )
}
