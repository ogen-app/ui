import { useState } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib'
import { formatNumber } from '@/lib/intl'
import { RankBar } from './charts'
import { InsightLine } from './ComparisonSections'
import { Picker } from './ComparisonBar'
import {
  availableCriteria,
  criterionHeldOut,
  criterionLabel,
  criterionSuffix,
  type Criterion,
} from './criteria'
import {
  bandGroups,
  comparablePosts,
  elementCopy,
  isSpread,
  MIN_BAND_POSTS,
  MIN_SCORED_POSTS,
  QUALITY_ELEMENTS,
  spreadOf,
  type BandGroup,
  type QualityElement,
  type QualitySpread,
  type SpreadGap,
} from './quality'
import { Basis, FigureGrid, FigureTile, NotYet, SectionCard } from './shell'
import type { PerformerCriterionId, QualityView } from './types'

/**
 * Quality against results — the card that asks whether the score we put on a
 * post before publishing had anything to do with what happened after.
 *
 * It exists because the quality assessment (CON-85) is the one thing this
 * workspace knows about a post *in advance*, and until now nothing ever checked
 * it. Four elements are scored on every post, each with its own rubric and its
 * own weight, and any of them could be measuring something real, something
 * irrelevant, or something actively unhelpful — and there is no way to tell by
 * looking at the scores.
 *
 * **The card is built to be able to say no.** Its tiles report a flat element as
 * flat and an inverted one as inverted, in the same clothes as the one that
 * works; a card that could only find agreement would be a card confirming
 * whatever it was shown. The states that make that real are in the harness:
 * every post in one band, two posts in a band, no maturation curve, nothing
 * scored at all.
 *
 * The beats are the surface's own. The **figures** are the five elements, each
 * carrying what a better score bought — that is the only figure on the card
 * that is a finding rather than an input. The **detail** is the selected
 * element's three bands, ranked on the same criteria the performers card uses,
 * because "which of these posts did better" is one question and deserves one
 * vocabulary. The one control is what "did better" means.
 *
 * Outside the date lens on purpose — see {@link QualityView}.
 */
