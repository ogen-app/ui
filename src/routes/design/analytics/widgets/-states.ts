import type {
  NowView,
  PerformersView,
  PlatformOption,
  PostPerformanceView,
  QualityView,
} from '@/components/analytics/types'
import {
  campaignBounded,
  DEFAULT_PERIOD,
  postCounting,
  postNoBaseline,
  postNoHistory,
  postOutperformer,
  postSettling,
  postUnderperformer,
  postUnpublished,
  postUnreported,
  qualityMature,
  workspaceMature,
  workspaceThin,
} from '../-fixtures'

/**
 * One widget, every state it can be in.
 *
 * Kept apart from the surface fixtures on purpose. A surface fixture answers
 * "does the page hold together"; these answer "does this card survive the data
 * it will actually be handed" — no comparison yet, no expectation to judge
 * against, nothing reported at all. Those are the states that break copy, and
 * on a surface they are invisible because only one of them is on screen at a
 * time.
 *
 * What is *not* here is as deliberate. A state earns its place by changing what
 * the card renders, not by changing a number inside it: a stale refresh, a
 * thinner sample and a period carried by one post all draw the identical card,
 * so they were specimens of the fixture rather than of the widget.
 */

const base = campaignBounded.now

export interface WidgetState {
  id: string
  label: string
  note: string
  view: NowView
}

export const CAMPAIGN_NOW_STATES: WidgetState[] = [
  {
    id: 'mid-flight',
    label: 'Mid-flight',
    note: 'The ordinary case. A tile row, the chart for whichever tile is selected, the rail of publication marks under it — fourteen posts, two of them on the same day — what we make of it, and when it last moved. Hover a mark to see which post it was.',
    view: base,
  },
  {
    id: 'no-comparison',
    label: 'Nothing to compare against',
    note: 'A campaign in its first window. No anchor date, no previous series, no deltas — the tiles say so rather than showing a green "new", and the chart loses its ghost line.',
    view: {
      ...base,
      comparedToDate: null,
      readings: base.readings.map((r) => ({
        ...r,
        previous: null,
        previousSeries: undefined,
      })),
    },
  },
  {
    id: 'no-expectation',
    label: 'No usual range yet',
    note: "The workspace hasn't published long enough to have a usual range. The band goes, and with it every judgement on the card — the tiles drop back to a number and a delta, which is all they can honestly carry.",
    view: {
      ...base,
      readings: base.readings.map((r) => ({ ...r, expected: null })),
    },
  },
  {
    id: 'today',
    label: "Today's view",
    note: 'The period is today, and nothing has reported. The frame stays and the plot is empty — a chart of zeroes is a picture of no reach, and what is true is no numbers yet. Keeping the frame also keeps the card the size it will be once the figures land.',
    view: {
      ...base,
      period: { label: 'Today', from: DEFAULT_PERIOD.to, to: DEFAULT_PERIOD.to, days: 1 },
      comparedToDate: null,
      insights: [],
      // The switch, not a caption. Nothing measured means there is nothing to
      // draw, whatever the readings happen to hold.
      coverage: { measured: 0, published: 2, lastRefreshedAt: '15 minutes ago' },
      readings: [],
    },
  },
  {
    id: 'single-day',
    label: 'One day in',
    note: 'A campaign that started yesterday. Two points is not a trend: the ticks collapse to one per day rather than drawing a week grid over a two-day window, and the columns cap their width instead of becoming two slabs. The rail narrows with them — only the posts inside the window are marked, and the legend is decided on the same set, so it cannot claim a post the chart has no room for.',
    view: {
      ...base,
      period: { label: 'Last 2 days', from: DEFAULT_PERIOD.to, to: DEFAULT_PERIOD.to, days: 2 },
      comparedToDate: null,
      insights: [],
      coverage: { measured: 2, published: 3, lastRefreshedAt: '20 minutes ago' },
      readings: base.readings.slice(0, 4).map((r) => ({
        ...r,
        // Only a flow shrinks with the window. Scaling a rate or a follower
        // count down to 4% of itself would invent the exact mistake the
        // flow/level split exists to prevent.
        value: r.measure === 'reach' || r.measure === 'interactions'
          ? Math.round(r.value * 0.04)
          : r.value,
        previous: null,
        previousSeries: undefined,
        expected: null,
        series: r.series.slice(-2),
      })),
    },
  },
]

