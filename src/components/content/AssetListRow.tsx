import { memo, useEffect, useRef, useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { WarningCircleIcon } from '@phosphor-icons/react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useAssetAnalyses,
  useRetryAssetAnalysis,
} from '@/hooks/useAssetAnalyses'
import { ASSET_LIST_KEY } from '@/hooks/useContent'
import { cn } from '@/lib'
import {
  assetLink,
  formatDuration,
  ideaVerdictKey,
  listTitle,
  rowDates,
  rowState,
  verdictSentence,
  type RowState,
  type VerdictKey,
} from '@/lib/assetList'
import { byFit } from '@/lib/ideaFit'
import { formatNumber } from '@/lib/intl'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { AssetListItem } from '@/types/assetList'
import {
  CARD,
  CARD_GRID,
  CARD_GRID_WIDE,
  CARD_SELECTED,
  opensCard,
} from '@/components/page-primitives/listCards'
import { CampaignMark } from './asset-page/CampaignMark'
import { AssetKindMark } from './AssetKindMark'
import { FitRing } from './FitRing'
import { MatchSnippet } from './MatchSnippet'
import { VERDICT_ICON } from './verdictIcons'
import { TextButton } from '@/components/ui/text-button'

/**
 * One document on the Assets list, as a card (design/ideas-cards): its own
 * surface, a hairline border, 4px from the next — the list's rules are in
 * `page-primitives/listCards`. The whole card opens the asset's page.
 *
 * **One 20px mark on the title line**: what is happening to the file while
 * something is — a spinning ring while it is read, a warning when it
 * couldn't be — and otherwise what it is, the kind's icon or the picture
 * itself. The title, then what the document says (or, while a text search
 * runs, where it matched), then one line of glanced facts: what it is, when
 * it came, and at most one fact about where it stands — the one that asks for
 * something first. Its campaigns have a column on a wide list; at the end,
 * where an idea has its answers, the ideas still waiting on it, opening its
 * undecided pile, with the asset's ideas on hover. Nothing on the card
 * answers an idea and nothing deletes: DELETE is the selection's.
 */
export type AssetListRowProps = {
  row: AssetListItem
  /** The campaign whose page this is, or null in the workspace bank. */
  campaignId: string | null
  /** Live campaign names by id; `ready` once they have arrived. */
  campaignNames: Map<string, string>
  campaignsReady: boolean
  selected: boolean
  /** Something is ticked somewhere, so every card shows its box at full ink. */
  selecting: boolean
  /** Ticks or unticks the card; Shift extends a range. */
  onToggle: (id: string, shift: boolean) => void
  now: Date
}

