import type { ContentFormatId } from '@/lib/contentFormats'
import type { GoalCadence } from '@/lib/postGoal'

/**
 * The Series module's shapes (CON-264).
 *
 * Beside the components rather than in `src/types/`, for the reason
 * `components/brand/types.ts` gives about itself: a type in `src/types/` is a
 * claim about what the server sends, and none of this is that yet. When the
 * table lands, these move — and the move is the honest signal that they have
 * become a wire format.
 *
 * Nothing outside the `series` flag may read any of it.
 *
 * ## What a series is
 *
 * A **standing instruction**: a name and how one is built. "This day in finance
 * history", "Weekly news digest", "People who made an impact". It is re-read
 * every time it produces a post and it never finishes.
 *
 * That is the line against an idea, and it is worth keeping sharp because the
 * two look alike in a list. An idea is **inventory** — captured, developed,
 * spent. A series is **durable** — consulted again next week and still there in
 * the next campaign. Foundation holds the second kind; the Ideas module holds
 * the first.
 *
 * The word people arrive with is *content pillar*, which means at least four
 * different things depending on who is saying it. This models the recurring
 * segment, because it is the only reading a generator can act on and the only
 * one analytics can group by. A broad theme collapses into it without a second
 * object: "People who made an impact" is a series whose subject slot happens to
 * be a person.
 */

/**
 * How often a series runs — `times` per `per`, e.g. one a week, two a month.
 *
 * `null` wherever this appears means **occasional**: the series runs when there
 * is something for it and claims no slots in the plan. That is a real and
 * common answer, not an unset field, which is why it is modelled as the absence
 * of a rhythm rather than as `times: 0` — zero-a-week and no-fixed-rhythm are
 * different statements and only one of them should read as a gap in the
 * schedule.
 *
 * `per` reuses `GoalCadence` so the arithmetic against the campaign's goal is
 * one multiplication rather than a unit conversion. A series' period need not
 * match the campaign's: both resolve to absolute counts over the same window.
 */
export type SeriesRhythm = {
  times: number
  per: GoalCadence
}

/**
 * Where a series gets the thing it is about.
 *
 * The distinction falls straight out of what people write down. "This day in
 * finance history" needs nothing from anybody — the date is the subject, and it
 * can run forever unattended. "People who made an impact" cannot run at all
 * until somebody says *John Bogle*.
 *
 * One field, and it does a lot of work: it decides whether an empty idea queue
 * is a problem for this series or irrelevant to it, what the plan does when it
 * reaches the slot, and what "feeding this" looks like on the series' own card.
 * Without it the app either demands ideas for series that do not want any, or
 * lets every series run dry in silence.
 */
export type SeriesSupply =
  /** The series supplies its own subject — a date, the week's news, a number. */
  | 'self'
  /** It needs a subject from the Ideas queue before it can run. */
  | 'idea'

/**
 * Where a series lives, which is also what says whether it is bounded.
 *
 * A workspace series is unbounded — it recurs until somebody retires it. A
 * campaign series ends when the campaign does, which is exactly what people
 * mean by a six-part run. **Same object, and the scope is the only difference**;
 * modelling bounded runs as a third kind of thing was considered and cut,
 * because everything else about them is identical and the nav would have had to
 * grow a row for it.
 *
 * Defining locally is the ordinary way in: you think of a series while setting
 * up a campaign, you write it there, and you promote it to the library once it
 * has proved it recurs. That is what keeps the library honest — it fills from
 * use rather than from four generic nouns typed during onboarding, which was
 * the strongest argument against having a library at all.
 */
export type SeriesScope =
  { kind: 'workspace' } | { kind: 'campaign'; campaignId: string }

/** What a series has actually produced. Derived by the server, never stored. */
export type SeriesUsage = {
  drafts: number
  published: number
}

export type ContentSeries = {
  id: string
  /**
   * What the audience would call it. "Weekly news digest" — a name somebody
   * could recognise on the page, not a category.
   *
   * This is the one field worth being fussy about, because it is the test of
   * whether the thing is a series at all: if the audience would not recognise
   * it by name, it is a theme, and a theme is a word the generator cannot act
   * on.
   */
  name: string
  /** One line. What a reader gets each time it runs — shown under the name. */
  promise: string
  /**
   * **How one is built.** The whole point of the object.
   *
   * "Pick a date-anchored event, give the context in two paragraphs, land a
   * lesson" — a recipe, in the author's own words. Left empty the series still
   * works as a grouping key and is worth having for that alone, which is why
   * nothing here refuses to save without it.
   *
   * Deliberately **not** a tone field. How it sounds is the voice's job, and a
   * second place to say it is a conflict the generator would have to resolve
   * and the user would have to predict.
   */
  recipe: string
  supply: SeriesSupply
  /**
   * The shape its posts take, when `content-formats` is on — a series pins one
   * and the posts it produces inherit it, because a digest that arrived as a
   * hot take would not be the digest any more.
   *
   * Nullable, and read through `normalizeContentFormat`: with the formats flag
   * off this is simply never set, and a series carrying one from a build that
   * had it on still loads.
   */
  formatId: ContentFormatId | null
  /**
   * What the library suggests when a campaign picks this up. A starting point
   * for the campaign's own rhythm, never the thing the plan counts — that is
   * always the campaign's, so two campaigns can run the same series at
   * different rates.
   */
  defaultRhythm: SeriesRhythm | null
  scope: SeriesScope
  /** What it has produced. See `SeriesUsage`. */
  usage: SeriesUsage
  /** ISO. */
  updatedAt: string
}

/**
 * One campaign's decision about one series: that it runs, and how often.
 *
 * A row rather than a field on the series, because the same series runs at
 * different rates in different campaigns and the library must not hold any
 * campaign's answer. `rhythm: null` is occasional — picked up, but claiming no
 * slots.
 */
export type CampaignSeriesRun = {
  seriesId: string
  rhythm: SeriesRhythm | null
}

/** Everything the campaign's Foundation page needs to draw its series. */
export type CampaignSeries = {
  campaignId: string
  runs: CampaignSeriesRun[]
}

/**
 * The most times a series can be asked to run in one period.
 *
 * A ceiling rather than a validation rule: 31 is a daily series in a long
 * month, and anything past it is a typo — someone meaning 2 and holding the key
 * down. The picker clamps to it instead of refusing, because a refusal here
 * would be the app arguing about a number it is only going to multiply.
 */
export const MAX_RHYTHM_TIMES = 31
