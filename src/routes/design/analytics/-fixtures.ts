import type {
  AnalyticsData,
  Confidence,
  Period,
  PlatformOption,
  Point,
  PostMetric,
  PostPerformanceView,
  PostSeries,
  PostSeriesPoint,
  Publication,
  QualityView,
  ScoredPost,
  ShelfLife,
  Sleeve,
} from '@/components/analytics/types'

/**
 * Invented data for the analytics harnesses.
 *
 * Shaped rather than random: the mature workspace has a real rise in the
 * second half so the trend and the delta agree with each other, the thin one
 * genuinely cannot support a best-time claim, and the anomaly is a spike big
 * enough to leave its own band. States that only occur against a particular
 * deployment — no analytics database, a half-swept campaign, a post that is
 * still counting — cannot be produced on demand against a real backend, and
 * seeing them side by side is the only way to check the copy holds.
 *
 * Deterministic on purpose: a seeded generator, so a chart looks the same on
 * every render and a design conversation is about the design.
 */

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const DAY = 86_400_000

/**
 * The window ends today, so the screen can say "today vs 15 Jul" and have both
 * dates be true. Only the labels move from one day to the next — the values
 * come from a seeded generator and don't.
 */
const TODAY = Math.floor(Date.now() / DAY) * DAY
const EPOCH = TODAY - 27 * DAY

function iso(offsetDays: number): string {
  return new Date(EPOCH + offsetDays * DAY).toISOString().slice(0, 10)
}

function makeSeries({
  from = 0,
  days,
  base,
  drift = 0,
  noise = 0.15,
  seed = 1,
  spikeAt,
  spikeBy = 3,
  round = true,
}: {
  from?: number
  days: number
  base: number
  /** Fractional change across the whole span. */
  drift?: number
  noise?: number
  seed?: number
  spikeAt?: number
  spikeBy?: number
  /**
   * Off for a rate. A level measure's series has to be in the same unit as its
   * value and its expectation band — an engagement rate rounded to whole
   * numbers is 0 every day, and one held in per-mille draws its band off the
   * bottom of the chart.
   */
  round?: boolean
}): Point[] {
  const rand = seeded(seed)
  return Array.from({ length: days }, (_, i) => {
    const trend = base * (1 + (drift * i) / Math.max(1, days - 1))
    const wobble = 1 + (rand() - 0.5) * 2 * noise
    const spike = spikeAt !== undefined && i === spikeAt ? spikeBy : 1
    const value = trend * wobble * spike
    return { date: iso(from + i), value: round ? Math.round(value) : value }
  })
}

export const PERIODS: Period[] = [
  { label: 'Last 7 days', from: iso(21), to: iso(27), days: 7 },
  { label: 'Last 28 days', from: iso(0), to: iso(27), days: 28 },
  { label: 'Last 90 days', from: iso(-62), to: iso(27), days: 90 },
  { label: 'This campaign', from: iso(-10), to: iso(27), days: 38 },
]

export const DEFAULT_PERIOD = PERIODS[1]

/**
 * The accounts the invented posts went out on.
 *
 * No picture URLs on purpose: every avatar here falls back to its initial, so
 * the harness draws what a workspace that has never uploaded one sees, and no
 * design conversation depends on a network request.
 */
const ACCOUNTS = {
  linkedin: { id: 'a-li', name: 'Ogen Dental', platform: 'linkedin' },
  instagram: { id: 'a-ig', name: '@ogendental', platform: 'instagram' },
  instagramClinic: { id: 'a-ig2', name: '@ogen.clinic', platform: 'instagram' },
  instagramNorth: { id: 'a-ig3', name: '@ogen.north', platform: 'instagram' },
  instagramSouth: { id: 'a-ig4', name: '@ogen.south', platform: 'instagram' },
  facebook: { id: 'a-fb', name: 'Ogen Dental Practice', platform: 'facebook' },
  x: { id: 'a-x', name: '@ogen', platform: 'twitter' },
}

/**
 * What a typical post of this workspace does, per criterion — the centre line
 * of every bar on the performers card. Pace is a multiple of typical, so its
 * typical is 1 by construction.
 */
const TYPICAL = {
  pace: 1,
  reach: 6_800,
  engagement_rate: 0.048,
  save_rate: 5.4,
  follow_rate: 2.1,
}

const PLATFORMS: Sleeve[] = [
  { id: 'linkedin', label: 'LinkedIn', sample: 34, tone: 1 },
  { id: 'instagram', label: 'Instagram', sample: 41, tone: 2 },
  { id: 'facebook', label: 'Facebook', sample: 22, tone: 3 },
  { id: 'x', label: 'X', sample: 3, tone: 4 },
]

/** A plausible audience-attention grid: weekday mornings and early evenings. */
function bestTimesGrid(): number[][] {
  const rand = seeded(7)
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => {
      const weekend = day >= 5 ? 0.45 : 1
      const morning = Math.exp(-((hour - 8.5) ** 2) / 6)
      const evening = Math.exp(-((hour - 19) ** 2) / 8)
      const night = hour < 6 ? 0.05 : 1
      const base = (morning * 0.85 + evening) * weekend * night
      return Math.min(1, Math.max(0, base * (0.75 + rand() * 0.5)))
    }),
  )
}

/**
 * A maturity curve from a half-life: the share of everything a post will ever
 * earn that has arrived by each hour, plus the hours where it crosses the marks
 * worth naming.
 */
function maturity(
  halfLifeHours: number,
  sample: number,
  confidence: Confidence,
): ShelfLife {
  const span = halfLifeHours * 6.5
  const at = (share: number) => halfLifeHours * Math.log2(1 / (1 - share))
  return {
    curve: Array.from({ length: 49 }, (_, i) => {
      const hour = (i * span) / 48
      return { hour, share: 1 - Math.pow(0.5, hour / halfLifeHours) }
    }),
    milestones: [0.5, 0.75, 0.95].map((share) => ({ share, hour: at(share) })),
    sample,
    confidence,
  }
}

/* -------------------------------------------------------- workspace data -- */

/**
 * Four platforms, seven accounts, and one offered-but-unconnected — the shape
 * that makes the filter worth having. YouTube is in the list because a
 * workspace that publishes nowhere on YouTube should be able to tell that apart
 * from a YouTube that earned nothing.
 *
 * Keyed by wire slug rather than sqid, which is how analytics will hand them
 * over — `resolvePlatformInfo` takes either.
 */
const PLATFORM_OPTIONS: PlatformOption[] = [
  { id: 'linkedin', label: 'LinkedIn', accounts: 2 },
  { id: 'instagram', label: 'Instagram', accounts: 3 },
  { id: 'facebook', label: 'Facebook', accounts: 1 },
  { id: 'twitter', label: 'X', accounts: 1 },
  { id: 'youtube', label: 'YouTube', accounts: 0 },
]

/* ---------------------------------------------------------- quality data -- */

/**
 * A post and the score the quality check gave it before it went out.
 *
 * Written as a table rather than as fifteen object literals because the whole
 * point of this fixture is the relationship between two of its columns — the
 * band and the result — and that is unreadable once it is spread across a
 * hundred lines of prose keys.
 *
 * Only the four element scores are designed. The overall is *derived* from them
 * below, by the same kind of weighted roll-up the backend does, so the overall
 * tile shows whatever the elements actually add up to rather than a number
 * chosen to make the card say something.
 */
type ScoredSpec = {
  id: string
  title: string
  account: keyof typeof ACCOUNTS
  publishedAt: string
  age: string
  matured: number
  pace: number | null
  reach: number
  /** Interactions as a share of reach — the question the card asks second. */
  rate: number
  /** Correctness, clarity, engagement, delivery. 0–10, as the model scored. */
  scores: [number, number, number, number]
  /** Edited after scoring, so the score describes words that never went out. */
  stale?: boolean
}

