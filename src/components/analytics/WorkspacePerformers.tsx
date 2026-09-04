import { useTranslation } from 'react-i18next'
import { AccountAvatar } from '@/components/ui/account-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/intl'
import { resolvePlatformInfo } from '@/lib/platformDictionary'
import { PaceBar, RankBar } from './charts'
import { InsightLine } from './ComparisonSections'
import { Picker } from './ComparisonBar'
import { Basis, NotYet, SectionCard } from './shell'
import { periodPhrase } from './format'
import {
  basisLabel,
  PERFORMER_BASES,
  type PerformerRowView,
  type PerformersBoardView,
} from '@/lib/analyticsPerformersView'
import type { AnalyticsPerformersResult } from '@/hooks/useAnalyticsPerformers'
import type { PerformerSort } from '@/types/analytics'

/**
 * Performers and outliers — both ends of the window (CON-238).
 *
 * The card that answers the only question the overview provokes: *which posts
 * did this?* Two ends rather than a top-five, because the pair is the finding —
 * ten posts within a whisker of each other is a different month from three
 * carrying everything and five doing nothing, and only seeing both ends at once
 * says which one this was. Neither list is a leaderboard; the worst five are
 * yours, published on purpose.
 *
 * Every row is scored against the typical post **on its platform at its own
 * age**, which is what stops the ranking from being a list sorted by age
 * wearing the clothes of quality. A post from this morning has earned a
 * fraction of what it will; one from three weeks ago has finished.
 *
 * The ranking is the server's — see `lib/analyticsPerformersView` for what that
 * costs and what it buys. Two consequences show up here: the picker refetches
 * rather than re-sorts, and the card can only say what was *not sent*, never
 * what was held out for want of data.
 */
export function WorkspacePerformersView({
  result,
  by,
  onChangeBasis,
}: {
  result: AnalyticsPerformersResult
  by: PerformerSort
  onChangeBasis: (by: PerformerSort) => void
}) {
  const { t } = useTranslation()
  const { view, isPending, isError, isUnavailable, isEmpty } = result

  if (isPending) {
    return <Skeleton className="h-80 w-full max-w-content mx-auto" />
  }

  if (isUnavailable) {
    return (
      <Shell by={by} onChangeBasis={onChangeBasis} withPicker={false}>
        <NotYet title={t('analytics.performers.unavailableTitle')}>
          {t('analytics.performers.unavailableBody')}
        </NotYet>
      </Shell>
    )
  }

  // Above the error branch, for the same reason as the overview's: `no_data` is
  // a successful answer that carries no payload, and reporting it as a failure
  // tells a workspace that simply hasn't published that something is broken.
  if (isEmpty) {
    return (
      <Shell by={by} onChangeBasis={onChangeBasis} withPicker={false}>
        <NotYet title={t('analytics.performers.emptyTitle')}>
          {t('analytics.performers.emptyBody')}
        </NotYet>
      </Shell>
    )
  }

  if (isError || !view) {
    return (
      <Shell by={by} onChangeBasis={onChangeBasis} withPicker={false}>
        <NotYet title={t('analytics.performers.errorTitle')}>
          {t('analytics.performers.errorBody')}
        </NotYet>
      </Shell>
    )
  }

  return <Board view={view} by={by} onChangeBasis={onChangeBasis} />
}

/**
 * The card's frame, so every withdrawal keeps the heading it withdrew from.
 *
 * The picker is dropped in those states on purpose: re-ranking an empty board
 * is a control that teaches people it does nothing.
 */
function Shell({
  by,
  onChangeBasis,
  withPicker,
  qualifier,
  children,
}: {
  by: PerformerSort
  onChangeBasis: (by: PerformerSort) => void
  withPicker: boolean
  qualifier?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <SectionCard
      title={t('analytics.performers.title')}
      qualifier={qualifier}
      status={
        withPicker ? (
          <Picker
            label={t('analytics.performers.by')}
            value={basisLabel(t, by)}
            options={PERFORMER_BASES.map((id) => ({
              value: id,
              label: basisLabel(t, id),
            }))}
            onChange={(v) => onChangeBasis(v as PerformerSort)}
          />
        ) : undefined
      }
    >
      {children}
    </SectionCard>
  )
}