/* ------------------------------------------------------------- performers -- */

export interface PerformersState {
  id: string
  label: string
  note: string
  view: PerformersView
}

const performers = workspaceMature.performers

export const PERFORMERS_STATES: PerformersState[] = [
  {
    id: 'both-ends',
    label: 'Both ends',
    note: 'The ordinary case, and the one to switch criteria on: the order changes with the question, and the fifth-biggest post is the best of the period on engagement rate. Nine of eleven posts are ranked — the two the criterion refuses are named at the foot rather than dropped.',
    view: performers,
  },
  {
    id: 'no-curve',
    label: 'No curve yet',
    note: 'Nine posts in. Nothing can be corrected for age, so pace leaves the picker entirely and the bars have no typical to sit against — they fall back to the best in the list, and the note at the foot says so. Three ranked posts is too few for two ends, so the card shows one list and says why.',
    view: workspaceThin.performers,
  },
  {
    id: 'four-posts',
    label: 'Exactly enough for two ends',
    note: 'Four ranked posts split two and two — the threshold where the pair starts. No post may appear in both lists: a post cannot be both ends of its own period, and seeing one twice reads as a bug.',
    view: { ...performers, posts: performers.posts.slice(0, 4) },
  },
  {
    id: 'unreported',
    label: 'Published, nothing back',
    note: 'Posts exist and no criterion can rank any of them — every figure is still with the platforms. The card says that rather than drawing an empty list, which would read as "these posts earned nothing".',
    view: {
      ...performers,
      posts: performers.posts.slice(0, 3).map((post) => ({
        ...post,
        maturity: 'counting' as const,
        metrics: {},
        matured: 0.02,
        pace: null,
      })),
    },
  },
  {
    id: 'empty',
    label: 'Nothing published',
    note: 'The period contains no posts at all. Distinct from the state above — nothing to measure rather than nothing measured yet — and the copy has to say which.',
    view: { ...performers, posts: [], insights: [] },
  },
]

/* --------------------------------------------------------- platform filter -- */

export interface PlatformFilterState {
  id: string
  label: string
  note: string
  platforms: PlatformOption[]
  selected: string[]
}

const FOUR: PlatformOption[] = [
  { id: 'linkedin', label: 'LinkedIn', accounts: 2 },
  { id: 'instagram', label: 'Instagram', accounts: 3 },
  { id: 'facebook', label: 'Facebook', accounts: 1 },
  { id: 'twitter', label: 'X', accounts: 1 },
  { id: 'youtube', label: 'YouTube', accounts: 0 },
]

export const PLATFORM_FILTER_STATES: PlatformFilterState[] = [
  {
    id: 'all',
    label: 'Everything counted',
    note: 'The default: five marks, five counts, four of them lit, and DESELECT ALL standing at the end of the row it acts on — clearing is the only move left. The far right belongs to the period, which is the other half of what these figures are: these platforms, this window.',
    platforms: FOUR,
    selected: ['linkedin', 'instagram', 'facebook', 'twitter'],
  },
  {
    id: 'filtered',
    label: 'Filtered',
    note: 'Two platforms off, their logos greyed. This is the state that gets screenshotted and mistaken for the whole picture, so the greying has to be legible from across a desk.',
    platforms: FOUR,
    selected: ['linkedin', 'instagram'],
  },
  {
    id: 'one',
    label: 'One platform',
    note: 'The narrowest useful filter. The count on the mark is what stops "LinkedIn" being read as all of LinkedIn when one of two accounts is connected.',
    platforms: FOUR,
    selected: ['linkedin'],
  },
  {
    id: 'none',
    label: 'Nothing switched on',
    note: 'Reachable in one click from the previous state, so it has to be a real state rather than a guard. Every mark is grey and the control beside them has flipped to SELECT ALL — the way back is one press, not four. The period is untouched by any of it, which is the argument for the two controls not looking alike.',
    platforms: FOUR,
    selected: [],
  },
  {
    id: 'single-connected',
    label: 'Only one platform connected',
    note: "The marks withdraw and the bar stays. Every state of a one-platform filter shows either everything or nothing, and a control that can only be used wrongly shouldn't be on the page — but the period lives here now, so what is left is a period picker alone on its line rather than a missing row and a page that starts higher.",
    platforms: [
      { id: 'linkedin', label: 'LinkedIn', accounts: 1 },
      { id: 'youtube', label: 'YouTube', accounts: 0 },
    ],
    selected: ['linkedin'],
  },
]