/**
 * The roll-up weights this fixture uses. The real ones are keyed by post type
 * and live on the server (see `types/quality.ts`); these exist only so the
 * invented overall is consistent with the invented elements beside it.
 */
const QUALITY_WEIGHTS: [number, number, number, number] = [0.3, 0.25, 0.25, 0.2]

/**
 * The campaign's scored posts, and the finding they are built to carry:
 *
 * - **Delivery tracks.** The posts that fit the channel went about twice as far
 *   as the ones that didn't.
 * - **Engagement runs backwards.** The posts the check liked most for hooks and
 *   calls to action are the ones that did least — the state the card exists to
 *   be able to report, and the reason its tiles are not allowed to only agree.
 * - **Correctness never varies.** Every post clears 8, so there is nothing to
 *   compare it against. A floor, not a lever.
 * - **Clarity says nothing**, and the overall says nothing either — because the
 *   two elements that *do* say something pull against each other and cancel
 *   inside it. That is the argument for cutting by element rather than by score.
 */
const CAMPAIGN_SCORED: ScoredSpec[] = [
  { id: 'q1', title: 'The five-minute check we do before every clean', account: 'linkedin', publishedAt: '18 Jun 26', age: '54 days', matured: 1, pace: 2.2, reach: 15_200, rate: 0.052, scores: [9, 9, 4, 9] },
  { id: 'q2', title: 'What we learned from 200 aligner cases', account: 'linkedin', publishedAt: '24 Jun 26', age: '48 days', matured: 1, pace: 1.9, reach: 12_800, rate: 0.061, scores: [10, 9, 6, 9] },
  { id: 'q3', title: 'Meet the team behind your appointment', account: 'instagram', publishedAt: '29 Jun 26', age: '43 days', matured: 1, pace: 1.8, reach: 11_900, rate: 0.038, scores: [8, 4, 3, 8] },
  { id: 'q4', title: 'Why your gums bleed — and when to worry', account: 'facebook', publishedAt: '3 Jul 26', age: '39 days', matured: 1, pace: 1.7, reach: 11_200, rate: 0.044, scores: [9, 4, 7, 9] },
  { id: 'q5', title: 'A day in the practice, start to finish', account: 'instagram', publishedAt: '8 Jul 26', age: '34 days', matured: 1, pace: 1.6, reach: 10_400, rate: 0.057, scores: [9, 6, 7, 7] },
  { id: 'q6', title: 'The truth about whitening strips', account: 'linkedin', publishedAt: '14 Jul 26', age: '28 days', matured: 1, pace: 1.5, reach: 9_800, rate: 0.035, scores: [9, 5, 4, 9] },
  { id: 'q7', title: 'How we plan a treatment around a wedding date', account: 'instagram', publishedAt: '18 Jul 26', age: '24 days', matured: 1, pace: 1.3, reach: 8_600, rate: 0.066, scores: [9, 9, 6, 7] },
  { id: 'q8', title: 'Before and after — six months of aligners', account: 'instagram', publishedAt: '21 Jul 26', age: '21 days', matured: 1, pace: 1.2, reach: 7_900, rate: 0.081, scores: [10, 9, 9, 9] },
  { id: 'q9', title: 'The three questions we ask before every treatment plan', account: 'linkedin', publishedAt: '24 Jul 26', age: '18 days', matured: 1, pace: 1.1, reach: 7_300, rate: 0.049, scores: [8, 8, 6, 5] },
  { id: 'q10', title: 'Aligners or braces — the honest comparison', account: 'instagramClinic', publishedAt: '29 Jul 26', age: '13 days', matured: 1, pace: 1.0, reach: 6_600, rate: 0.072, scores: [9, 7, 9, 4] },
  { id: 'q11', title: 'What a first appointment actually looks like', account: 'instagram', publishedAt: '3 Aug 26', age: '8 days', matured: 1, pace: 0.9, reach: 5_900, rate: 0.058, scores: [9, 9, 8, 6] },
  { id: 'q12', title: 'The retainer question, answered', account: 'facebook', publishedAt: '6 Aug 26', age: '5 days', matured: 1, pace: 0.8, reach: 5_100, rate: 0.069, scores: [8, 6, 9, 4] },
  { id: 'q13', title: 'Nervous patients — what we do differently', account: 'instagramClinic', publishedAt: '10 Aug 26', age: '30 hours', matured: 0.51, pace: 0.6, reach: 3_900, rate: 0.046, scores: [9, 9, 8, 3] },
  // Scored, then rewritten. In the list and out of every figure — a post that
  // vanishes from a comparison is a post someone goes looking for.
  { id: 'q14', title: 'Booking a check-up when you have not been in years', account: 'linkedin', publishedAt: '27 Jul 26', age: '15 days', matured: 1, pace: 1.4, reach: 9_100, rate: 0.05, scores: [9, 8, 7, 8], stale: true },
  { id: 'q15', title: 'Our new opening hours', account: 'facebook', publishedAt: '5 Aug 26', age: '6 days', matured: 1, pace: 0.7, reach: 4_800, rate: 0.043, scores: [8, 6, 8, 5], stale: true },
]

/** Mara's first three, scored. Enough to be counted, not enough to compare. */
const THIN_SCORED: ScoredSpec[] = [
  { id: 't1', title: 'Why I left the agency', account: 'linkedin', publishedAt: '2 Aug 26', age: '9 days', matured: 1, pace: null, reach: 1_240, rate: 0.041, scores: [9, 8, 7, 8] },
  { id: 't2', title: 'The one question I ask every new client', account: 'linkedin', publishedAt: '6 Aug 26', age: '5 days', matured: 1, pace: null, reach: 890, rate: 0.062, scores: [8, 9, 8, 7] },
  { id: 't3', title: 'What a strategy day actually costs', account: 'x', publishedAt: '9 Aug 26', age: '2 days', matured: 0.7, pace: null, reach: 640, rate: 0.037, scores: [9, 7, 5, 6] },
]

function scoredPosts(specs: ScoredSpec[]): ScoredPost[] {
  const totalReach = specs.reduce((sum, spec) => sum + spec.reach, 0)
  return specs.map((spec) => {
    const [correctness, clarity, engagement, delivery] = spec.scores
    const interactions = Math.round(spec.reach * spec.rate)
    return {
      id: spec.id,
      title: spec.title,
      publishedAt: spec.publishedAt,
      age: spec.age,
      account: ACCOUNTS[spec.account],
      maturity: spec.matured >= 1 ? 'final' : 'settling',
      metrics: {
        reach: spec.reach,
        interactions,
        // Both derived rather than designed: the card is about the bands, and
        // three more hand-chosen columns would be three more chances for the
        // fixture to disagree with itself when a criterion is switched.
        saves: Math.round(interactions * 0.16),
        followers: Math.round(spec.reach * 0.003),
      },
      matured: spec.matured,
      pace: spec.pace,
      share: spec.reach / totalReach,
      quality: {
        overall: Math.round(
          (correctness * QUALITY_WEIGHTS[0] +
            clarity * QUALITY_WEIGHTS[1] +
            engagement * QUALITY_WEIGHTS[2] +
            delivery * QUALITY_WEIGHTS[3]) *
            10,
        ),
        scores: { correctness, clarity, engagement, delivery },
        ...(spec.stale ? { stale: true } : {}),
      },
    }
  })
}