function Board({
  view,
  by,
  onChangeBasis,
}: {
  view: PerformersBoardView
  by: PerformerSort
  onChangeBasis: (by: PerformerSort) => void
}) {
  const { t } = useTranslation()
  /*
    One list or two. The server fills the best end first and gives the worst end
    what is left over, so the two are never the same post twice and are often
    different lengths — which is why each heading counts itself rather than
    claiming a five. Below four posts there are no two ends at all, and the card
    says so instead of drawing a "worst" list of one.
  */
  const split =
    view.worst.length > 0 && view.best.length + view.worst.length >= 4
  // The strongest figure in the ranking: the scale for the fallback bar, used
  // on the rows the server could not place against a typical.
  const leader = view.best[0]?.value ?? 0

  return (
    <Shell
      by={by}
      onChangeBasis={onChangeBasis}
      withPicker
      qualifier={periodPhrase(t, view.period)}
    >
      {split ? (
        <>
          <PostList
            heading={t('analytics.performers.best', {
              count: view.best.length,
            })}
            rows={view.best}
            by={by}
            leader={leader}
          />
          <PostList
            heading={t('analytics.performers.worst', {
              count: view.worst.length,
            })}
            rows={view.worst}
            by={by}
            leader={leader}
          />
        </>
      ) : (
        <PostList
          heading={t('analytics.performers.all', {
            count: view.best.length + view.worst.length,
          })}
          rows={[...view.best, ...view.worst]}
          by={by}
          leader={leader}
          note={t('analytics.performers.singleListNote')}
        />
      )}

      {view.insights.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {view.insights.map((insight) => (
            <li key={insight.id}>
              <InsightLine insight={insight} />
            </li>
          ))}
        </ul>
      )}

      {/*
        One note, not a stack of them: what the bar's centre is, and what the
        board isn't showing. The middle of the distribution is never sent, and a
        reader counting rows against "nine posts this period" has to be told
        that rather than left to work it out.
      */}
      <Basis>
        {view.hidden > 0 && (
          <>{t('analytics.performers.hidden', { count: view.hidden })} </>
        )}
        {view.withoutBaseline > 0 && (
          <>
            {t('analytics.performers.withoutBaseline', {
              count: view.withoutBaseline,
            })}{' '}
          </>
        )}
        {t('analytics.performers.barBasis')}
        {view.lastRefreshedAt && (
          <>
            {' '}
            {t('analytics.performers.updated', { when: view.lastRefreshedAt })}
          </>
        )}
      </Basis>
    </Shell>
  )
}

/**
 * One end of the window.
 *
 * The heading and the column labels share a line: two rows of chrome above a
 * five-row list is most of a list, and the labels are only read on the way in.
 */
function PostList({
  heading,
  rows,
  by,
  leader,
  note,
}: {
  heading: string
  rows: PerformerRowView[]
  by: PerformerSort
  leader: number
  note?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-3 border-b border-border pb-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm font-medium">{heading}</h3>
          {note && <p className="text-xs text-tertiary-foreground">{note}</p>}
        </div>
        <span className="w-36 shrink-0 text-right text-xs leading-tight text-tertiary-foreground">
          {basisLabel(t, by)}
        </span>
        <span className="w-28 shrink-0 text-right text-xs text-tertiary-foreground">
          {t('analytics.performers.publishedColumn')}
        </span>
      </div>

      <ul className="flex flex-col">
        {rows.map((row) => (
          <PostRow key={row.id} row={row} leader={leader} />
        ))}
      </ul>
    </div>
  )
}

function PostRow({ row, leader }: { row: PerformerRowView; leader: number }) {
  const { t } = useTranslation()
  const platform = resolvePlatformInfo(row.platform)

  /*
    Top-aligned, not centred. The three things a reader compares down the list —
    the title, the figure and the date — are each the first line of their
    column, and centring a two-line column against a three-line one puts the
    figure half a line below the title it belongs to.
  */
  return (
    <li className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
      {/* The picture first, and spanning both lines, because the account is how
          a workspace with four Instagram profiles reads its own list. */}
      <AccountAvatar
        src={row.account.avatarUrl}
        name={row.account.name}
        platform={platform}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="min-w-0 truncate text-sm">{row.title}</p>
        {/* Reach on every row, always, because it is the denominator of every
            rate here — 7% of forty people is not a finding, and the only way to
            see that is to be shown the forty. */}
        <span className="truncate text-xs text-tertiary-foreground">
          {row.account.name}
          {' · '}
          {row.reach}
          {row.share && ` · ${row.share}`}
        </span>
      </div>

      <div className="flex w-36 shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm tabular-nums">{row.figure}</span>
        {/*
          The comparison, in the column it qualifies. A separate "vs typical"
          column made the reader carry a number three columns to the left in
          their head; drawn under the figure it belongs to, the pair reads as
          one statement.

          Without a multiplier the bar falls back to the row's share of the
          leader — a rank, not a verdict — because a post on a platform with no
          history yet is still somewhere in this list.

          Unless the multiplier *is* what the list is ranked on, in which case
          the row has no figure in the column's unit and gets no bar at all. A
          bar drawn from a substituted zero is the worst of the three: it says
          the post earned nothing, when what the server said is that it cannot
          be placed.
        */}
        {row.pace !== null && row.placement ? (
          <PaceBar
            pace={row.pace}
            placement={row.placement}
            className="w-full"
            title={t('analytics.tile.vsTypicalMultiple', {
              value: formatNumber(row.pace, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
          />
        ) : row.value !== null ? (
          <RankBar
            fraction={leader === 0 ? 0 : Math.max(0, row.value) / leader}
            className="w-full"
          />
        ) : null}
      </div>

      <div className="flex w-28 shrink-0 flex-col items-end gap-1">
        <span className="text-sm">{row.published}</span>
        {/* How long it has been earning. Whether it has *finished* earning is
            said beside the reach instead — a post is not still counting in
            general, its numbers are. */}
        <span className="text-xs text-tertiary-foreground">{row.age}</span>
      </div>
    </li>
  )
}
