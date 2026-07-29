import type {
  PostEvaluation,
  QualityDimension,
  QualityDimensionKey,
  QualitySuggestion,
} from '@/types/quality'

/**
 * Fixtures for the post-quality design harness. Written to look like real
 * model output rather than lorem: the panel's layout is decided by how long a
 * rationale runs and how many suggestions a dimension raises, so short
 * placeholder text would make every state look fine.
 */

/**
 * Anchored to load time, not to a literal date: the panel renders "scored N
 * ago" against the real clock, so a pinned timestamp would drift into "in 3
 * hours" by the afternoon. The offsets below are what the harness is
 * actually demonstrating.
 */
const NOW = new Date()

function isoMinus(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

/** Two days before the assessment — the post has not been touched since. */
export const POST_UNCHANGED_AT = isoMinus(60 * 24 * 2)
/** Ten minutes after it — the post was edited, so the score is stale. */
export const POST_EDITED_AT = isoMinus(50)

function suggestion(overrides: Partial<QualitySuggestion> = {}): QualitySuggestion {
  return {
    dimension: 'engagement',
    severity: 'medium',
    issue: 'The opening line could open any post',
    fix: 'Lead with the number from the third paragraph — it is the only surprising thing here.',
    span: 'After more than a decade working with teams across the sector, we have always believed',
    ...overrides,
  }
}

function dimension(overrides: Partial<QualityDimension> = {}): QualityDimension {
  return {
    score: 7,
    rationale:
      'The argument holds together and the examples are concrete, but the second and third paragraphs make the same point twice with different phrasing.',
    weakness: 'Paragraphs two and three are the same claim restated.',
    suggestions: null,
    weight: 0.25,
    contribution: 17.5,
    ...overrides,
  }
}

function evaluation(overrides: Partial<PostEvaluation> = {}): PostEvaluation {
  return {
    id: 'eval-1',
    post_id: 'post-1',
    platform_id: 'linkedin',
    platform_post_type: 'text-post',
    caption_scoped: false,
    overall_pct: 71.5,
    model_id: 'claude-haiku-4-5',
    input_hash: 'e3b0c44298fc',
    created_at: isoMinus(60 * 24),
    updated_at: isoMinus(60 * 24),
    result: {
      correctness: dimension(),
      clarity: dimension(),
      engagement: dimension(),
      delivery: dimension(),
    },
    ...overrides,
  }
}

/**
 * Contributions have to add up to `overall_pct`, or the composition bar
 * silently disagrees with the ring above it — exactly the bug a harness is
 * for catching. This derives one from the other so a fixture can't drift.
 */
function scored(
  scores: Record<QualityDimensionKey, number>,
  weights: Record<QualityDimensionKey, number>,
  parts: Partial<Record<QualityDimensionKey, Partial<QualityDimension>>> = {},
): Pick<PostEvaluation, 'overall_pct' | 'result'> {
  const keys: QualityDimensionKey[] = ['correctness', 'clarity', 'engagement', 'delivery']
  const result = {} as PostEvaluation['result']
  let overall = 0
  for (const key of keys) {
    const contribution = weights[key] * (scores[key] / 10) * 100
    overall += contribution
    result[key] = dimension({
      score: scores[key],
      weight: weights[key],
      contribution,
      ...parts[key],
    })
  }
  return { overall_pct: overall, result }
}

/** CON-85's illustrative profiles, by post type. */
export const WEIGHTS = {
  text: { correctness: 0.3, clarity: 0.3, engagement: 0.2, delivery: 0.2 },
  image: { correctness: 0.2, clarity: 0.15, engagement: 0.35, delivery: 0.3 },
  carousel: { correctness: 0.2, clarity: 0.3, engagement: 0.25, delivery: 0.25 },
} as const

/** A post the model liked: 88%, one low-severity note. */
export const STRONG = evaluation({
  ...scored(
    { correctness: 9, clarity: 9, engagement: 8, delivery: 9 },
    WEIGHTS.text,
    {
      correctness: {
        rationale:
          'Every claim is either sourced in the post or consistent with the campaign brief, and the two figures quoted match the brief exactly. No mechanical errors.',
        weakness: 'The phrase "industry consensus" is doing work no citation supports.',
      },
      clarity: {
        rationale:
          'One takeaway, stated in the first line and paid off in the last. Sentences are long but the structure carries them.',
        weakness: 'The fourth paragraph opens with three subordinate clauses before its verb.',
      },
      engagement: {
        rationale:
          'The hook is a specific, slightly uncomfortable number, which is the strongest opening available for this audience on LinkedIn. The close invites a reply rather than a like.',
        weakness: 'No reason to act today rather than next month.',
        suggestions: [
          suggestion({
            dimension: 'engagement',
            severity: 'low',
            issue: 'The call to action has no deadline',
            fix: 'Tie the ask to the quarter it belongs to, so there is a reason to answer now.',
            span: 'let us know how you are thinking about this',
          }),
        ],
      },
      delivery: {
        rationale:
          'Length sits in the middle of the LinkedIn band, line breaks fall on the argument boundaries, and there is no hashtag soup — three tags, all specific.',
        weakness: 'The link is bare rather than wrapped in a sentence.',
      },
    },
  ),
})

/** The common case: 66%, notes on three of the four dimensions. */
export const WORKABLE = evaluation({
  ...scored(
    { correctness: 7, clarity: 6, engagement: 6, delivery: 7 },
    WEIGHTS.text,
    {
      correctness: {
        suggestions: [
          suggestion({
            dimension: 'correctness',
            severity: 'medium',
            issue: 'A figure here contradicts the campaign brief',
            fix: 'The brief says 40% of the pipeline; this says "most of it". Use the number.',
            span: 'most of the pipeline now comes through partners',
          }),
        ],
      },
      clarity: {
        rationale:
          'The point is recoverable but takes a second pass: the post opens on background and only reaches its claim in the fifth sentence.',
        weakness: 'The claim arrives after the reader has already decided whether to keep going.',
        suggestions: [
          suggestion({
            dimension: 'clarity',
            severity: 'high',
            issue: 'The point is buried below the fold',
            fix: 'Move the fifth sentence to the top and cut the background to one clause.',
            span: 'Founded in 2014, the team has spent the last decade working across logistics, retail and light manufacturing, and in that time',
          }),
          suggestion({
            dimension: 'clarity',
            severity: 'low',
            issue: 'Two terms are used for the same thing',
            fix: 'Pick either "rollout" or "deployment" and use it throughout.',
            span: 'the rollout took eleven weeks',
          }),
        ],
      },
      engagement: {
        suggestions: [
          suggestion({
            dimension: 'engagement',
            severity: 'high',
            issue: 'The opening line could open any post',
            fix: 'Lead with the eleven-week number — it is the only surprising thing here.',
            span: 'After more than a decade working with teams across the sector, we have always believed',
          }),
          suggestion({
            dimension: 'engagement',
            severity: 'medium',
            issue: 'No call to action',
            fix: 'Close on a question the audience has an opinion about, not a summary.',
            span: 'and that is what we have learned so far.',
          }),
          suggestion({
            dimension: 'engagement',
            severity: 'low',
            issue: 'The middle section reads as an internal update',
            fix: 'Frame the change in terms of what it cost the reader before it existed.',
            span: 'we restructured the onboarding team in March',
          }),
        ],
      },
      delivery: {
        rationale:
          'Formatting is clean and the tone matches the brief, but at 340 words this runs past where LinkedIn truncates and the payoff sits below the cut.',
        weakness: 'The payoff falls below the "see more" fold.',
      },
    },
  ),
})

/** A post in trouble: 31%, high-severity notes throughout. */
export const WEAK = evaluation({
  ...scored({ correctness: 4, clarity: 3, engagement: 2, delivery: 3 }, WEIGHTS.text, {
    correctness: {
      rationale:
        'Two claims contradict the campaign brief outright and a third is unverifiable from anything in context. One sentence contradicts the one before it.',
      weakness: 'The second and fourth paragraphs make opposite claims about the same launch.',
      suggestions: [
        suggestion({
          dimension: 'correctness',
          severity: 'high',
          issue: 'The post contradicts itself',
          fix: 'Decide whether the launch slipped or landed on time, then cut the other sentence.',
          span: 'we shipped on schedule, and the delay gave us time to get it right',
        }),
      ],
    },
    clarity: {
      rationale:
        'It is genuinely ambiguous what this post is about. Three unrelated subjects are introduced and none is resolved.',
      weakness: 'No single takeaway survives a first read.',
      suggestions: [
        suggestion({
          dimension: 'clarity',
          severity: 'high',
          issue: 'Three posts are competing inside one',
          fix: 'Keep the hiring news; move the product note and the event to their own posts.',
          span: 'Also worth mentioning, and on a completely separate note,',
        }),
      ],
    },
    engagement: {
      rationale:
        'The opening is a job title and a date. There is nothing in the first two lines that would earn the third under feed truncation, and no ask at the end.',
      weakness: 'The first line gives the reader no reason to continue.',
      suggestions: [
        suggestion({
          dimension: 'engagement',
          severity: 'high',
          issue: 'The hook is an announcement, not a reason to read',
          fix: 'Open on the problem the hire exists to solve.',
          span: 'We are pleased to announce that, effective 1 August,',
        }),
      ],
    },
    delivery: {
      rationale:
        'Reads as a press release pasted into a feed: no line breaks in 280 words, eleven hashtags at the foot, and a truncated link.',
      weakness: 'Eleven hashtags, none of them specific to the audience.',
      suggestions: [
        suggestion({
          dimension: 'delivery',
          severity: 'high',
          issue: 'Hashtag soup',
          fix: 'Keep the three that name the actual topic and drop the rest.',
          span: '#innovation #growth #future #team #hiring #leadership',
        }),
        suggestion({
          dimension: 'delivery',
          severity: 'medium',
          issue: 'One wall of text',
          fix: 'Break on the argument boundaries — roughly every two sentences for this length.',
          span: 'and as a result the team has been able to',
        }),
      ],
    },
  }),
})

/** An image post: caption-scoped, and weighted toward Engagement. */
export const CAPTION_SCOPED = evaluation({
  platform_post_type: 'image-post',
  caption_scoped: true,
  ...scored({ correctness: 8, clarity: 7, engagement: 5, delivery: 8 }, WEIGHTS.image, {
    engagement: {
      rationale:
        'Judged on the caption alone, the hook is weak — it describes the image rather than adding to it. The visual may well be carrying this, and it was not seen.',
      weakness: 'The caption restates the picture instead of extending it.',
      suggestions: [
        suggestion({
          dimension: 'engagement',
          severity: 'medium',
          issue: 'The caption describes the image',
          fix: 'Say the thing the picture cannot: the number, the date, or the consequence.',
          span: 'Our team at the summit last week',
        }),
      ],
    },
  }),
})