/** The card's ordinary case: thirteen scored posts, four elements behaving differently. */
export const qualityMature: QualityView = {
  posts: scoredPosts(CAMPAIGN_SCORED),
  awaiting: 1,
  unscored: 4,
  curve: { sample: 240, confidence: 'high', floor: '6 hours' },
  typical: TYPICAL,
  insights: [
    {
      id: 'q-delivery',
      tone: 'positive',
      text: 'Fitting the channel is what buys reach — the six posts scoring Good on Delivery went about twice as far against your typical as the three scoring Weak.',
      basis: 'Six posts against three — a lead, not a finding.',
    },
    {
      id: 'q-engagement',
      tone: 'neutral',
      text: 'Engagement buys the opposite: those posts are the ones people acted on most, and the ones that travelled least. Change what “did better” means and the two elements swap ends.',
      basis: 'Five posts at Good against three at Weak, on both readings.',
    },
    {
      id: 'q-overall',
      tone: 'neutral',
      text: 'Neither survives in the overall score — the only two elements carrying a signal pull against each other and cancel inside it, which is the whole case for reading the elements rather than the number.',
    },
  ],
}

export const workspaceMature: AnalyticsData = {
  platforms: PLATFORM_OPTIONS,
  now: {
    period: DEFAULT_PERIOD,
    comparedToDate: DEFAULT_PERIOD.from,
    readings: [
      {
        measure: 'reach',
        value: 184_920,
        previous: 138_400,
        expected: { low: 120_000, high: 165_000 },
        series: makeSeries({ days: 28, base: 5600, drift: 0.7, seed: 11 }),
        previousSeries: makeSeries({ days: 28, base: 4900, drift: 0.05, seed: 12 }),
      },
      {
        measure: 'interactions',
        value: 9_310,
        previous: 7_880,
        expected: { low: 6_400, high: 9_900 },
        series: makeSeries({ days: 28, base: 290, drift: 0.5, seed: 14 }),
      },
      {
        measure: 'engagement_rate',
        value: 0.0503,
        previous: 0.0569,
        expected: { low: 0.048, high: 0.062 },
        series: makeSeries({ days: 28, base: 0.056, drift: -0.15, seed: 15, round: false }),
      },
      {
        measure: 'followers',
        value: 14_206,
        previous: 13_411,
        expected: { low: 13_500, high: 14_100 },
        series: makeSeries({ days: 28, base: 13_500, drift: 0.05, noise: 0.01, seed: 16 }),
      },
      {
        measure: 'published',
        value: 31,
        previous: 24,
        expected: { low: 20, high: 28 },
        series: makeSeries({ days: 28, base: 1.1, noise: 0.9, seed: 17 }),
      },
    ],
    insights: [
      {
        id: 'reach-up',
        tone: 'positive',
        // Not "reach is above your usual range" — the sentence under the chart
        // already said that, and a finding that opens by restating it spends
        // its first line saying nothing. It starts where that sentence stopped.
        text: 'Almost all of the gap came from two LinkedIn posts in the same week.',
      },
      {
        id: 'rate-down',
        tone: 'neutral',
        text: 'Engagement rate slipped while reach rose — you reached more people who were less inclined to react, which is what usually happens when a post travels beyond your own audience. Interactions themselves are up.',
        basis: 'Rate is interactions ÷ reach, so a reach spike depresses it mechanically',
      },
    ],
    coverage: {
      measured: 29,
      published: 31,
      lastRefreshedAt: '2 hours ago',
      nextRefreshIn: 'in 40 minutes',
    },
  },

  outcomes: {
    bestAvailableSignal: 'sessions',
    upgrade: {
      label: 'Connect what happens after the click to see enquiries, not just visits',
      detail:
        'Every link you publish is already stamped, so a connected analytics source would backfill the last 90 days rather than starting from zero.',
    },
    basis:
      'Counted from the links Ogen stamps on every post it publishes, attributed to the post that was clicked.',
    goals: [
      {
        id: 'consults',
        label: 'Consultation requests',
        destination: 'getogen.com/book',
        signal: 'sessions',
        value: 412,
        previous: 331,
        target: { value: 500, per: 'month' },
        series: makeSeries({ days: 28, base: 14, drift: 0.5, seed: 21 }),
        topContributors: [
          { label: 'What most clinics get wrong about follow-ups', value: 96 },
          { label: 'Before and after — six months of aligners', value: 71 },
          { label: 'Meet the team behind the new location', value: 44 },
        ],
        insight: {
          id: 'consults-pace',
          tone: 'positive',
          text: 'Ahead of where this needs to be for 500 by month end, and three posts are carrying half of it — all three are the same kind of post.',
          basis: '412 with nine days left, against a run rate of 460',
        },
      },
      {
        id: 'newsletter',
        label: 'Newsletter sign-ups',
        destination: 'getogen.com/subscribe',
        signal: 'clicks',
        value: 188,
        previous: 205,
        series: makeSeries({ days: 28, base: 7, drift: -0.15, seed: 22 }),
        insight: {
          id: 'newsletter-flat',
          tone: 'neutral',
          text: 'Down a little on the stretch before, and this is clicks on the link — how many of them signed up is on the other side of a connection we do not have.',
          basis: 'Clicks are reported by the platforms; sign-ups are not',
        },
      },
    ],
  },

  /*
    Eleven posts across every reading the criteria can produce.

    Shaped so the ranking genuinely changes with the question, which is the
    whole reason the picker exists: "A morning in the practice" is mid-table on
    reach and the best post of the period on engagement rate, and the four-hour
    post can be ranked on a rate — both halves of it have arrived — while being
    refused by reach and pace, which would be dividing by 0.09. Facebook reports
    no saves at all, so those posts leave the saves ranking rather than sinking
    to the bottom of it, and the two-hour post is below the reach floor where no
    rate means anything.
  */
  performers: {
    period: DEFAULT_PERIOD,
    curve: { sample: 240, confidence: 'high', floor: '6 hours' },
    typical: TYPICAL,
    insights: [
      {
        id: 'perf-1',
        text: 'Everything at the top answers a question a patient asks out loud. Everything at the bottom is an announcement.',
        tone: 'positive',
        basis: 'Nine placed posts this period — enough to notice, not enough to call it a rule.',
      },
      {
        id: 'perf-2',
        text: 'The best post by engagement rate is only the fifth biggest. It went out to an audience that already follows the practice, which is why it converted and why it did not travel.',
        tone: 'neutral',
      },
    ],
    posts: [
      {
        id: 'p1',
        title: 'What most clinics get wrong about follow-ups',
        publishedAt: '29 Jul 26',
        age: '13 days',
        account: ACCOUNTS.linkedin,
        maturity: 'final',
        metrics: { reach: 34_800, interactions: 2_100, saves: 250, followers: 118 },
        matured: 1,
        pace: 3.4,
        share: 0.188,
      },
      {
        id: 'p2',
        title: 'Before and after — six months of aligners',
        publishedAt: '24 Jul 26',
        age: '18 days',
        account: ACCOUNTS.instagram,
        maturity: 'final',
        metrics: { reach: 21_400, interactions: 1_180, saves: 190, followers: 62 },
        matured: 1,
        pace: 2.1,
        share: 0.116,
      },
      {
        id: 'p3',
        title: 'The waiting-room question we get every week',
        publishedAt: '9 Aug 26',
        age: '2 days',
        account: ACCOUNTS.linkedin,
        maturity: 'settling',
        metrics: { reach: 9_600, interactions: 520, saves: 40, followers: 26 },
        matured: 0.62,
        pace: 1.9,
        share: 0.052,
      },
      {
        id: 'p4',
        title: 'The three questions we ask before every treatment plan',
        publishedAt: '3 Aug 26',
        age: '8 days',
        account: ACCOUNTS.linkedin,
        maturity: 'final',
        metrics: { reach: 12_900, interactions: 480, saves: 92, followers: 14 },
        matured: 1,
        pace: 1.1,
        share: 0.07,
      },
      {
        id: 'p5',
        title: 'A morning in the practice',
        publishedAt: '27 Jul 26',
        age: '15 days',
        // A second Instagram account, wearing the same badge as the first —
        // which is why the row prints the account's name as well as drawing it.
        account: ACCOUNTS.instagramClinic,
        maturity: 'final',
        metrics: { reach: 9_200, interactions: 680, saves: 96, followers: 34 },
        matured: 1,
        pace: 0.9,
        share: 0.05,
      },
      {
        id: 'p6',
        title: 'Five minutes with our hygienist',
        publishedAt: '6 Aug 26',
        age: '5 days',
        account: ACCOUNTS.instagramNorth,
        maturity: 'settling',
        metrics: { reach: 7_100, interactions: 300, saves: 30, followers: 9 },
        matured: 0.88,
        pace: 1.0,
        share: 0.038,
      },
      {
        id: 'p7',
        title: 'Meet the team behind the new location',
        publishedAt: '18 Jul 26',
        age: '24 days',
        account: ACCOUNTS.facebook,
        maturity: 'final',
        metrics: { reach: 4_100, interactions: 88, followers: 3 },
        matured: 1,
        pace: 0.4,
        share: 0.022,
      },
      {
        id: 'p8',
        title: 'We are hiring a receptionist',
        publishedAt: '1 Aug 26',
        age: '10 days',
        account: ACCOUNTS.linkedin,
        maturity: 'final',
        metrics: { reach: 2_600, interactions: 41, saves: 4, followers: 2 },
        matured: 1,
        pace: 0.3,
        share: 0.014,
      },
      {
        id: 'p9',
        title: 'Bank holiday opening hours',
        publishedAt: '8 Aug 26',
        age: '3 days',
        account: ACCOUNTS.facebook,
        maturity: 'settling',
        metrics: { reach: 1_400, interactions: 22, followers: 0 },
        matured: 0.71,
        pace: 0.5,
        share: 0.008,
      },
      {
        id: 'p10',
        title: 'Why we switched to digital scans',
        publishedAt: '11 Aug 26',
        age: '4 hours',
        account: ACCOUNTS.linkedin,
        maturity: 'counting',
        metrics: { reach: 1_900, interactions: 130, saves: 12, followers: 6 },
        matured: 0.09,
        pace: null,
        share: 0.01,
      },
      {
        id: 'p11',
        title: 'One thing to bring to your first visit',
        publishedAt: '11 Aug 26',
        age: '2 hours',
        account: ACCOUNTS.instagramSouth,
        maturity: 'counting',
        metrics: { reach: 240, interactions: 18, saves: 3, followers: 1 },
        matured: 0.04,
        pace: null,
        share: 0.003,
      },
    ],
  },

  quality: qualityMature,
  sideBySide: {
    dimension: 'platform',
    measure: 'reach',
    rows: [
      {
        sleeve: PLATFORMS[1],
        value: 88_400,
        previous: 79_100,
        perPost: 2_156,
        series: makeSeries({ days: 28, base: 2900, drift: 0.2, seed: 31 }),
      },
      {
        sleeve: PLATFORMS[0],
        value: 71_200,
        previous: 41_800,
        perPost: 2_094,
        series: makeSeries({ days: 28, base: 2100, drift: 1.1, seed: 32 }),
      },
      {
        sleeve: PLATFORMS[2],
        value: 23_100,
        previous: 26_400,
        perPost: 1_050,
        series: makeSeries({ days: 28, base: 900, drift: -0.25, seed: 33 }),
      },
      {
        sleeve: PLATFORMS[3],
        value: 2_220,
        previous: null,
        perPost: 740,
        series: makeSeries({ days: 28, base: 80, noise: 0.6, seed: 34 }),
      },
    ],
    verdict: {
      id: 'allocate',
      tone: 'neutral',
      text: 'Instagram and LinkedIn earn almost the same reach per post, but Instagram took seven more posts to get there. LinkedIn is where the next hour goes.',
      basis: '41 Instagram posts vs 34 LinkedIn posts over the period',
    },
  },

  patterns: {
    bestTimes: {
      grid: bestTimesGrid(),
      best: { day: 3, hour: 18, sample: 6 },
      sample: 96,
      confidence: 'high',
    },
    shelfLife: maturity(19, 74, 'high'),
    winners: [
      {
        id: 'w1',
        title: 'Posts that open with a mistake',
        detail: 'Earn about 2.4× your median reach. Nine of your top twenty posts start this way.',
        confidence: 'high',
        sample: 23,
      },
      {
        id: 'w2',
        title: 'Carousels over single images',
        detail: 'Roughly 60% more saves, and saves are what keep a post circulating.',
        confidence: 'medium',
        sample: 18,
      },
    ],
    fading: [
      {
        id: 'f1',
        title: 'Team and office photos',
        detail: 'Down from your median to about two-thirds of it over the last three months.',
        confidence: 'medium',
        sample: 16,
      },
    ],
  },

  next: {
    pacing: {
      kind: 'evergreen',
      published: 7,
      planned: 8,
      periodLabel: 'this week',
    },
    actions: [
      {
        id: 'a1',
        urgency: 'now',
        title: 'A post from this morning is running at 4× your usual',
        detail: 'It is three hours old and still climbing. This is the window to put money behind it.',
        target: 'Open the post',
      },
      {
        id: 'a2',
        urgency: 'soon',
        title: 'Thursday 18:00 is your strongest slot and next week it is empty',
        detail: 'Your last six posts in that slot averaged 3,100 reach against a median of 1,900.',
        target: 'Open the calendar',
      },
      {
        id: 'a3',
        urgency: 'whenever',
        title: 'An evergreen post from January is still earning',
        detail: '"What most clinics get wrong about follow-ups" is at 61% of its original weekly reach eight months on.',
        target: 'Re-share it',
      },
    ],
  },
}