function AssetListRowComponent({
  row,
  campaignId,
  campaignNames,
  campaignsReady,
  selected,
  selecting,
  onToggle,
  now,
}: AssetListRowProps) {
  const { t } = useTranslation()
  const title = listTitle(row, t('content.list.untitled'))
  const state = rowState(row)
  const muted = state === 'reading' || state === 'failed'
  const gist = row.gist?.trim()
  const held = heldCampaigns(row, campaignId, campaignNames, campaignsReady)

  return (
    <li
      // The whole card opens the asset, through its title's own link.
      onClick={(event) => {
        if (!opensCard(event)) return
        event.currentTarget
          .querySelector<HTMLAnchorElement>('a[data-card-link]')
          ?.click()
      }}
      className={cn(
        CARD_GRID,
        CARD_GRID_WIDE,
        'group cursor-pointer py-4',
        selected ? CARD_SELECTED : CARD,
      )}
    >
      <span className="flex h-5 items-center">
        <Checkbox
          checked={selected}
          onClick={(event) => {
            // The press is the toggle, so Shift can extend a range.
            event.preventDefault()
            onToggle(row.id, event.shiftKey)
          }}
          onKeyDown={(event) => {
            if (event.key !== ' ') return
            event.preventDefault()
            onToggle(row.id, event.shiftKey)
          }}
          aria-label={t('content.list.selectRow', { title })}
          className={cn(
            'transition-opacity',
            !selected &&
              !selecting &&
              'opacity-40 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
          )}
        />
      </span>

      <AssetMark row={row} state={state} />

      <div className="flex min-w-0 flex-col">
        <h3
          className={cn(
            'line-clamp-2 text-sm/5 font-medium break-words',
            muted && 'text-secondary-foreground',
          )}
        >
          <Link
            data-card-link
            {...assetLink(row, campaignId)}
            className="outline-none focus-visible:underline"
          >
            {title}
          </Link>
        </h3>
        {row.match ? (
          <p className="mt-1 line-clamp-2 text-sm/5">
            <MatchSnippet match={row.match} />
          </p>
        ) : state === 'failed' ? (
          // Why it failed and what to do, where the summary would be: a
          // failed file has nothing else to say.
          <p className="mt-1 line-clamp-2 text-sm/5 text-secondary-foreground">
            {ingestFailureMessage(t, row)} {t('content.list.failedNext')}
          </p>
        ) : (
          gist &&
          !muted && (
            <p className="mt-1 line-clamp-2 text-sm/5 text-secondary-foreground">
              {gist}
            </p>
          )
        )}
        <Details row={row} state={state} now={now} held={held} />
      </div>

      {/* The campaigns' column on a wide list; below it, the details line
          ends with them instead. */}
      <span className="hidden h-5 min-w-0 items-center gap-2 text-xs/4 text-secondary-foreground @4xl:flex">
        {held[0] && (
          <>
            <CampaignMark
              id={held[0].id}
              name={held[0].name}
              className="size-4 shrink-0 text-mark"
            />
            <span className="truncate">{held[0].name}</span>
            {held.length > 1 && (
              <span
                className="shrink-0 tabular-nums"
                title={held
                  .slice(1)
                  .map((c) => c.name)
                  .join(', ')}
              >
                +{held.length - 1}
              </span>
            )}
          </>
        )}
      </span>

      <span className="flex h-5 min-w-[76px] items-center justify-end text-xs/4">
        {state === 'ideas' && row.next_idea && row.idea_counts.waiting > 0 && (
          <WaitingIdeas row={row} campaignId={campaignId} now={now} />
        )}
      </span>
    </li>
  )
}

export const AssetListRow = memo(AssetListRowComponent)

/** The rings' geometry, the fit ring's own: a 20px circle, a 3px stroke. */
const RING_R = 8.5
const RING_C = 2 * Math.PI * RING_R

/**
 * A ring in the accent: how far an upload has gone, or — spinning, a
 * quarter drawn — a file being read.
 */
export function StateRing({
  value,
  spinning = false,
}: {
  value: number
  spinning?: boolean
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn(
        'size-5 -rotate-90',
        spinning && 'motion-safe:animate-spin',
      )}
      aria-hidden
    >
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
        strokeLinecap={spinning ? 'round' : undefined}
        className="stroke-accent"
        strokeDasharray={`${(RING_C * Math.max(0, Math.min(100, value))) / 100} ${RING_C}`}
      />
    </svg>
  )
}

/**
 * The card's 20px mark: what is happening to the file while something is,
 * and otherwise what it is — the kind's icon, or the picture itself.
 */
function AssetMark({ row, state }: { row: AssetListItem; state: RowState }) {
  const { t } = useTranslation()
  const box = 'flex size-5 shrink-0 items-center justify-center'
  if (state === 'reading')
    return (
      <span role="img" aria-label={t('content.list.reading')} className={box}>
        <StateRing value={25} spinning />
      </span>
    )
  if (state === 'failed')
    return (
      <span role="img" aria-label={t('content.list.failed')} className={box}>
        <WarningCircleIcon aria-hidden className="size-5 text-destructive" />
      </span>
    )
  return (
    <span className={box}>
      <AssetKindMark asset={row} />
    </span>
  )
}

