import { useState } from 'react'
import { cn } from '@/lib'
import { RankBar } from './charts'
import { InsightLine } from './ComparisonSections'
import { Picker } from './ComparisonBar'
import { availableCriteria, criterionLabel, type Criterion } from './criteria'
import {
  bandGroups,
  comparablePosts,
  elementMeta,
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
      <SectionCard title="Quality against results" scope="all-time">
        <NotYet title={emptyTitle(view, posts.length, criteria.length)}>
          {emptyBody(view, posts.length, criteria.length)}
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
      <SectionCard title="Quality against results" scope="all-time">
        <NotYet
          title={`${posts.length} scored ${posts.length === 1 ? 'post' : 'posts'} so far`}
        >
          Holding the score against results needs a few posts in each band
          before it means anything — {MIN_SCORED_POSTS} is where this starts,
          and every post you score from here counts towards it.
        </NotYet>
        <Basis>{coverage(view, posts.length, stale)}</Basis>
      </SectionCard>
    )
  }

  const element = pickedElement ?? 'overall'
  const groups = bandGroups(posts, element, criterion, corrected)
  const best = Math.max(...groups.map((g) => g.value ?? 0), 0)
  const placedTotal = groups.reduce((sum, g) => sum + g.placed, 0)
  const heldOut = posts.length - placedTotal
  const meta = elementMeta(element)

  return (
    <SectionCard
      title="Quality against results"
      qualifier="for every post we scored"
      scope="all-time"
      status={
        <Picker
          label="Did better on"
          value={criterionLabel(criterion, corrected)}
          options={criteria.map((c) => ({
            value: c.id,
            label: criterionLabel(c, corrected),
          }))}
          onChange={(v) => setPickedCriterion(v as PerformerCriterionId)}
        />
      }
    >
      <FigureGrid columns={QUALITY_ELEMENTS.length}>
        {QUALITY_ELEMENTS.map((el) => (
          <ElementTile
            key={el.id}
            label={el.label}
            blurb={el.blurb}
            spread={spreadOf(bandGroups(posts, el.id, criterion, corrected))}
            selected={el.id === element}
            onSelect={() => setPickedElement(el.id)}
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
          <h3 className="font-display text-base font-medium">{meta.label}</h3>
          <span className="text-xs text-tertiary-foreground">
            {criterionLabel(criterion, corrected)}
            {criterion.suffix && <> {criterion.suffix}</>}
            {', median per band'}
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
        {coverage(view, posts.length, stale)}{' '}
        {heldOut > 0 && `${criterion.heldOut(heldOut)} `}
        Each band shows its median, so one post that went unusually far can't
        carry it.{' '}
        {corrected
          ? `Ages are corrected against how ${view.curve?.sample} finished posts of yours matured.`
          : 'Not enough of your posts have finished earning to correct for age, so the bands are compared on a rate instead.'}{' '}
        The score is advisory and was made before publishing.
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
  label,
  blurb,
  spread,
  selected,
  onSelect,
}: {
  label: string
  blurb: string
  spread: QualitySpread | SpreadGap
  selected: boolean
  onSelect: () => void
}) {
  const placed = isSpread(spread)
  const verdict = spreadVerdict(spread)

  return (
    <FigureTile selected={selected} onSelect={onSelect}>
      <span className="text-xs text-secondary-foreground" title={blurb}>
        {label}
      </span>

      {/*
        An em dash rather than a hidden figure when there is nothing to place.
        The row is a comparison of five elements, and a tile that drops its
        figure line stops being the same height as the ones beside it — which
        reads as the element being a different kind of thing.
      */}
      <span className="font-display text-2xl font-medium leading-none truncate">
        {placed ? `${spread.ratio.toFixed(1)}×` : '—'}
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
function spreadVerdict(spread: QualitySpread | SpreadGap): {
  text: string
  tone: 'positive' | 'negative' | 'neutral'
} {
  if (spread === 'single-band')
    return { text: 'Every post scored the same', tone: 'neutral' }
  if (spread === 'thin-bands')
    return { text: 'Too few in each band', tone: 'neutral' }
  if (spread.direction === 'tracks') {
    return { text: `${spread.top.label} posts do better`, tone: 'positive' }
  }
  if (spread.direction === 'inverted') {
    return { text: `${spread.bottom.label} posts do better`, tone: 'negative' }
  }
  return { text: 'No difference', tone: 'neutral' }
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
  return (
    <li className="flex items-start gap-3 border-b border-border py-2.5 last:border-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm">{group.label}</span>
        {/* What a post had to score to be in here, and how many were. The range
            is the part that stops "Good" being read as our opinion of them. */}
        <span className="truncate text-xs text-tertiary-foreground">
          {group.range} · {group.posts.length}{' '}
          {group.posts.length === 1 ? 'post' : 'posts'}
        </span>
      </div>

      <div className="flex w-40 shrink-0 flex-col items-end gap-1.5">
        {group.value !== null ? (
          <>
            <span className="text-sm tabular-nums">
              {criterion.format(group.value)}
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
              ? 'Nothing scored here'
              : `Under ${MIN_BAND_POSTS} placed — too few to compare`}
          </span>
        )}
      </div>
    </li>
  )
}

/** What the comparison is over. The first sentence of the card's one note. */
function coverage(
  view: QualityView,
  comparable: number,
  stale: number,
): string {
  const parts: string[] = []
  if (view.unscored > 0) parts.push(`${view.unscored} never scored`)
  if (view.awaiting > 0)
    parts.push(`${view.awaiting} still waiting on the platforms`)
  if (stale > 0)
    parts.push(
      `${stale} edited after scoring, so the score is of different words`,
    )

  const total = comparable + view.unscored + view.awaiting + stale
  const head = `${comparable} of the ${total} posts published here can be compared`
  return parts.length === 0 ? `${head}.` : `${head} — ${parts.join(', ')}.`
}

function emptyTitle(
  view: QualityView,
  comparable: number,
  criteria: number,
): string {
  if (view.posts.length === 0 && view.awaiting === 0)
    return 'Nothing scored yet'
  if (comparable === 0 && view.posts.length > 0)
    return 'Every score is out of date'
  if (comparable === 0) return 'Scored, nothing back yet'
  return criteria === 0
    ? 'Nothing reported enough to compare'
    : 'Nothing to compare yet'
}

function emptyBody(
  view: QualityView,
  comparable: number,
  criteria: number,
): string {
  if (view.posts.length === 0 && view.awaiting === 0) {
    return 'Nothing here has been through a quality check, so there is nothing to hold against what these posts earned. Score a few from the post editor and this fills in on its own.'
  }
  if (comparable === 0 && view.posts.length > 0) {
    return 'Every scored post here has been edited since, so each score describes words that never went out. Re-score any of them and it comes back into the comparison.'
  }
  if (comparable === 0) {
    return `${view.awaiting} scored ${view.awaiting === 1 ? 'post has' : 'posts have'} gone out and the platforms haven't reported on them yet. This usually takes a few hours.`
  }
  return criteria === 0
    ? 'The scored posts here have not reported enough for any of the comparisons to mean anything yet.'
    : 'There is nothing to compare here yet.'
}