export function QualitySection({ view }: { view: QualityView }) {
  const { t } = useTranslation()
  const [pickedCriterion, setPickedCriterion] =
    useState<PerformerCriterionId | null>(null)
  const [pickedElement, setPickedElement] = useState<QualityElement | null>(
    null,
  )

  const posts = comparablePosts(view)
  const stale = view.posts.length - posts.length
  const corrected = view.curve !== null
  const criteria = availableCriteria({ posts, curve: view.curve })

  if (posts.length === 0 || criteria.length === 0) {
    return (
      <SectionCard title={t('analytics.quality.title')} scope="all-time">
        <NotYet title={emptyTitle(t, view, posts.length, criteria.length)}>
          {emptyBody(t, view, posts.length, criteria.length)}
        </NotYet>
      </SectionCard>
    )
  }

  // Falls back rather than resetting, as everywhere else on this surface: a
  // criterion can retire when the platform mix changes, and a card that empties
  // itself because of that is worse than one that returns to the first question.
  const criterion =
    criteria.find((c) => c.id === pickedCriterion) ?? criteria[0]

  /*
    Under the gate the bands are not drawn at all. Three mostly-empty bands look
    exactly like three bands a workspace never writes into, and those two lead
    to opposite conclusions — so the card says which one this is instead of
    drawing a picture that can't tell them apart.
  */
  if (posts.length < MIN_SCORED_POSTS) {
    return (
      <SectionCard title={t('analytics.quality.title')} scope="all-time">
        <NotYet
          title={t('analytics.quality.gateTitle', { count: posts.length })}
        >
          {t('analytics.quality.gateBody', { minimum: MIN_SCORED_POSTS })}
        </NotYet>
        <Basis>{coverage(t, view, posts.length, stale)}</Basis>
      </SectionCard>
    )
  }

  const element = pickedElement ?? 'overall'
  const groups = bandGroups(t, posts, element, criterion, corrected)
  const best = Math.max(...groups.map((g) => g.value ?? 0), 0)
  const placedTotal = groups.reduce((sum, g) => sum + g.placed, 0)
  const heldOut = posts.length - placedTotal
  const copy = elementCopy(t, element)

  return (
    <SectionCard
      title={t('analytics.quality.title')}
      qualifier={t('analytics.quality.qualifier')}
      scope="all-time"
      status={
        <Picker
          label={t('analytics.quality.didBetterOn')}
          value={criterionLabel(t, criterion, corrected)}
          options={criteria.map((c) => ({
            value: c.id,
            label: criterionLabel(t, c, corrected),
          }))}
          onChange={(v) => setPickedCriterion(v as PerformerCriterionId)}
        />
      }
    >
      <FigureGrid columns={QUALITY_ELEMENTS.length}>
        {QUALITY_ELEMENTS.map((el) => (
          <ElementTile
            key={el}
            element={el}
            spread={spreadOf(bandGroups(t, posts, el, criterion, corrected))}
            selected={el === element}
            onSelect={() => setPickedElement(el)}
          />
        ))}
      </FigureGrid>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {/*
            Named like every other detail beat: which of the tiles above am I
            looking at. The criterion is beside it rather than in the rows,
            because it is the same answer on all three of them.
          */}
          <h3 className="font-display text-base font-medium">{copy.label}</h3>
          <span className="text-xs text-tertiary-foreground">
            {t('analytics.quality.medianPerBand', {
              criterion: [
                criterionLabel(t, criterion, corrected),
                criterionSuffix(t, criterion),
              ]
                .filter(Boolean)
                .join(' '),
            })}
          </span>
        </div>

        <ul className="flex flex-col">
          {groups.map((group) => (
            <BandRow
              key={group.band}
              group={group}
              criterion={criterion}
              best={best}
            />
          ))}
        </ul>
      </div>

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
        One note. What the comparison is over, what it left out, and the caveat
        that makes the whole card readable — the score is a judgement made from
        the words before anything was published, so an element that predicts
        nothing is a finding about the rubric, not about the posts.
      */}
      <Basis>
        {coverage(t, view, posts.length, stale)}{' '}
        {heldOut > 0 && <>{criterionHeldOut(t, criterion, heldOut)} </>}
        {t('analytics.quality.medianBasis')}{' '}
        {corrected
          ? t('analytics.quality.correctedBasis', {
              count: view.curve?.sample ?? 0,
            })
          : t('analytics.quality.uncorrectedBasis')}{' '}
        {t('analytics.quality.advisoryBasis')}
      </Basis>
    </SectionCard>
  )
}

/**
 * One element, and what a better score on it bought.
 *
 * The figure is a *finding*, not an input — deliberately not this campaign's
 * average score on the element, which is a number about the writing and would
 * have made five tiles that say nothing about results on a card whose entire
 * question is results.
 *
 * The tone rule: a mark here says the score is earning its keep, or that it is
 * pointing the wrong way. It is not a verdict on the writing — an element every
 * post clears is grey, not green, because "we always score well on Correctness"
 * is a fact about the rubric's floor and not a win.
 */
function ElementTile({
  element,
  spread,
  selected,
  onSelect,
}: {
  element: QualityElement
  spread: QualitySpread | SpreadGap
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useTranslation()
  const copy = elementCopy(t, element)
  const placed = isSpread(spread)
  const verdict = spreadVerdict(t, spread)

  return (
    <FigureTile selected={selected} onSelect={onSelect}>
      <span className="text-xs text-secondary-foreground" title={copy.blurb}>
        {copy.label}
      </span>

      {/*
        An em dash rather than a hidden figure when there is nothing to place.
        The row is a comparison of five elements, and a tile that drops its
        figure line stops being the same height as the ones beside it — which
        reads as the element being a different kind of thing.
      */}
      <span className="font-display text-2xl font-medium leading-none truncate">
        {placed
          ? t('analytics.units.multiplier', {
              value: formatNumber(spread.ratio, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }),
            })
          : t('analytics.units.none')}
      </span>

      <span
        className={cn(
          'text-xs leading-tight',
          verdict.tone === 'positive'
            ? 'text-positive'
            : verdict.tone === 'negative'
              ? 'text-negative'
              : 'text-tertiary-foreground',
        )}
      >
        {verdict.text}
      </span>
    </FigureTile>
  )
}