/** Mara in week three: real posts, no history to compare against. */
export const workspaceThin: AnalyticsData = {
  // Two platforms, one account each — enough for the filter to exist, which is
  // the threshold it draws itself at.
  platforms: [
    { id: 'linkedin', label: 'LinkedIn', accounts: 1 },
    { id: 'twitter', label: 'X', accounts: 1 },
  ],
  now: {
    period: DEFAULT_PERIOD,
    comparedToDate: null,
    readings: [
      {
        measure: 'reach',
        value: 4_180,
        previous: null,
        expected: null,
        series: makeSeries({ days: 18, base: 230, noise: 0.5, seed: 41 }),
      },
      {
        measure: 'interactions',
        value: 214,
        previous: null,
        expected: null,
        series: makeSeries({ days: 18, base: 12, noise: 0.6, seed: 42 }),
      },
      {
        measure: 'engagement_rate',
        value: 0.0512,
        previous: null,
        expected: null,
        series: makeSeries({ days: 18, base: 0.051, noise: 0.3, seed: 43, round: false }),
      },
      {
        measure: 'published',
        value: 9,
        previous: null,
        expected: null,
        series: makeSeries({ days: 18, base: 0.5, noise: 1, seed: 44 }),
      },
    ],
    insights: [
      {
        id: 'early',
        tone: 'neutral',
        text: 'Nine posts in. Individual numbers are readable now; anything about patterns — your best hours, what kind of post works — needs a few more weeks of publishing before it would mean anything.',
      },
    ],
    coverage: {
      measured: 9,
      published: 9,
      lastRefreshedAt: '40 minutes ago',
      nextRefreshIn: 'in 20 minutes',
    },
  },
  outcomes: {
    bestAvailableSignal: 'clicks',
    upgrade: {
      label: 'Name what you want out of this and everything above gets read against it',
      detail:
        'Even without anything connected, a goal tells the rest of the app what "working" means here.',
    },
    goals: [],
  },
  /*
    Nine posts in, no curve and no typical yet — the state that decides whether
    this section is honest. Nothing can be corrected for age and nothing can be
    called ahead or behind, so pace withdraws from the picker entirely, the bars
    fall back to "against the best in the list", and three ranked posts are too
    few to have two ends. What survives is a rate, which is the point: it asks a
    question a post's age doesn't change.
  */
  performers: {
    period: DEFAULT_PERIOD,
    curve: null,
    typical: {},
    insights: [],
    posts: [
      {
        id: 't-p1',
        title: 'Why we started doing this at all',
        publishedAt: '2 Aug 26',
        age: '9 days',
        account: { id: 't-li', name: 'Mara Vogt', platform: 'linkedin' },
        maturity: 'final',
        metrics: { reach: 980, interactions: 61, saves: 9, followers: 4 },
        matured: 1,
        pace: null,
        share: 0.234,
      },
      {
        id: 't-p2',
        title: 'A week in the workshop',
        publishedAt: '30 Jul 26',
        age: '12 days',
        account: { id: 't-x', name: '@maravogt', platform: 'twitter' },
        maturity: 'final',
        metrics: { reach: 410, interactions: 12, followers: 1 },
        matured: 1,
        pace: null,
        share: 0.098,
      },
      {
        id: 't-p3',
        title: 'The bench we built the whole thing on',
        publishedAt: '10 Aug 26',
        age: '20 hours',
        account: { id: 't-li', name: 'Mara Vogt', platform: 'linkedin' },
        maturity: 'counting',
        metrics: { reach: 310, interactions: 24, saves: 2, followers: 2 },
        matured: 0.4,
        pace: null,
        share: 0.074,
      },
    ],
  },
  quality: {
    posts: scoredPosts(THIN_SCORED),
    awaiting: 1,
    unscored: 5,
    curve: null,
    typical: { engagement_rate: 0.041, save_rate: 4.1, follow_rate: 1.6 },
    insights: [],
  },
  sideBySide: {
    dimension: 'platform',
    measure: 'reach',
    rows: [
      {
        sleeve: { id: 'linkedin', label: 'LinkedIn', sample: 6, tone: 1 },
        value: 3_240,
        previous: null,
        perPost: 540,
        series: makeSeries({ days: 18, base: 180, noise: 0.5, seed: 45 }),
      },
      {
        sleeve: { id: 'x', label: 'X', sample: 3, tone: 4 },
        value: 940,
        previous: null,
        perPost: 313,
        series: makeSeries({ days: 18, base: 52, noise: 0.7, seed: 46 }),
      },
    ],
    verdict: null,
  },
  patterns: {
    bestTimes: {
      grid: bestTimesGrid(),
      best: { day: 1, hour: 10, sample: 1 },
      sample: 9,
      confidence: 'low',
    },
    shelfLife: maturity(16, 4, 'low'),
    winners: [],
    fading: [],
  },
  next: {
    pacing: { kind: 'evergreen', published: 2, planned: 3, periodLabel: 'this week' },
    actions: [
      {
        id: 't1',
        urgency: 'soon',
        title: 'You have published nothing since Tuesday',
        detail: 'Your plan is three a week. Gaps this early make the later patterns harder to read.',
        target: 'Open the calendar',
      },
    ],
  },
}