/** What went wrong or is still partial; nothing at all when it is Ready. */
function partialLabel(t: TFunction, row: AssetListItem): string | null {
  if (row.status !== 'partial') return null
  return row.kind === 'web'
    ? t('content.list.status.partialPage')
    : row.kind === 'audio'
      ? t('content.list.status.partialAudio')
      : t('content.list.status.partial')
}

/**
 * The line under: what the file is ("94 pages", a page's site, a recording's
 * length), when it came — and when its source was published, when it said —
 * then at most one fact about where it stands, then its tags. Below the wide
 * layout, where they have no column, it ends with the campaigns.
 */
function Details({
  row,
  state,
  now,
  held,
}: {
  row: AssetListItem
  state: RowState
  now: Date
  held: { id: string; name: string }[]
}) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const retry = useRetryAssetAnalysis(row.id)
  const settling = row.status === 'pending' || row.status === 'processing'
  const domain = row.type === 'URL' ? hostOf(row.source_url) : null
  const pages = settling ? 0 : (row.file?.page_count ?? 0)
  const ms = row.file?.duration_ms ?? 0
  const { added, published } = rowDates(t, row, now, i18n.language)
  const partial = partialLabel(t, row)

  const bits: ReactNode[] = [
    domain && <span className="truncate">{domain}</span>,
    ms > 0 && <span className="shrink-0">{formatDuration(t, ms)}</span>,
    pages > 0 && (
      <span className="shrink-0">
        {t('content.extent.pages', { count: pages })}
      </span>
    ),
    added && (
      <span className="shrink-0" title={added.exact}>
        {added.label}
      </span>
    ),
    published && (
      <span className="shrink-0" title={published.exact}>
        {published.label}
      </span>
    ),
  ]
  // Where it stands, the one that asks for something first.
  bits.push(
    state === 'failed' ? (
      <span className="shrink-0 text-destructive">
        {t('content.list.failed')}
      </span>
    ) : state === 'reading' ? (
      <span className="shrink-0 text-foreground">
        {t('content.list.reading')}
      </span>
    ) : partial ? (
      <span className="truncate text-warning">{partial}</span>
    ) : state === 'noIdeas' ? (
      <span className="flex shrink-0 items-center gap-1.5">
        {t('content.list.noIdeas')}
        <TextButton
          disabled={retry.isPending}
          onClick={() =>
            retry.mutate(null, {
              // The row's own analysis status lives on the list, not under
              // the asset's key the hook refreshes.
              onSettled: () =>
                void qc.invalidateQueries({ queryKey: ASSET_LIST_KEY }),
            })
          }
        >
          {t('content.list.analyseAgain')}
        </TextButton>
      </span>
    ) : null,
  )
  if (row.tags.length > 0)
    bits.push(
      <span className="flex min-w-0 items-center gap-1">
        {row.tags.map((tag) => (
          <span
            key={tag.id}
            className="truncate rounded-button bg-tertiary px-1.5 text-foreground"
          >
            {tag.name}
          </span>
        ))}
      </span>,
    )
  const shown = bits.filter(Boolean)

  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs/4 text-secondary-foreground tabular-nums">
      {shown.map((bit, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden>·</span>}
          {bit}
        </span>
      ))}
      {held.length > 0 && (
        // Only below the wide layout, where the campaigns have no column.
        <span className="contents @4xl:hidden">
          {shown.length > 0 && <span aria-hidden>·</span>}
          <span className="truncate">{held.map((c) => c.name).join(', ')}</span>
        </span>
      )}
    </div>
  )
}

/** "infoq.com" — the domain alone, the path being noise in a list. */
function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * One idea's verdict as its mark alone, in the pill's colours: the word is its
 * name and its tooltip, so the card spends no width on four words it repeats.
 */
