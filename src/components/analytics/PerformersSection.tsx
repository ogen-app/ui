import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { AccountAvatar } from '@/components/ui/account-avatar'
import { formatNumber } from '@/lib/intl'
import { resolvePlatformInfo } from '@/lib/platformDictionary'
import { PaceBar, RankBar } from './charts'
import { InsightLine } from './ComparisonSections'
import { Picker } from './ComparisonBar'
import {
  availableCriteria,
  criterionHeldOut,
  criterionLabel,
  criterionSuffix,
  placeAgainstTypical,
  type Criterion,
} from './criteria'
import { Basis, NotYet, SectionCard } from './shell'
import { formatCount, periodPhrase } from './format'
import type { PerformerCriterionId, PerformersView, RankedPost } from './types'

/**
 * Performers and outliers — both ends of the period, by whichever question is
 * being asked.
 *
 * The section exists because the headline provokes exactly one question —
 * *which posts did this?* — and answering it naively produces a list sorted by
 * age. A post published this morning has earned a fraction of what it will; one
 * from three weeks ago has finished. Rank them together and the top of the list
 * is simply the oldest posts.
 *
 * Two ends rather than a "top posts" list, because the pair is the finding. Ten
 * posts within a whisker of each other is a different month from three carrying
 * everything and five doing nothing, and only seeing both ends at once says
 * which one this was. Neither list is a leaderboard: the point of the worst
 * five is that they are yours, published on purpose, and the reason usually
 * shows up in the second line of the row rather than in the number.
 *
 * What is ranked is the reader's choice, and the choices are not
 * interchangeable — a post can be the biggest thing in the period and the worst
 * at turning attention into anything (see `criteria.ts`). Every figure sits
 * against this workspace's own typical, drawn from the centre out, because 5.0%
 * is a good engagement rate or a poor one depending entirely on that.
 */
export function PerformersSection({ view }: { view: PerformersView }) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<PerformerCriterionId | null>(null)
  const criteria = availableCriteria(view)
  const corrected = view.curve !== null

  if (view.posts.length === 0 || criteria.length === 0) {
    return (
      <SectionCard
        title={t('analytics.performers.title')}
        qualifier={periodPhrase(t, view.period)}
        scope="lens"
      >
        <NotYet title={t('analytics.performers.nothingTitle')}>
          {view.posts.length === 0
            ? t('analytics.performers.nothingPublishedBody')
            : t('analytics.performers.nothingReportedBody')}
        </NotYet>
      </SectionCard>
    )
  }

  // Falls back rather than resetting: switching period or platform can retire a
  // criterion, and a card that empties itself because of that is worse than one
  // that quietly returns to the first question.
  const criterion = criteria.find((c) => c.id === picked) ?? criteria[0]
  const typical = view.typical[criterion.id]

  const ranked = view.posts
    .map((post) => ({ post, value: criterion.value(post, corrected) }))
    .filter(
      (row): row is { post: RankedPost; value: number } => row.value !== null,
    )
    .sort((a, b) => b.value - a.value)

  const heldOut = view.posts.length - ranked.length
  const leader = ranked[0]?.value ?? 0

  /*
    Never the same post twice. Best five and worst five out of nine would put a
    post in both lists, which reads as a bug and destroys the only thing the
    pair is for — a post cannot be both ends of its own period. So the best end
    is filled first and the worst end takes what is left, which is why the two
    lists can be different lengths and why each heading counts itself. Under
    four ranked posts there are no two ends at all, and the card says so.
  */
  const split = ranked.length >= 4
  const best = Math.min(5, Math.ceil(ranked.length / 2))
  const worst = Math.min(5, ranked.length - best)

  return (
    <SectionCard
      title={t('analytics.performers.title')}
      qualifier={periodPhrase(t, view.period)}
      scope="lens"
      status={
        <Picker
          label={t('analytics.performers.by')}
          value={criterionLabel(t, criterion, corrected)}
          options={criteria.map((c) => ({
            value: c.id,
            label: criterionLabel(t, c, corrected),
          }))}
          onChange={(v) => setPicked(v as PerformerCriterionId)}
        />
      }
    >
      {split ? (
        <>
          <PostList
            heading={t('analytics.performers.best', { count: best })}
            rows={ranked.slice(0, best)}
            criterion={criterion}
            corrected={corrected}
            typical={typical}
            leader={leader}
          />
          <PostList
            heading={t('analytics.performers.worst', { count: worst })}
            rows={ranked.slice(-worst).reverse()}
            criterion={criterion}
            corrected={corrected}
            typical={typical}
            leader={leader}
          />
        </>
      ) : (
        <PostList
          heading={t('analytics.performers.all', { count: ranked.length })}
          rows={ranked}
          criterion={criterion}
          corrected={corrected}
          typical={typical}
          leader={leader}
          note={t('analytics.performers.singleListNote')}
        />
      )}

      {view.insights.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {view.insights.map((i) => (
            <li key={i.id}>
              <InsightLine insight={i} />
            </li>
          ))}
        </ul>
      )}

      {/*
        One note, not a stack of them.

        Everything the ranking is only defensible with belongs here — what the
        bar's centre is, what was left out and why, and whether ages have been
        corrected at all — but as three paragraphs it out-weighed the list it
        was qualifying. Held out is never silently dropped, though: a reader who
        can't find this morning's post has to be told it is missing on purpose.
      */}
      <Basis>
        {typical === undefined && (
          <>{t('analytics.performers.noTypicalBasis')} </>
        )}
        {heldOut > 0 && <>{criterionHeldOut(t, criterion, heldOut)} </>}
        {view.curve
          ? t('analytics.performers.curveBasis', { count: view.curve.sample })
          : t('analytics.performers.noCurveBasis')}
      </Basis>
    </SectionCard>
  )
}