/** What the tile says under its figure, and whether that is a claim. */
function spreadVerdict(
  t: TFunction,
  spread: QualitySpread | SpreadGap,
): {
  text: string
  tone: 'positive' | 'negative' | 'neutral'
} {
  if (spread === 'single-band')
    return { text: t('analytics.quality.spread.singleBand'), tone: 'neutral' }
  if (spread === 'thin-bands')
    return { text: t('analytics.quality.spread.thinBands'), tone: 'neutral' }
  if (spread.direction === 'tracks') {
    return {
      text: t('analytics.quality.spread.tracks', { band: spread.top.label }),
      tone: 'positive',
    }
  }
  if (spread.direction === 'inverted') {
    return {
      text: t('analytics.quality.spread.inverted', {
        band: spread.bottom.label,
      }),
      tone: 'negative',
    }
  }
  return { text: t('analytics.quality.spread.flat'), tone: 'neutral' }
}

/**
 * One band of the selected element.
 *
 * Every band is drawn, including the empty ones — a band that disappears when
 * nothing scored into it turns "we never write anything weak" into a card that
 * simply looks like it has two bands, and nothing on screen would say which.
 */
function BandRow({
  group,
  criterion,
  best,
}: {
  group: BandGroup
  criterion: Criterion
  /** The leading band's figure — what the bars are drawn against. */
  best: number
}) {
  const { t } = useTranslation()
  return (
    <li className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm">{group.label}</span>
        {/* What a post had to score to be in here, and how many were. The range
            is the part that stops "Good" being read as our opinion of them. */}
        <span className="truncate text-xs text-tertiary-foreground">
          {t('analytics.quality.band.range', {
            range: group.range,
            posts: t('analytics.units.posts', { count: group.posts.length }),
          })}
        </span>
      </div>

      <div className="flex w-40 shrink-0 flex-col items-end gap-1.5">
        {group.value !== null ? (
          <>
            <span className="text-sm tabular-nums">
              {criterion.format(t, group.value)}
            </span>
            <RankBar
              fraction={best === 0 ? 0 : group.value / best}
              className="w-full"
            />
          </>
        ) : (
          /*
            Never a zero and never an empty bar. A band nothing scored into and a
            band of two posts are both unplaceable, and both would read as "these
            posts earned nothing" if drawn at the floor of the same scale as the
            bands above them.
          */
          <span className="text-right text-xs leading-tight text-tertiary-foreground">
            {group.posts.length === 0
              ? t('analytics.quality.band.nothingScored')
              : t('analytics.quality.band.tooFew', { minimum: MIN_BAND_POSTS })}
          </span>
        )}
      </div>
    </li>
  )
}

/** What the comparison is over. The first sentence of the card's one note. */
function coverage(
  t: TFunction,
  view: QualityView,
  comparable: number,
  stale: number,
): string {
  const reasons: string[] = []
  if (view.unscored > 0)
    reasons.push(
      t('analytics.quality.reasonUnscored', { count: view.unscored }),
    )
  if (view.awaiting > 0)
    reasons.push(
      t('analytics.quality.reasonAwaiting', { count: view.awaiting }),
    )
  if (stale > 0)
    reasons.push(t('analytics.quality.reasonStale', { count: stale }))

  const total = comparable + view.unscored + view.awaiting + stale
  return reasons.length === 0
    ? t('analytics.quality.coveragePlain', { comparable, total })
    : t('analytics.quality.coverageWithReasons', {
        comparable,
        total,
        reasons: reasons.join(', '),
      })
}

function emptyTitle(
  t: TFunction,
  view: QualityView,
  comparable: number,
  criteria: number,
): string {
  if (view.posts.length === 0 && view.awaiting === 0)
    return t('analytics.quality.emptyNothingScoredTitle')
  if (comparable === 0 && view.posts.length > 0)
    return t('analytics.quality.emptyStaleTitle')
  if (comparable === 0) return t('analytics.quality.emptyAwaitingTitle')
  return criteria === 0
    ? t('analytics.quality.emptyThinTitle')
    : t('analytics.quality.emptyTitle')
}

function emptyBody(
  t: TFunction,
  view: QualityView,
  comparable: number,
  criteria: number,
): string {
  if (view.posts.length === 0 && view.awaiting === 0)
    return t('analytics.quality.emptyNothingScoredBody')
  if (comparable === 0 && view.posts.length > 0)
    return t('analytics.quality.emptyStaleBody')
  if (comparable === 0)
    return t('analytics.quality.emptyAwaitingBody', { count: view.awaiting })
  return criteria === 0
    ? t('analytics.quality.emptyThinBody')
    : t('analytics.quality.emptyBody')
}