function VerdictMark({ verdict }: { verdict: VerdictKey }) {
  const { t } = useTranslation()
  const label = t(`content.list.ideaVerdict.${verdict}`)
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-5 items-center',
        verdict === 'waiting' && 'text-accent',
        verdict === 'yes' && 'text-positive',
        (verdict === 'later' || verdict === 'no') &&
          'text-secondary-foreground',
      )}
    >
      <HugeiconsIcon
        icon={VERDICT_ICON[verdict]}
        size={16}
        strokeWidth={1.8}
        aria-hidden
      />
    </span>
  )
}

/**
 * The card's list stops at five and a half ideas and scrolls past that: the
 * half idea at the foot is what says there is more. One idea with a two-line
 * note is 77px (10 + 20 + 2 + 34 + 10, and its 1px rule), the list adds 4px
 * above. A card of shorter ideas simply ends sooner.
 */
const CARD_MAX_HEIGHT = 4 + 77 * 5.5

/**
 * Where the card's first line sits below its top, and its last line above its
 * bottom, in px: the list's own padding, the item's, and half the line. The
 * card is shifted by these less half the row's 20px line, so the line it opens
 * from and the line it lists start (or, opening upward, end) level.
 */
const CARD_FIRST_LINE = 4 + 10 + 20 / 2
const CARD_LAST_LINE_TITLE = 4 + 10 + 20 / 2
const CARD_LAST_LINE_NOTE = 4 + 10 + 17 / 2
const ROW_LINE = 20 / 2
/** Opening upward over a list that scrolls, the card's foot meets the line's. */
const CARD_FOOT = ROW_LINE

/**
 * The ideas still waiting on the document, at the card's end where an idea
 * has its answers — "4 ideas →", opening the asset on its undecided pile,
 * where they are answered — and on hover or focus the asset's ideas beside it — best fit first (CON-385), each with its score
 * on a track, its title, its verdict as a mark alone, and up to two lines of
 * its note, as a list on a lifted card.
 *
 * The hover card lists every idea, best fit first, the next one included.
 *
 * The ideas are those of one reading: the workspace's in the bank, the
 * campaign's on a campaign's page — the same lens the row's counts are meant
 * to come from (CON-380). They are read from `GET /:id/analyses` only when the
 * list is first opened, and then cached under the asset's key, so a page of
 * fifty rows costs nothing until somebody points at one.
 */