/* ------------------------------------------------------------------ post -- */

export interface PostState {
  id: string
  label: string
  note: string
  view: PostPerformanceView
}

/**
 * A post, over its life — and the states its cards have to survive.
 *
 * Read top to bottom it is one post ageing: nothing to measure, out but silent,
 * four hours in, a day in, finished. That order is the review — the surface has
 * to stay the same surface the whole way down, and the only thing allowed to
 * change is what it is honestly able to say.
 *
 * The other axis is *which measures came back*, and it is the reason the cards
 * were split apart: an image post has no views, a post with no link has no
 * clicks, and the specimens differ in height because of it.
 */
export const POST_STATES: PostState[] = [
  {
    id: 'unpublished',
    label: 'Not published',
    note: 'A draft. Two cards: which post this is, unchanged from every other state, and an overview saying why it is empty rather than being hidden — a section that appears out of nowhere the day after publishing is a section nobody knows exists. No measure cards, because there is no measure to promise. The date row is the only one on the surface reading forwards.',
    view: postUnpublished,
  },
  {
    id: 'unreported',
    label: 'Out, nothing back',
    note: 'Forty minutes old and the platform has said nothing. Distinct from earning nothing, and the copy has to say which: a grid of zeroes here is a picture of a failed post rather than of a slow API. Still the same two cards — the measure cards arrive with the measures, and the identity card was complete before any of them.',
    view: postUnreported,
  },
  {
    id: 'counting',
    label: 'Still counting',
    note: 'Four hours in, six measure cards, no views — it is a single image, and a measure the platform never reports has no card rather than a card reading zero. Every comparison is against what a typical post had earned by the same age; hover a chip to see it say so. Held against finished posts this would read "below usual" everywhere and be wrong everywhere, which is the age lie the correction exists to prevent. Four buckets is also the shortest history the charts have to hold their shape on: switch a card to 1H.',
    view: postCounting,
  },
  {
    id: 'settling',
    label: 'Settling',
    note: 'A day old, past its peak, still adding — and a reel, so every measure the sweep can carry came back: seven measure cards, nine in all, the longest this surface goes. The specimen that decides whether a long surface is worth its scroll. Twenty-six hourly buckets is the reading 1H exists for: the peak, the overnight lull and the second morning are all legible, and the half-lives differ per card — clicks are finished while saves are still arriving.',
    view: postSettling,
  },
  {
    id: 'outperformer',
    label: 'Finished, well ahead',
    note: 'The ordinary end state, and the one to check the tone rules on: figures above the usual range, a positive rank and a positive finding, all in boxes. Nothing outside a box carries a colour. It is also the one specimen with a second wave — something pushed it again on day three, which the running total hides as a change of gradient and 1H shows as a second peak.',
    view: postOutperformer,
  },
  {
    id: 'underperformer',
    label: 'Finished, well behind',
    note: 'The same cards with every claim inverted. "Better than 12% of your posts" is deliberately the same sentence as the good case rather than a softened one — a card that changes its phrasing when the news is bad is a card that cannot be trusted when the news is good. Three weeks old, so 504 hourly buckets: the density limit of 1H and the case 1D exists for. Two saves across all of it is the sparsest thing any of these charts has to draw.',
    view: postUnderperformer,
  },
  {
    id: 'no-baseline',
    label: 'No history to compare against',
    note: 'A finished post in a three-week-old workspace. Every comparison withdraws at once — no typical, no usual range, no rank — and what is left is bare figures over charts. This is the state that decides whether the surface is worth showing at all before a workspace has a history.',
    view: postNoBaseline,
  },
  {
    id: 'no-history',
    label: 'Totals, but no history',
    note: 'The opposite withdrawal: every comparison is intact and the series is not. A post published before the sweep started, or one whose platform only ever hands back a current total. The cards stay — their figures are still true — and each says which of the two things is missing rather than dropping out and taking the figure with it.',
    view: postNoHistory,
  },
]