/** Day one: a plan and nothing else. */
export const workspaceCold: AnalyticsData = {
  ...workspaceThin,
  now: {
    ...workspaceThin.now,
    readings: [],
    insights: [],
    coverage: { measured: 0, published: 0 },
  },
  outcomes: {
    bestAvailableSignal: 'unmeasured',
    upgrade: {
      label: 'Say what you want this to achieve',
      detail:
        'Ogen stamps every link it publishes, so whatever you connect later can answer for the posts you send before you connect it.',
    },
    goals: [
      {
        id: 'bookings',
        label: 'Booking requests',
        destination: 'example.com/book',
        signal: 'unmeasured',
        value: null,
        previous: null,
        target: { value: 40, per: 'month' },
        series: [],
      },
    ],
  },
  next: {
    pacing: { kind: 'evergreen', published: 0, planned: 3, periodLabel: 'this week' },
    actions: [
      {
        id: 'c1',
        urgency: 'now',
        title: 'Nothing is scheduled yet',
        detail: 'Your plan is three posts a week — the first one is what starts all of this.',
        target: 'Open the calendar',
      },
    ],
  },
}

/** Something happened. The band is what makes it legible as unusual. */
export const workspaceAnomaly: AnalyticsData = {
  ...workspaceMature,
  now: {
    ...workspaceMature.now,
    readings: [
      {
        measure: 'reach',
        value: 612_400,
        previous: 138_400,
        expected: { low: 120_000, high: 165_000 },
        series: makeSeries({ days: 28, base: 5200, seed: 51, spikeAt: 19, spikeBy: 14 }),
        previousSeries: makeSeries({ days: 28, base: 4900, seed: 52 }),
      },
      ...workspaceMature.now.readings.slice(1),
    ],
    insights: [
      {
        id: 'spike',
        tone: 'positive',
        text: 'One post on 25 July accounts for 71% of the period. Everything else was an ordinary month — the totals above are not a new normal.',
        basis: 'Excluding that post, reach was 176,900, inside your usual range',
      },
      {
        id: 'spike-follow',
        tone: 'negative',
        text: 'That reach did not turn into followers: 1,900 new follows against 480,000 extra people reached is well below your usual conversion.',
        basis: 'Your median is roughly 1 follow per 90 reached; this was 1 per 250',
      },
    ],
  },
}

/* --------------------------------------------------------- campaign data -- */

/**
 * When the campaign's posts actually went out, on the same dates the series is
 * drawn over.
 *
 * Offsets rather than dates, for the same reason every other date in this file
 * is relative: the window ends today, so a hard-coded July would drift out of
 * the chart within a fortnight of anyone reading it.
 *
 * Fourteen posts, matching what the coverage line claims — including two on the
 * same day, which is the case the rail exists for. A cluster is what explains a
 * bend, and a fixture that never publishes twice in one day would never show
 * whether the marks can say so.
 */
const CAMPAIGN_PUBLICATIONS: [number, string, string][] = [
  [1, 'The five-minute check we do before every clean', 'Ogen Dental'],
  [3, 'Why your gums bleed — and when to worry', 'Ogen Dental Practice'],
  [4, 'Meet the team behind your appointment', '@ogendental'],
  [6, 'A day in the practice, start to finish', '@ogendental'],
  [8, 'The truth about whitening strips', 'Ogen Dental'],
  [11, 'What we learned from 200 aligner cases', 'Ogen Dental'],
  [13, 'Before and after — six months of aligners', '@ogendental'],
  [13, 'How we plan a treatment around a wedding date', '@ogen.clinic'],
  [16, 'The three questions we ask before every treatment plan', 'Ogen Dental'],
  [18, 'What a first appointment actually looks like', '@ogendental'],
  [20, 'Aligners or braces — the honest comparison', '@ogen.clinic'],
  [22, 'Nervous patients — what we do differently', '@ogendental'],
  [24, 'The retainer question, answered', 'Ogen Dental Practice'],
  [26, 'Booking a check-up when you have not been in years', 'Ogen Dental'],
]