function WaitingIdeas({
  row,
  campaignId,
  now,
}: {
  row: AssetListItem
  campaignId: string | null
  now: Date
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const analyses = useAssetAnalyses(row.id, {
    assetStatus: row.status,
    enabled: open,
  })
  const lens = analyses.data?.find(
    (a) => (a.campaign_id ?? null) === campaignId,
  )
  const ideas = [...(lens?.ideas ?? [])].sort(byFit)
  // Whether the list runs past the card, reported by the list once it has
  // been laid out: it decides where an upward card meets the line.
  const [overflowing, setOverflowing] = useState(false)

  const waiting = row.idea_counts.waiting
  const lineRef = useRef<HTMLAnchorElement>(null)
  // Opening downward, the card's first line is level with this one; when the
  // line sits low enough that the card would run off the foot of the screen,
  // it opens upward and its last line is level with this one instead — or,
  // when the list scrolls and its last visible line is half an idea, its foot.
  const [align, setAlign] = useState<'start' | 'end'>('start')
  const last = ideas[ideas.length - 1]
  const lastLine =
    align === 'start'
      ? CARD_FIRST_LINE
      : overflowing
        ? CARD_FOOT
        : last?.note
          ? CARD_LAST_LINE_NOTE
          : CARD_LAST_LINE_TITLE
  const onOpenChange = (next: boolean) => {
    if (next && lineRef.current) {
      const { top } = lineRef.current.getBoundingClientRect()
      setAlign(top > window.innerHeight * 0.6 ? 'end' : 'start')
    }
    setOpen(next)
  }

  return (
    <Tooltip open={open} onOpenChange={onOpenChange} delayDuration={250}>
      <TooltipTrigger asChild>
        <Link
          ref={lineRef}
          {...assetLink(row, campaignId, 'waiting')}
          // Every verdict's count, spelled out, as its name.
          aria-label={verdictSentence(t, row.idea_counts)}
          className="font-medium whitespace-nowrap text-accent tabular-nums outline-none hover:underline focus-visible:underline"
        >
          {t('content.list.ideasWaiting', {
            count: waiting,
            formatted: formatNumber(waiting, {}, i18n.language),
          })}
        </Link>
      </TooltipTrigger>
      {/* A light card lifted off the row by its shadow, pointing back at the
          line it opens from: the ideas, one to a block, with a pale
          rule between them. Radix negates the offset when aligned to the end,
          so one negative figure lifts the card opening downward and lowers it
          opening upward. */}
      <TooltipContent
        side="left"
        align={align}
        sideOffset={10}
        alignOffset={-(lastLine - ROW_LINE)}
        className="w-104 max-w-104 rounded-lg p-0 text-left shadow-lg [text-wrap:pretty]"
      >
        {analyses.isPending || ideas.length === 0 ? (
          <div className="px-3 py-1">
            <p className="px-1 py-2.5 text-xs/5 text-secondary-foreground">
              {analyses.isPending
                ? t('content.list.otherIdeasLoading')
                : t('content.list.otherIdeasNone')}
            </p>
          </div>
        ) : (
          <IdeaScroller onOverflow={setOverflowing}>
            {ideas.map((idea) => (
              <li
                key={idea.id}
                className="grid grid-cols-[20px_minmax(0,1fr)_auto] gap-x-3 border-t border-quaternary px-1 py-2.5 first:border-t-0"
              >
                <FitRing score={idea.fit_score} />
                <span className="text-xs/5 text-foreground">{idea.title}</span>
                <VerdictMark verdict={ideaVerdictKey(idea, now)} />
                {idea.note && (
                  <span className="col-span-2 col-start-2 mt-0.5 line-clamp-2 text-xs/[17px] text-secondary-foreground">
                    {idea.note}
                  </span>
                )}
              </li>
            ))}
          </IdeaScroller>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The card's list, five and a half ideas tall at most and scrolling past
 * that. Every idea is here — the card scrolls rather than stopping at a count
 * and saying "and N more".
 *
 * The rules are inset by the list's own padding, so they stop short of the
 * card's edges. Score, then words, then the verdict: the scores make one
 * column down the left, the titles another beside it.
 */
function IdeaScroller({
  onOverflow,
  children,
}: {
  onOverflow: (overflowing: boolean) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const report = () => onOverflow(el.scrollHeight > el.clientHeight + 1)
    report()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(report)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)
    return () => observer.disconnect()
  }, [onOverflow])

  return (
    // Its own clip, not the tooltip's: the tooltip carries the arrow, which
    // has to stand outside the card.
    <div className="overflow-hidden rounded-lg">
      <div
        ref={ref}
        className="overflow-y-auto overscroll-contain [scrollbar-width:thin]"
        style={{ maxHeight: CARD_MAX_HEIGHT }}
      >
        <ul className="flex flex-col px-3 py-1">{children}</ul>
      </div>
    </div>
  )
}

/**
 * The campaigns a document is filed in, by name — only the others on a
 * campaign's own page, where that one goes without saying. Nothing until the
 * names have arrived, and nothing for a document in none: "No campaign" down
 * every unfiled row said what an empty slot already does.
 */
function heldCampaigns(
  row: AssetListItem,
  campaignId: string | null,
  names: Map<string, string>,
  ready: boolean,
): { id: string; name: string }[] {
  if (!ready) return []
  return row.campaign_ids
    .filter((id) => id !== campaignId)
    .map((id) => ({ id, name: names.get(id) }))
    .filter((c): c is { id: string; name: string } => !!c.name)
}
