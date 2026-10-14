import { memo, useRef, useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Alert02Icon,
  Clock01Icon,
  Delete02Icon,
  IdeaIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
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
  listTitle,
  rowDates,
  rowState,
} from '@/lib/assetList'
import { statusToBadge } from '@/lib/assetStatus'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { AssetListItem, AssetNextIdea } from '@/types/assetList'
import { CampaignMark } from './asset-page/CampaignMark'
import { AssetKindMark } from './AssetKindMark'
import { MatchSnippet } from './MatchSnippet'
import { VERDICT_ICON } from './verdictIcons'
import { VerdictPill } from './VerdictPill'

/**
 * One document on the Assets list (CON-378), read for what it is good for.
 *
 * Four columns, and three of them hold still. The check box; then the text,
 * capped at its measure so it never re-wraps as the window widens; then the
 * tags, right after the text rather than at the far edge; then — past a
 * spacer that takes all the slack — the verdict pill and the campaign. On a
 * narrow list the tags fold back under the title, which is where they read
 * second-best, and the spacer goes.
 *
 * The text column leads with the kind and the title, then one line of facts,
 * then what the document says (or, while a text search runs, where it
 * matched), then one line about its ideas: the next undecided one by name, or
 * why there are none yet. Nothing on the row answers an idea — one place to
 * decide, the asset page, as the pill already holds to.
 */