const campaignPublications: Publication[] = CAMPAIGN_PUBLICATIONS.map(
  ([offset, title, account], i) => ({
    id: `pub-${i}`,
    date: iso(offset),
    title,
    account,
  }),
)

export const campaignBounded: AnalyticsData = {
  ...workspaceMature,
  now: {
    ...workspaceMature.now,
    readings: workspaceMature.now.readings.slice(0, 4),
    publications: campaignPublications,
    coverage: { measured: 11, published: 14, lastRefreshedAt: '2 hours ago' },
    /*
      One finding, and it deliberately does not restate the comparison above
      it. "Running 30% above what this workspace normally does" was the
      expectation sentence in different words, and its basis was the coverage
      line in different words — three sentences, one fact. What is left is the
      part neither of those can say: *where* the campaign is ahead.
    */
    insights: [
      {
        id: 'c-vs-usual',
        tone: 'positive',
        text: 'Almost all of that came from LinkedIn, where this campaign writes longer than you usually do.',
      },
    ],
  },
  /*
    The campaign borrows the workspace's curve — how a post matures is a
    property of the audience, not of the campaign it was filed under — so a
    campaign five posts in can still place them.
  */
  performers: {
    period: DEFAULT_PERIOD,
    curve: { sample: 240, confidence: 'high', floor: '6 hours' },
    typical: TYPICAL,
    insights: [
      {
        id: 'c-perf-1',
        text: 'Both carousels are ahead of usual; the video is behind, and it is the one that took a day to make.',
        tone: 'neutral',
        basis: 'Five placed posts in this campaign — a lead, not a finding.',
      },
    ],
    posts: [
      {
        id: 'c-p1',
        title: 'Before and after — six months of aligners',
        publishedAt: '24 Jul 26',
        age: '18 days',
        account: ACCOUNTS.instagram,
        maturity: 'final',
        metrics: { reach: 9_800, interactions: 560, saves: 88, followers: 31 },
        matured: 1,
        pace: 2.2,
        share: 0.176,
      },
      {
        id: 'c-p2',
        title: 'The three questions we ask before every treatment plan',
        publishedAt: '3 Aug 26',
        age: '8 days',
        account: ACCOUNTS.linkedin,
        maturity: 'final',
        metrics: { reach: 7_400, interactions: 402, saves: 51, followers: 18 },
        matured: 1,
        pace: 1.6,
        share: 0.133,
      },
      {
        id: 'c-p3',
        title: 'What a first appointment actually looks like',
        publishedAt: '21 Jul 26',
        age: '21 days',
        account: ACCOUNTS.instagram,
        maturity: 'final',
        metrics: { reach: 5_200, interactions: 140, saves: 14, followers: 4 },
        matured: 1,
        pace: 0.6,
        share: 0.093,
      },
      {
        id: 'c-p4',
        title: 'How we plan a treatment around a wedding date',
        publishedAt: '7 Aug 26',
        age: '4 days',
        account: ACCOUNTS.instagram,
        maturity: 'settling',
        metrics: { reach: 4_600, interactions: 244, saves: 37, followers: 11 },
        matured: 0.82,
        pace: 1.0,
        share: 0.083,
      },
      {
        id: 'c-p5',
        title: 'Aligners or braces — the honest comparison',
        publishedAt: '10 Aug 26',
        age: '30 hours',
        account: ACCOUNTS.instagramClinic,
        maturity: 'settling',
        metrics: { reach: 2_900, interactions: 191, saves: 29, followers: 12 },
        matured: 0.51,
        pace: 1.1,
        share: 0.052,
      },
      {
        id: 'c-p6',
        title: 'The retainer question, answered',
        publishedAt: '11 Aug 26',
        age: '3 hours',
        account: ACCOUNTS.linkedin,
        maturity: 'counting',
        metrics: { reach: 480, interactions: 34, saves: 6, followers: 2 },
        matured: 0.06,
        pace: null,
        share: 0.009,
      },
    ],
  },
  sideBySide: {
    ...workspaceMature.sideBySide,
    dimension: 'format',
    rows: [
      {
        sleeve: { id: 'carousel', label: 'Carousel', sample: 5, tone: 1 },
        value: 31_200,
        previous: 24_000,
        perPost: 6_240,
        series: makeSeries({ days: 28, base: 1000, drift: 0.3, seed: 61 }),
      },
      {
        sleeve: { id: 'single', label: 'Single image', sample: 4, tone: 2 },
        value: 14_800,
        previous: 16_100,
        perPost: 3_700,
        series: makeSeries({ days: 28, base: 520, drift: -0.1, seed: 62 }),
      },
      {
        sleeve: { id: 'video', label: 'Video', sample: 2, tone: 3 },
        value: 9_400,
        previous: null,
        perPost: 4_700,
        series: makeSeries({ days: 28, base: 330, noise: 0.5, seed: 63 }),
      },
    ],
    verdict: {
      id: 'format-call',
      tone: 'neutral',
      text: 'Carousels are earning roughly 1.7× a single image per post in this campaign, on a thin sample. Worth another two or three before treating it as settled.',
      basis: '5 carousels vs 4 single images',
    },
  },
  next: {
    ...workspaceMature.next,
    pacing: {
      kind: 'bounded',
      published: 14,
      planned: 18,
      periodLabel: 'so far',
      projected: 26,
      target: 32,
      endsOn: '30 September',
    },
  },
}

export const campaignEvergreen: AnalyticsData = {
  ...campaignBounded,
  next: {
    ...campaignBounded.next,
    pacing: { kind: 'evergreen', published: 6, planned: 8, periodLabel: 'this month' },
  },
}

export const campaignFinished: AnalyticsData = {
  ...campaignBounded,
  now: {
    ...campaignBounded.now,
    comparedToDate: DEFAULT_PERIOD.from,
    insights: [
      {
        id: 'done',
        tone: 'positive',
        text: 'This campaign finished on 30 September with 29 of the 32 posts it planned, and beat the one before it on reach per post by about a fifth.',
        basis: 'All 29 posts measured and settled',
      },
    ],
    coverage: { measured: 29, published: 29, lastRefreshedAt: '3 days ago' },
  },
  next: {
    pacing: null,
    actions: [
      {
        id: 'fin1',
        urgency: 'whenever',
        title: 'Three posts from this campaign are still earning',
        detail: 'They could carry into the next one rather than being written again.',
        target: 'See them',
      },
    ],
  },
}

/* ------------------------------------------------------------- post data -- */

const HOUR = 3_600_000

/**
 * Midday today, and the fixtures' "now". A post's age is measured back from
 * here, so "4 hours ago" lands on a real clock and the day-bucketed charts get
 * real dates on their axis.
 */
const NOW = TODAY + 12 * HOUR

/** Share of a post's lifetime earning that has landed by `hours`. */
function matured(hours: number, halfLife = 19): number {
  return 1 - Math.pow(0.5, hours / halfLife)
}

/**
 * One measure's hourly history, from the same half-life the workspace's
 * maturation curve is built on.
 *
 * Three things make it read like data rather than like a formula. The buckets
 * **wobble** — a real hour is never exactly the curve. Each measure gets its
 * own **half-life**: interactions lag reach, so a post's reach flattens while
 * its interactions are still climbing, which is the finding a stack of charts
 * exists to make visible and a single chart hides. And a **bump** can be dropped
 * in, because a re-share on day three is the most common reason a settled post
 * starts moving again, and a chart that can't show one is not worth drawing.
 *
 * The buckets are rounded off the *running total* rather than individually, so
 * they always sum to exactly the figure in the tile. A cumulative line whose
 * last point is 18,417 above a tile reading 18,420 is a rounding artefact the
 * reader has no way to diagnose.
 */