/* --------------------------------------------------------------- quality -- */

export interface QualityState {
  id: string
  label: string
  note: string
  view: QualityView
}

/** Every post scored the same, on every element. */
const flattened = qualityMature.posts.map((post) => ({
  ...post,
  quality: {
    ...post.quality,
    overall: 90,
    scores: { correctness: 9, clarity: 9, engagement: 9, delivery: 9 },
  },
}))

export const QUALITY_STATES: QualityState[] = [
  {
    id: 'mid-flight',
    label: 'Mid-flight',
    note: 'The ordinary case, and the one to drive rather than look at. Delivery is worth 2.2× against your typical and Engagement runs backwards at 0.5× — then switch what “did better” means to engagement rate and the two swap ends. That is the card working: the score is not one thing, and neither is doing well.',
    view: qualityMature,
  },
  {
    id: 'one-band',
    label: 'Everything scored the same',
    note: 'A workspace whose posts all clear 8 on all four elements. Plenty of sample, no variance, and nothing to compare — every tile says so rather than drawing a single band at 1.0× and calling it agreement. The advice this state must not give is “publish more posts”: more of the same score would change nothing.',
    view: { ...qualityMature, posts: flattened, insights: [] },
  },
  {
    id: 'thin',
    label: 'Too few scored',
    note: 'Four scored posts. Below the gate the bands are not drawn at all — three mostly-empty bands are indistinguishable on sight from three bands a workspace never writes into, and those two lead to opposite conclusions. The note still carries the coverage, because the way out is to score more.',
    view: { ...qualityMature, posts: qualityMature.posts.slice(0, 4), unscored: 9, insights: [] },
  },
  {
    id: 'no-curve',
    label: 'No curve to correct against',
    note: 'A workspace too young to know how its posts mature. Pace leaves the picker exactly as it does on the performers card, and the bands fall back to a rate — which never needed the curve, because both halves of a ratio arrive together. The card survives the withdrawal that costs the other cards their headline.',
    view: {
      ...qualityMature,
      curve: null,
      posts: qualityMature.posts.map((post) => ({ ...post, pace: null })),
      // The findings went with the curve. Every one of them is phrased against
      // your typical, and a card that keeps its sentences after the comparison
      // they were read off has withdrawn is a card that lies quietly.
      insights: [],
    },
  },
  {
    id: 'stale',
    label: 'Every score out of date',
    note: 'Each post has been edited since it was scored, so every score describes words that never went out. The comparison empties and says which of the four reasons it is — dropping the posts silently would leave a card the reader cannot account for.',
    view: {
      ...qualityMature,
      posts: qualityMature.posts.map((post) => ({
        ...post,
        quality: { ...post.quality, stale: true },
      })),
      insights: [],
    },
  },
  {
    id: 'awaiting',
    label: 'Scored, nothing back',
    note: 'Five scored posts are out and the platforms have said nothing. Distinct from nothing being scored, and the copy has to say which: one is waiting, the other is work nobody has done.',
    view: { ...qualityMature, posts: [], awaiting: 5, unscored: 3, insights: [] },
  },
  {
    id: 'none',
    label: 'Nothing scored',
    note: 'The state every workspace starts in, and the one that decides whether this card is worth having on the surface at all. It has to explain itself without a number on it and point at where scoring happens.',
    view: { ...qualityMature, posts: [], awaiting: 0, unscored: 12, insights: [] },
  },
]