export type AssetListRowProps = {
  row: AssetListItem
  /** The campaign whose page this is, or null in the workspace bank. */
  campaignId: string | null
  /** Live campaign names by id; `ready` once they have arrived. */
  campaignNames: Map<string, string>
  campaignsReady: boolean
  selected: boolean
  /** Something is ticked somewhere, so every row shows its check box. */
  selecting: boolean
  onToggle: (id: string) => void
  /** Asks for this document to be deleted — the list answers with a confirmation. */
  onDelete: (row: AssetListItem) => void
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
  onDelete,
  now,
}: AssetListRowProps) {
  const { t } = useTranslation()
  const title = listTitle(row, t('content.list.untitled'))
  const state = rowState(row)
  const gist = row.gist?.trim()
  const tags =
    row.tags.length > 0 ? (
      <span className="flex flex-wrap content-start gap-1">
        {row.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-tertiary px-2 py-px text-xs text-foreground"
          >
            {tag.name}
          </span>
        ))}
      </span>
    ) : null

  return (
    <li
      className={cn(
        'group relative grid grid-cols-[16px_minmax(0,1fr)_200px] gap-x-5 border-b border-quaternary px-5 pt-5 pb-5.5 last:border-b-0',
        '@4xl:grid-cols-[16px_minmax(0,calc(72ch+40px))_168px_minmax(0,1fr)_200px]',
        'hover:bg-secondary focus-within:bg-secondary',
        selected && 'bg-secondary',
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(row.id)}
        aria-label={t('content.list.selectRow', { title })}
        // Top-aligned with the kind mark's glyph, which sits a few pixels
        // inside its 32px box.
        className={cn(
          'mt-1 transition-opacity duration-200 ease-out motion-reduce:transition-none',
          !selecting &&
            !selected &&
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center">
            <AssetKindMark asset={row} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3
              className={cn(
                'text-base/6 font-semibold break-words',
                (state === 'reading' || state === 'failed') &&
                  'text-secondary-foreground',
              )}
            >
              <Link
                {...assetLink(row, campaignId)}
                className="outline-none hover:underline focus-visible:underline"
              >
                {title}
              </Link>
            </h3>
            <Facts row={row} now={now} />
            {tags && <div className="pt-1 @4xl:hidden">{tags}</div>}
          </div>
        </div>

        {/* The same gap under the head whatever comes first — a summary, a
            match, or a state line on a document still being read. */}
        <div className="mt-2 flex min-w-0 flex-col gap-2.5 pl-11 empty:hidden">
          {row.match ? (
            <MatchSnippet match={row.match} />
          ) : (
            gist &&
            state !== 'reading' &&
            state !== 'failed' && (
              <p className="line-clamp-2 text-sm text-secondary-foreground">
                {gist}
              </p>
            )
          )}
          <IdeaLine row={row} state={state} campaignId={campaignId} />
        </div>
      </div>

      {/* Hidden, not merely empty, below the wide layout: the tags are under
          the title there, and an empty grid item would still take a column. */}
      <div className="hidden pt-1 @4xl:block">{tags}</div>

      <div className="flex flex-col items-start gap-2 pr-10 @4xl:col-start-5">
        {state === 'ideas' && (
          <VerdictPill
            counts={row.idea_counts}
            link={(verdict) => assetLink(row, campaignId, verdict)}
          />
        )}
        <Campaigns
          row={row}
          campaignId={campaignId}
          names={campaignNames}
          ready={campaignsReady}
        />
      </div>

      {/* Out of sight until the row is pointed at or something in it is
          focused — still a tab stop, still the same confirmation. A screen
          with no hover shows it. No box and no border: a bin is a mark.
          18px, centred on the check box's line (row inset 20 + 4 + half of
          12 = 30px down, less half of 18). */}
      <button
        type="button"
        aria-label={t('content.list.deleteRow', { title })}
        className="absolute top-[21px] right-5 flex size-[18px] items-center justify-center text-secondary-foreground opacity-0 outline-none transition-opacity duration-200 ease-out group-focus-within:opacity-100 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        onClick={() => onDelete(row)}
      >
        <HugeiconsIcon
          icon={Delete02Icon}
          size={18}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>
    </li>
  )
}

export const AssetListRow = memo(AssetListRowComponent)

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
 * "94 pages · added 2 days ago", then the publication date in a chip when the
 * source said when it was published. No kind word: the mark before the title
 * already says it. A page names its site, a recording its length; the tags
 * have a column of their own.
 */
function Facts({ row, now }: { row: AssetListItem; now: Date }) {
  const { t, i18n } = useTranslation()
  const settling = row.status === 'pending' || row.status === 'processing'
  const domain = row.type === 'URL' ? hostOf(row.source_url) : null
  const pages = settling ? 0 : (row.file?.page_count ?? 0)
  const ms = row.file?.duration_ms ?? 0
  const { added, published } = rowDates(t, row, now, i18n.language)
  const facts = [
    domain,
    ms > 0 ? formatDuration(t, ms) : null,
    pages > 0 ? t('content.extent.pages', { count: pages }) : null,
  ].filter(Boolean)
  const partial = partialLabel(t, row)
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-secondary-foreground">
      <span className="tabular-nums">
        {facts.join(' · ')}
        {added && (
          <>
            {facts.length > 0 && ' · '}
            <span title={added.exact}>{added.label}</span>
          </>
        )}
      </span>
      {published && (
        <span
          title={published.exact}
          className="inline-flex items-center gap-1 rounded-full bg-tertiary px-2 py-px text-foreground"
        >
          <HugeiconsIcon
            icon={Clock01Icon}
            size={12}
            strokeWidth={1.8}
            aria-hidden
          />
          {published.label}
        </span>
      )}
      {partial && (
        <StatusBadge
          tone={statusToBadge(row.status).tone}
          label={partial}
          className="text-warning"
        />
      )}
    </span>
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
 * The line about the document's ideas, which is the point of the row.
 *
 * With ideas waiting, the next one by name — the oldest undecided, as the
 * server picks it (CON-379) — opening the asset on its undecided pile, where
 * it is answered; then how many more. With none waiting, nothing: the pill
 * already says they are all answered. Otherwise why there are none: still
 * reading, couldn't read, or read and found nothing.
 */
function IdeaLine({
  row,
  state,
  campaignId,
}: {
  row: AssetListItem
  state: ReturnType<typeof rowState>
  campaignId: string | null
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const retry = useRetryAssetAnalysis(row.id)

  switch (state) {
    case 'ideas': {
      const next = row.next_idea
      if (!next) return null
      return <NextIdea row={row} campaignId={campaignId} next={next} />
    }
    case 'reading':
      return (
        <StatusLine
          icon={Loading03Icon}
          iconClass="text-accent motion-safe:animate-spin"
        >
          <strong className="font-medium text-foreground">
            {t('content.list.readingTitle')}
          </strong>{' '}
          {t('content.list.readingBody')}
        </StatusLine>
      )
    case 'failed':
      return (
        <StatusLine icon={Alert02Icon} iconClass="text-destructive">
          <strong className="font-medium text-foreground">
            {t('content.list.failedTitle')}
          </strong>{' '}
          {ingestFailureMessage(t, row)} {t('content.list.failedNext')}
        </StatusLine>
      )
    case 'noIdeas':
      return (
        <StatusLine icon={IdeaIcon} iconClass="text-secondary-foreground">
          {t('content.list.noIdeas')}{' '}
          <button
            type="button"
            className="text-foreground underline decoration-quinary underline-offset-3 outline-none hover:decoration-foreground focus-visible:decoration-foreground disabled:opacity-50"
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
          </button>
        </StatusLine>
      )
    case 'unanalysed':
      return null
  }
}

/** How many of the other ideas the hover list names before "and N more". */
const OTHER_IDEAS_SHOWN = 8

/**
 * The next idea's title, and on hover or focus the asset's other ideas beside
 * it — their titles, as a list on a lifted card.
 *
 * The ideas are those of one reading: the workspace's in the bank, the
 * campaign's on a campaign's page — the same lens the row's counts are meant
 * to come from (CON-380). They are read from `GET /:id/analyses` only when the
 * list is first opened, and then cached under the asset's key, so a page of
 * fifty rows costs nothing until somebody points at one.
 */
function NextIdea({
  row,
  campaignId,
  next,
}: {
  row: AssetListItem
  campaignId: string | null
  next: AssetNextIdea
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const analyses = useAssetAnalyses(row.id, {
    assetStatus: row.status,
    enabled: open,
  })
  const lens = analyses.data?.find(
    (a) => (a.campaign_id ?? null) === campaignId,
  )
  const others = (lens?.ideas ?? []).filter((idea) => idea.id !== next.id)
  const shown = others.slice(0, OTHER_IDEAS_SHOWN)

  const more = row.idea_counts.waiting - 1
  const lineRef = useRef<HTMLParagraphElement>(null)
  // Top-aligned with the line, unless the line sits low enough that the card
  // would run off the foot of the screen — then bottom-aligned with it.
  const [align, setAlign] = useState<'start' | 'end'>('start')
  const onOpenChange = (next: boolean) => {
    if (next && lineRef.current) {
      const { top } = lineRef.current.getBoundingClientRect()
      setAlign(top > window.innerHeight * 0.6 ? 'end' : 'start')
    }
    setOpen(next)
  }

  return (
    <Tooltip open={open} onOpenChange={onOpenChange} delayDuration={250}>
      {/* The whole line is the trigger, and only as wide as its words, so the
          card opens after "and N more" rather than over it. */}
      <TooltipTrigger asChild>
        <p
          ref={lineRef}
          className="inline-flex max-w-full min-w-0 items-center gap-2 self-start text-sm"
        >
          <HugeiconsIcon
            icon={VERDICT_ICON.waiting}
            size={16}
            strokeWidth={1.8}
            aria-hidden
            className="shrink-0 text-accent"
          />
          <Link
            {...assetLink(row, campaignId, 'waiting')}
            className="min-w-0 truncate text-foreground underline decoration-quinary underline-offset-3 outline-none hover:decoration-foreground focus-visible:decoration-foreground"
          >
            {next.title}
          </Link>
          {more > 0 && (
            <span className="shrink-0 text-secondary-foreground">
              {t('content.list.nextIdeaMore', { count: more })}
            </span>
          )}
        </p>
      </TooltipTrigger>
      {/* A light card lifted off the row by its shadow, pointing back at the
          idea it belongs to: the other ideas' titles, one to a line, with a
          pale rule between them. */}
      <TooltipContent
        side="right"
        align={align}
        sideOffset={10}
        className="max-w-xs rounded-lg p-0 text-left shadow-lg [text-wrap:pretty]"
      >
        {analyses.isPending ? (
          <p className="px-4 py-3 text-xs text-secondary-foreground">
            {t('content.list.otherIdeasLoading')}
          </p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-3 text-xs text-secondary-foreground">
            {t('content.list.otherIdeasNone')}
          </p>
        ) : (
          // The rules are inset by the list's own padding, so they stop short
          // of the card's edges.
          <ul className="flex flex-col px-3 py-1">
            {shown.map((idea) => (
              <li
                key={idea.id}
                className="border-t border-quaternary px-1 py-2 text-xs text-foreground first:border-t-0"
              >
                {idea.title}
              </li>
            ))}
            {others.length > shown.length && (
              <li className="border-t border-quaternary px-1 py-2 text-xs text-secondary-foreground">
                {t('content.list.nextIdeaMore', {
                  count: others.length - shown.length,
                })}
              </li>
            )}
          </ul>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function StatusLine({
  icon,
  iconClass,
  children,
}: {
  icon: IconSvgElement
  iconClass: string
  children: ReactNode
}) {
  return (
    <p className="flex items-start gap-2 text-sm text-secondary-foreground">
      <HugeiconsIcon
        icon={icon}
        size={16}
        strokeWidth={1.8}
        aria-hidden
        className={cn('mt-0.5 shrink-0', iconClass)}
      />
      <span>{children}</span>
    </p>
  )
}

/**
 * The campaigns holding the document, each with its mark — on a campaign's
 * own page, only the others, since every row is in that one and saying so
 * forty times is noise. "No campaign" is said only in the bank, and only once
 * the campaigns have arrived, so it is never a guess.
 */
function Campaigns({
  row,
  campaignId,
  names,
  ready,
}: {
  row: AssetListItem
  campaignId: string | null
  names: Map<string, string>
  ready: boolean
}) {
  const { t } = useTranslation()
  if (!ready) return null
  const campaigns = row.campaign_ids
    .filter((id) => id !== campaignId)
    .map((id) => ({ id, name: names.get(id) }))
    .filter((c): c is { id: string; name: string } => !!c.name)
  if (campaigns.length === 0)
    return campaignId ? null : (
      <span className="text-xs text-secondary-foreground">
        {t('content.filter.noCampaign')}
      </span>
    )
  return (
    <ul className="flex min-w-0 flex-col gap-1">
      {campaigns.map((c) => (
        <li key={c.id} className="flex min-w-0 items-center gap-1.5 text-xs">
          <CampaignMark
            id={c.id}
            name={c.name}
            className="size-4 text-[10px]"
          />
          <span className="truncate">{c.name}</span>
        </li>
      ))}
    </ul>
  )
}