function hourly(
  publishedAt: number,
  ageHours: number,
  total: number,
  halfLife: number,
  seed: number,
  bump?: { hour: number; share: number },
): PostSeriesPoint[] {
  const hours = Math.max(1, Math.round(ageHours))
  const rand = seeded(seed)
  const weights = Array.from({ length: hours }, (_, i) => {
    const gained = Math.pow(0.5, i / halfLife) - Math.pow(0.5, (i + 1) / halfLife)
    const wobble = 1 + (rand() - 0.5) * 0.7
    const extra = bump && i >= bump.hour && i < bump.hour + 8 ? bump.share / 8 : 0
    return Math.max(0, gained * wobble + extra)
  })
  const sum = weights.reduce((a, b) => a + b, 0) || 1

  let running = 0
  let placed = 0
  return weights.map((weight, i) => {
    running += weight / sum
    const cumulative = Math.round(running * total)
    const value = cumulative - placed
    placed = cumulative
    return {
      at: new Date(publishedAt + (i + 1) * HOUR).toISOString(),
      hour: i + 1,
      value,
    }
  })
}

/**
 * Every flow a post can be charted on, with the half-life and the seed that
 * make each one its own curve rather than the same curve relabelled.
 *
 * The half-lives are the finding the separate cards exist to show. Clicks are
 * the fastest — someone taps the link in the same breath as reading the post —
 * and saves are the slowest, because a save is a decision to come back. Reach
 * settling while interactions are still climbing is the same effect one card
 * further down.
 *
 * No engagement rate here, and there never will be: a rate has no bucket value
 * that can be summed into a day or accumulated into a running total, so the
 * card divides interactions by reach at whatever bucketing is on screen.
 */
const FLOW_SHAPE = {
  reach: { halfLife: 19, seed: 11 },
  impressions: { halfLife: 19, seed: 23 },
  interactions: { halfLife: 26, seed: 37 },
  saves: { halfLife: 34, seed: 53 },
  clicks: { halfLife: 14, seed: 67 },
  views: { halfLife: 17, seed: 71 },
} as const

type FlowTotals = Partial<Record<keyof typeof FLOW_SHAPE, number>>

/**
 * A post's history across whichever flows its platform reported.
 *
 * A measure left out of `totals` is a measure that platform doesn't hand back —
 * an image post has no views, a post with no link has no clicks — and it ends up
 * with no series and no card, rather than a card drawing a flat line at zero.
 */
function postSeries(
  ageHours: number,
  totals: FlowTotals,
  bump?: { hour: number; share: number },
): PostSeries[] {
  const publishedAt = NOW - ageHours * HOUR
  return (Object.keys(FLOW_SHAPE) as (keyof typeof FLOW_SHAPE)[])
    .filter((measure) => totals[measure] !== undefined)
    .map((measure) => ({
      measure,
      points: hourly(
        publishedAt,
        ageHours,
        totals[measure] as number,
        FLOW_SHAPE[measure].halfLife,
        FLOW_SHAPE[measure].seed,
        bump,
      ),
    }))
}

/**
 * What a typical post of this workspace finishes on, and the range they land
 * in. One set, shared by every post fixture, so the same figure means the same
 * thing whichever specimen it appears in.
 */
const TYPICAL_POST = {
  reach: { typical: 4_800, expected: { low: 2_600, high: 9_400 } },
  impressions: { typical: 6_900, expected: { low: 3_700, high: 13_500 } },
  interactions: { typical: 240, expected: { low: 110, high: 470 } },
  engagement_rate: { typical: 0.049, expected: { low: 0.031, high: 0.068 } },
  saves: { typical: 96, expected: { low: 38, high: 210 } },
  clicks: { typical: 145, expected: { low: 60, high: 340 } },
  views: { typical: 8_400, expected: { low: 3_900, high: 19_000 } },
} as const

/**
 * A post's figures, with every comparison corrected for how old the post is.
 *
 * A four-hour-old post held against what finished posts earn is the age lie: it
 * would read "below usual" on every count and be wrong on all of them. So a
 * total is compared with the share of the typical total a post has usually
 * earned by this age — the workspace's own curve. A **rate** is not scaled: an
 * engagement rate is roughly itself from the first hour, and shrinking it would
 * invent the mistake this correction exists to prevent.
 *
 * A measure left out of `values` is one the platform didn't report, and it gets
 * no figure and no card. Absent is not zero, and the difference matters most on
 * exactly the measures platforms are inconsistent about — a post that isn't a
 * video has no views, and ranking it last on views would be a fact about the
 * format rather than about the post.
 */
type PostValues = Partial<Record<keyof typeof TYPICAL_POST, number>>

function postMetrics(values: PostValues, ageHours?: number): PostMetric[] {
  const share = ageHours === undefined ? 1 : matured(ageHours)
  const scale = (n: number) => Math.round(n * share)

  return (Object.keys(TYPICAL_POST) as (keyof typeof TYPICAL_POST)[])
    .filter((measure) => values[measure] !== undefined)
    .map((measure) => {
      const typical = TYPICAL_POST[measure]
      // The rate keeps its plain typical throughout — see above.
      const rate = measure === 'engagement_rate'
      return {
        measure,
        value: values[measure] as number,
        typical: rate ? typical.typical : scale(typical.typical),
        expected: rate
          ? { ...typical.expected }
          : {
              low: scale(typical.expected.low),
              high: scale(typical.expected.high),
            },
      }
    })
}

export const postUnpublished: PostPerformanceView = {
  maturity: 'unpublished',
  post: {
    title: 'Three signs a crown needs replacing',
    platform: 'instagram',
    account: '@ogendental',
    format: 'Single image',
    // The one specimen with a date in the future. The card is the same card —
    // which is the point of it not being an analytics card.
    scheduledFor: 'Friday 21 Aug 2026, 09:00',
    campaign: 'Spring implant campaign',
  },
  percentile: null,
  metrics: [],
  series: [],
  insight: null,
}

/** Out, and the platform has said nothing back. Not the same as earning nothing. */
export const postUnreported: PostPerformanceView = {
  maturity: 'counting',
  post: {
    title: 'Meet the team behind your treatment plan',
    platform: 'linkedin',
    account: 'Ogen Dental',
    format: 'Single image',
    publishedOn: '18 Aug 2026, 08:20',
    publishedAgo: '40 minutes ago',
    campaign: 'Spring implant campaign',
    permalink: 'https://www.linkedin.com/feed/update/urn:li:activity:7231000000000',
  },
  // Most of the answer on this specimen: forty minutes is *why* there is
  // nothing back, and without it the empty card reads as a fault.
  measuredOver: '40 minutes',
  percentile: null,
  metrics: [],
  series: [],
  insight: null,
  lastRefreshedAt: '12 minutes ago',
}

export const postCounting: PostPerformanceView = {
  maturity: 'counting',
  post: {
    title: 'Why we photograph every implant before we place it',
    platform: 'instagram',
    account: '@ogendental',
    // Named on the card, and the reason there is no views card below it.
    format: 'Single image',
    publishedOn: '18 Aug 2026, 07:40',
    publishedAgo: '4 hours ago',
    campaign: 'Spring implant campaign',
    permalink: 'https://www.instagram.com/p/C_ogen_counting/',
  },
  measuredOver: '4 hours',
  percentile: null,
  // No views: this one is a single image, and a platform that doesn't report a
  // measure gets no card for it rather than a card reading zero.
  metrics: postMetrics(
    {
      reach: 1_840,
      impressions: 2_610,
      interactions: 96,
      engagement_rate: 0.0522,
      saves: 21,
      clicks: 34,
    },
    4,
  ),
  sample: 96,
  // Four hours old, so four buckets. The shortest series the charts have to
  // survive, and the one that decides whether they hold their shape at all.
  series: postSeries(4, {
    reach: 1_840,
    impressions: 2_610,
    interactions: 96,
    saves: 21,
    clicks: 34,
  }),
  insight: {
    id: 'early',
    tone: 'neutral',
    text: 'Well ahead of where your posts usually are four hours in. Half of everything a post of yours earns arrives in its first 19 hours, so most of this is decided by tonight.',
    basis: 'Half-life measured across 74 finished posts',
  },
  lastRefreshedAt: '20 minutes ago',
}

