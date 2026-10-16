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
  ideaVerdictKey,
  listTitle,
  rowDates,
  rowState,
} from '@/lib/assetList'
import { statusToBadge } from '@/lib/assetStatus'
import { byFit } from '@/lib/ideaFit'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { VerdictKey } from '@/lib/assetList'
import type { AssetListItem, AssetNextIdea } from '@/types/assetList'
import { CampaignMark } from './asset-page/CampaignMark'
import { AssetKindMark } from './AssetKindMark'
import { FitTrack } from './FitTrack'
import { MatchSnippet } from './MatchSnippet'
import { VERDICT_ICON } from './verdictIcons'
import { VerdictPill } from './VerdictPill'

/**
 * One document on the Assets list (CON-378), read for what it is good for.
 *
 * Four columns, and three of them hold still. The check box; then the text,
 * capped at its measure so it never re-wraps as the window widens; then the
 * verdict pill, alone, right after the text, so how many ideas are waiting
 * reads with the next one's name; then — past a spacer that takes all the
 * slack — what the document belongs to, at the far edge, as reference rather
 * than headline: its campaigns, one to a line, then its tags. On a narrow list
 * those fold back under the title, campaigns first on the same line as the
 * tags, and the spacer goes.
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
  const held = heldCampaigns(row, campaignId, campaignNames, campaignsReady)
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
        // The pill's column is 160px behind a 28px inset, which makes 48px
        // between it and the text; the tags' is 168px plus the bin's 40px.
        '@4xl:grid-cols-[16px_minmax(0,calc(72ch+40px))_188px_minmax(0,1fr)_208px]',
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
            {(held.length > 0 || tags) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 @4xl:hidden">
                <CampaignList campaigns={held} className="flex-wrap gap-x-3" />
                {tags}
              </div>
            )}
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
          <IdeaLine row={row} state={state} campaignId={campaignId} now={now} />
        </div>
      </div>

      {/* The bin's corner is this column's below the wide layout, the tags'
          above it. */}
      <div className="flex flex-col items-start gap-2 pr-10 @4xl:pr-0 @4xl:pl-7">
        {state === 'ideas' && (
          <VerdictPill
            counts={row.idea_counts}
            link={(verdict) => assetLink(row, campaignId, verdict)}
          />
        )}
      </div>

      {/* Hidden, not merely empty, below the wide layout: the campaigns and
          the tags are under the title there, and an empty grid item would
          still take a column. Past the spacer, and clear of the bin in the
          corner: the campaigns one to a line, then the tags a step below. */}
      <div className="hidden flex-col gap-2.5 pt-1 pr-10 @4xl:col-start-5 @4xl:flex">
        <CampaignList campaigns={held} className="flex-col" />
        {tags}
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
  now,
}: {
  row: AssetListItem
  state: ReturnType<typeof rowState>
  campaignId: string | null
  now: Date
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const retry = useRetryAssetAnalysis(row.id)

  switch (state) {
    case 'ideas': {
      const next = row.next_idea
      if (!next) return null
      return (
        <NextIdea row={row} campaignId={campaignId} next={next} now={now} />
      )
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

/** How many ideas the hover card names before "and N more". */
const CARD_IDEAS_SHOWN = 8

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

/**
 * The next idea's title and how many more, as one link, and on hover or focus
 * the asset's ideas beside it — best fit first (CON-385), each with its score
 * on a track, its title, its verdict as a mark alone, and up to two lines of
 * its note, as a list on a lifted card.
 *
 * The card lists every idea, the next one included: it is the best fit, so it
 * heads the card, on the same line as the row's own. Leaving it out made the
 * card a list of everything *but* the idea worth reading first.
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
  now,
}: {
  row: AssetListItem
  campaignId: string | null
  next: AssetNextIdea
  now: Date
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
  const ideas = [...(lens?.ideas ?? [])].sort(byFit)
  const shown = ideas.slice(0, CARD_IDEAS_SHOWN)
  const hidden = ideas.length - shown.length

  const more = row.idea_counts.waiting - 1
  const lineRef = useRef<HTMLParagraphElement>(null)
  // Opening downward, the card's first line is level with this one; when the
  // line sits low enough that the card would run off the foot of the screen,
  // it opens upward and its last line is level with this one instead.
  const [align, setAlign] = useState<'start' | 'end'>('start')
  const last = shown[shown.length - 1]
  const lastLine =
    align === 'end' && shown.length > 0 && hidden === 0 && last?.note
      ? CARD_LAST_LINE_NOTE
      : align === 'end'
        ? CARD_LAST_LINE_TITLE
        : CARD_FIRST_LINE
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
          {/* One link and one underline, "and N more" included: the count is
              a way into the same undecided pile as the title. The title gives
              way to it when the line is short of room; the space before the
              count is inside its span so the underline runs on unbroken. */}
          <Link
            {...assetLink(row, campaignId, 'waiting')}
            className="group/next flex min-w-0 underline-offset-3 outline-none"
          >
            <span className="min-w-0 truncate text-foreground underline decoration-quinary group-hover/next:decoration-foreground group-focus-visible/next:decoration-foreground">
              {next.title}
            </span>
            {more > 0 && (
              <span className="shrink-0 whitespace-pre text-secondary-foreground underline decoration-quinary group-hover/next:decoration-foreground group-focus-visible/next:decoration-foreground">
                {' '}
                {t('content.list.nextIdeaMore', { count: more })}
              </span>
            )}
          </Link>
        </p>
      </TooltipTrigger>
      {/* A light card lifted off the row by its shadow, pointing back at the
          line it opens from: the ideas, one to a block, with a pale
          rule between them. Radix negates the offset when aligned to the end,
          so one negative figure lifts the card opening downward and lowers it
          opening upward. */}
      <TooltipContent
        side="right"
        align={align}
        sideOffset={10}
        alignOffset={-(lastLine - ROW_LINE)}
        className="w-104 max-w-104 rounded-lg p-0 text-left shadow-lg [text-wrap:pretty]"
      >
        {analyses.isPending || shown.length === 0 ? (
          <div className="px-3 py-1">
            <p className="px-1 py-2.5 text-[12.5px]/5 text-secondary-foreground">
              {analyses.isPending
                ? t('content.list.otherIdeasLoading')
                : t('content.list.otherIdeasNone')}
            </p>
          </div>
        ) : (
          // The rules are inset by the list's own padding, so they stop short
          // of the card's edges. Score, then words: the scores make one column
          // down the left, the titles another beside it.
          <ul className="flex flex-col px-3 py-1">
            {shown.map((idea) => (
              <li
                key={idea.id}
                className="grid grid-cols-[4rem_minmax(0,1fr)_auto] gap-x-3 border-t border-quaternary px-1 py-2.5 first:border-t-0"
              >
                <FitTrack score={idea.fit_score} />
                <span className="text-[12.5px]/5 text-foreground">
                  {idea.title}
                </span>
                <VerdictMark verdict={ideaVerdictKey(idea, now)} />
                {idea.note && (
                  <span className="col-span-2 col-start-2 mt-0.5 line-clamp-2 text-xs/[17px] text-secondary-foreground">
                    {idea.note}
                  </span>
                )}
              </li>
            ))}
            {hidden > 0 && (
              <li className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 border-t border-quaternary px-1 py-2.5 text-[12.5px]/5 text-secondary-foreground">
                <span className="col-start-2">
                  {t('content.list.nextIdeaMore', { count: hidden })}
                </span>
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

/** Each campaign with its mark; the caller says whether they stack or run on. */
function CampaignList({
  campaigns,
  className,
}: {
  campaigns: { id: string; name: string }[]
  className?: string
}) {
  if (campaigns.length === 0) return null
  return (
    <ul className={cn('flex min-w-0 gap-1', className)}>
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
