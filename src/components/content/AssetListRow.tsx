import { memo, type ReactNode } from 'react'
import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  Alert02Icon,
  Delete02Icon,
  IdeaIcon,
  Loading03Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { useRetryAssetAnalysis } from '@/hooks/useAssetAnalyses'
import { ASSET_LIST_KEY } from '@/hooks/useContent'
import { cn } from '@/lib'
import {
  assetLink,
  formatDuration,
  listTitle,
  rowDate,
  rowState,
} from '@/lib/assetList'
import { statusToBadge } from '@/lib/assetStatus'
import { ingestFailureMessage } from '@/lib/uploadError'
import type { AssetListItem } from '@/types/assetList'
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
        className={cn(
          'mt-1.5',
          !selecting &&
            !selected &&
            'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
        )}
      />

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-3">
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

        <div className="flex min-w-0 flex-col gap-2.5 pl-11">
          {row.match ? (
            <div className="mt-1.5">
              <MatchSnippet match={row.match} />
            </div>
          ) : (
            gist &&
            state !== 'reading' &&
            state !== 'failed' && (
              <p className="mt-1.5 line-clamp-2 text-sm text-secondary-foreground">
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

      <div className="flex flex-col items-start gap-2 pr-9 @4xl:col-start-5">
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
          with no hover shows it. No box and no border: a bin is a mark. */}
      <Button
        variant="ghost"
        size="xsIcon"
        aria-label={t('content.list.deleteRow', { title })}
        className="absolute top-4 right-4 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-transparent focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        onClick={() => onDelete(row)}
      >
        <HugeiconsIcon
          icon={Delete02Icon}
          size={20}
          strokeWidth={1.5}
          aria-hidden
          className="text-secondary-foreground hover:text-destructive"
        />
      </Button>
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
 * "PDF · 94 pages · published 14 months ago" — what kind of thing it is, how
 * much of it there is, and how old. A page names its site; a recording its
 * length. The tags are not here: they have a column of their own.
 */
function Facts({ row, now }: { row: AssetListItem; now: Date }) {
  const { t, i18n } = useTranslation()
  const settling = row.status === 'pending' || row.status === 'processing'
  const domain = row.type === 'URL' ? hostOf(row.source_url) : null
  const pages = settling ? 0 : (row.file?.page_count ?? 0)
  const ms = row.file?.duration_ms ?? 0
  const date = rowDate(t, row, now, i18n.language)
  const facts = [
    t(`content.list.kind.${row.kind}`),
    domain,
    ms > 0 ? formatDuration(t, ms) : null,
    pages > 0 ? t('content.extent.pages', { count: pages }) : null,
  ].filter(Boolean)
  const partial = partialLabel(t, row)
  return (
    <span className="flex flex-wrap items-center gap-x-2 text-xs text-secondary-foreground">
      <span className="tabular-nums">
        {facts.join(' · ')}
        {date && (
          <>
            {' · '}
            <span title={date.exact}>{date.label}</span>
          </>
        )}
      </span>
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
      const more = row.idea_counts.waiting - 1
      return (
        <p className="flex min-w-0 items-center gap-2 text-sm">
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
      )
    }
    case 'reading':
      return (
        <StatusLine icon={Loading03Icon} iconClass="text-accent">
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