/**
 * One end of the period.
 *
 * The heading and the column labels share a line. Two rows of chrome above a
 * five-row list is most of a list, and the labels are only read on the way in —
 * the reader who comes back for the second list already knows what the columns
 * are.
 */
function PostList({
  heading,
  rows,
  criterion,
  corrected,
  typical,
  leader,
  note,
}: {
  heading: string
  rows: { post: RankedPost; value: number }[]
  criterion: Criterion
  /** Whether a maturation curve exists — it changes what the column is called. */
  corrected: boolean
  typical: number | undefined
  /** The best figure in the whole ranking — the bar's scale without a typical. */
  leader: number
  note?: string
}) {
  const { t } = useTranslation()
  const suffix = criterionSuffix(t, criterion)
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-3 border-b border-border pb-1.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-sm font-medium">{heading}</h3>
          {note && <p className="text-xs text-tertiary-foreground">{note}</p>}
        </div>
        {/* What the bar is measured from used to be spelled out here. It said
            the same thing on every row of every list, and the bar draws its own
            centre — the note at the foot is where the method belongs. */}
        <span className="w-36 shrink-0 text-right text-xs leading-tight text-tertiary-foreground">
          {criterionLabel(t, criterion, corrected)}
          {suffix && <> {suffix}</>}
        </span>
        <span className="w-28 shrink-0 text-right text-xs text-tertiary-foreground">
          {t('analytics.performers.publishedColumn')}
        </span>
      </div>

      <ul className="flex flex-col">
        {rows.map(({ post, value }) => (
          <PostRow
            key={post.id}
            post={post}
            value={value}
            criterion={criterion}
            typical={typical}
            leader={leader}
          />
        ))}
      </ul>
    </div>
  )
}

function PostRow({
  post,
  value,
  criterion,
  typical,
  leader,
}: {
  post: RankedPost
  value: number
  criterion: Criterion
  typical: number | undefined
  leader: number
}) {
  const { t } = useTranslation()
  const ratio = typical !== undefined && typical > 0 ? value / typical : null
  const platform = resolvePlatformInfo(post.account.platform)

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
        src={post.account.avatarUrl}
        name={post.account.name}
        platform={platform}
        className="shrink-0"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          className="min-w-0 truncate text-left text-sm hover:underline underline-offset-2"
        >
          {post.title}
        </button>
        {/* The account in words as well as in the picture: four Instagram
            profiles wear the same badge, and the name is the only thing telling
            them apart. The platform itself is not repeated in words — the badge
            already says it, and the room is worth more to the denominator. */}
        <span className="truncate text-xs text-tertiary-foreground">
          {post.account.name}
          {' · '}
          {qualify(t, post, criterion)}
        </span>
      </div>

      <div className="flex w-36 shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm tabular-nums">
          {criterion.format(t, value)}
        </span>
        {/*
          The comparison, in the column it qualifies. A separate "vs typical"
          column made the reader carry a number three columns to the left in
          their head; drawn under the figure it belongs to, the pair reads as
          one statement.
        */}
        {ratio !== null ? (
          <PaceBar
            pace={ratio}
            placement={placeAgainstTypical(ratio)}
            className="w-full"
            title={t('analytics.tile.vsTypicalMultiple', {
              value: formatNumber(ratio, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })}
          />
        ) : (
          <RankBar
            fraction={leader === 0 ? 0 : value / leader}
            className="w-full"
          />
        )}
      </div>

      <div className="flex w-28 shrink-0 flex-col items-end gap-1">
        <span className="text-sm">{post.publishedAt}</span>
        {/* How long it has been earning. Whether it has finished earning is said
            beside the figure that is still moving instead — a post is not still
            counting *in general*, its numbers are. */}
        <span className="text-xs text-tertiary-foreground">{post.age}</span>
      </div>
    </li>
  )
}

/**
 * What the row's figure is over.
 *
 * Reach on every row, always, because it is the denominator of every rate here
 * — 7% of forty people is not a finding, and the only way to see that is to be
 * shown the forty. It also carries the *and counting*: what is unfinished about
 * a young post is the number, not the post, so the caveat sits on the reach
 * rather than on the date beside it.
 *
 * A post carrying a real slice of the period says so as well, and only then:
 * that is the anomaly check, and one post at a quarter of the month is the
 * difference between a good month and one lucky afternoon, while "0.4% of the
 * period" is a fact about arithmetic.
 */
function qualify(t: TFunction, post: RankedPost, criterion: Criterion): string {
  const reach = formatCount(t, post.metrics.reach ?? 0)
  const reached =
    post.matured >= 1
      ? t('analytics.performers.reached', { reach })
      : t('analytics.performers.reachedCounting', { reach })
  if (criterion.qualifier !== 'share' || post.share < 0.05) return reached
  const share = t('analytics.performers.periodShare', {
    share: Math.round(post.share * 100),
  })
  return `${reached} · ${share}`
}