export const postSettling: PostPerformanceView = {
  maturity: 'settling',
  post: {
    title: 'Sixty seconds inside an implant consultation',
    platform: 'instagram',
    account: '@ogen.clinic',
    format: 'Reel',
    publishedOn: '17 Aug 2026, 18:00',
    publishedAgo: 'yesterday',
    campaign: 'Spring implant campaign',
    permalink: 'https://www.instagram.com/reel/C_ogen_settling/',
  },
  measuredOver: '26 hours',
  percentile: 78,
  // The fullest specimen: a reel, so every measure the sweep can carry came
  // back and the surface runs to all seven cards.
  metrics: postMetrics(
    {
      reach: 7_210,
      impressions: 9_400,
      interactions: 402,
      engagement_rate: 0.0557,
      saves: 88,
      clicks: 116,
      views: 5_900,
    },
    26,
  ),
  sample: 96,
  series: postSeries(26, {
    reach: 7_210,
    impressions: 9_400,
    interactions: 402,
    saves: 88,
    clicks: 116,
    views: 5_900,
  }),
  insight: {
    id: 'settling',
    tone: 'positive',
    text: 'Roughly four-fifths of what it will earn is already in. If it holds this shape it finishes in your top decile.',
    basis: 'Projected off a 19-hour half-life across 74 finished posts',
  },
  lastRefreshedAt: '25 minutes ago',
}

export const postOutperformer: PostPerformanceView = {
  maturity: 'final',
  post: {
    title: 'The mistake we made on our first implant case',
    platform: 'linkedin',
    account: 'Ogen Dental',
    // The insight below credits the carousel. The card is where that is
    // checkable rather than taken on trust.
    format: 'Carousel — 6 cards',
    publishedOn: '6 Aug 2026, 09:15',
    publishedAgo: '12 days ago',
    campaign: 'Spring implant campaign',
    permalink: 'https://www.linkedin.com/feed/update/urn:li:activity:7228000000000',
  },
  measuredOver: '12 days',
  percentile: 94,
  metrics: postMetrics({
    reach: 18_420,
    impressions: 26_100,
    interactions: 1_308,
    engagement_rate: 0.071,
    saves: 412,
    clicks: 690,
  }),
  sample: 96,
  // 288 hourly buckets, with a second wave on day three — the specimen that
  // shows why the interval reading exists at all. On the running total the
  // re-share is a change of gradient nobody would notice; per hour it is a
  // second peak, and it is the only thing on the card that says *do that again*.
  series: postSeries(
    12 * 24,
    {
      reach: 18_420,
      impressions: 26_100,
      interactions: 1_308,
      saves: 412,
      clicks: 690,
    },
    { hour: 70, share: 0.14 },
  ),
  insight: {
    id: 'why',
    tone: 'positive',
    text: 'Your best post in three months. It opens with a mistake and it is a carousel — both things that outperform for you.',
    basis: 'Against 96 measured posts',
  },
  lastRefreshedAt: '2 hours ago',
}

export const postUnderperformer: PostPerformanceView = {
  maturity: 'final',
  post: {
    title: 'Five foods to avoid with a temporary crown',
    platform: 'facebook',
    account: 'Ogen Dental Practice',
    format: 'Single image',
    // 02:40 on a Sunday — the finding at the foot of the surface, and the one
    // fact on it a reader can check for themselves.
    publishedOn: '26 Jul 2026, 02:40',
    publishedAgo: '3 weeks ago',
    campaign: 'Spring implant campaign',
    permalink: 'https://www.facebook.com/ogendental/posts/1220000000',
  },
  measuredOver: '3 weeks',
  percentile: 12,
  metrics: postMetrics({
    reach: 610,
    impressions: 740,
    interactions: 14,
    engagement_rate: 0.023,
    saves: 2,
    clicks: 5,
  }),
  sample: 96,
  // Three weeks of hours — 504 buckets against a total of 610 — which is both
  // the density limit of the hourly reading and the case the day bucket exists
  // for.
  series: postSeries(21 * 24, {
    reach: 610,
    impressions: 740,
    interactions: 14,
    // Two saves and five clicks across five hundred buckets: the sparsest thing
    // any of these charts has to draw, and the case a running total reads
    // clearly and an hourly column chart does not.
    saves: 2,
    clicks: 5,
  }),
  insight: {
    id: 'why-not',
    tone: 'negative',
    text: 'This went out at 02:40 on a Sunday, which is your weakest slot by some distance. The content may be fine — the timing was not.',
    basis: 'Your Sunday-night posts average a third of your median reach',
  },
  lastRefreshedAt: '2 hours ago',
}

/**
 * A finished post in a workspace with no history behind it. Every comparison on
 * the card withdraws at once — no typical, no range, no rank — which is the
 * state that decides whether the figures can still carry the card alone.
 */
export const postNoBaseline: PostPerformanceView = {
  maturity: 'final',
  post: {
    title: "We're open on Saturdays from this month",
    platform: 'instagram',
    account: '@ogen.north',
    format: 'Single image',
    publishedOn: '13 Aug 2026, 10:30',
    publishedAgo: '5 days ago',
    // A three-week-old workspace, still on its first campaign.
    campaign: 'Opening the north practice',
    permalink: 'https://www.instagram.com/p/C_ogen_nobaseline/',
  },
  measuredOver: '5 days',
  percentile: null,
  metrics: [
    { measure: 'reach', value: 2_140 },
    { measure: 'impressions', value: 2_980 },
    { measure: 'interactions', value: 88 },
    { measure: 'engagement_rate', value: 0.0411 },
    { measure: 'saves', value: 26 },
    { measure: 'clicks', value: 41 },
  ],
  series: postSeries(5 * 24, {
    reach: 2_140,
    impressions: 2_980,
    interactions: 88,
    saves: 26,
    clicks: 41,
  }),
  insight: null,
  lastRefreshedAt: '35 minutes ago',
}

/**
 * Figures, and nothing that recorded how they arrived — a post published before
 * the sweep started, or one whose platform only ever hands back a total.
 *
 * The state the charts are gated on, and the reason they are gated on the series
 * rather than on the post's age: everything else about this post is ordinary.
 */
export const postNoHistory: PostPerformanceView = {
  maturity: 'final',
  post: {
    title: 'Our nurse-led whitening clinic is back',
    platform: 'linkedin',
    account: 'Ogen Dental',
    format: 'Single image',
    // Older than the sweep, which is the whole specimen: the card above is
    // complete and every chart below it is missing.
    publishedOn: '16 Jun 2026, 11:05',
    publishedAgo: '2 months ago',
    campaign: 'Whitening relaunch',
    permalink: 'https://www.linkedin.com/feed/update/urn:li:activity:7210000000000',
  },
  measuredOver: '2 months',
  percentile: 61,
  metrics: postMetrics({
    reach: 5_310,
    impressions: 7_240,
    interactions: 268,
    engagement_rate: 0.0505,
    saves: 74,
    clicks: 118,
  }),
  sample: 96,
  series: [],
  insight: null,
  lastRefreshedAt: '3 hours ago',
}
