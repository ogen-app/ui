import { describe, expect, it } from 'vitest'
import type { PostEvaluation, QualityDimension } from '@/types/quality'
import {
  ASSESS_STEPS,
  QUALITY_DIMENSIONS,
  isAssessmentStale,
  overallBand,
  overallPct,
  scoreBand,
  stepLabel,
  suggestionsOf,
  totalSuggestions,
} from './postQuality.ts'

function dimension(
  overrides: Partial<QualityDimension> = {},
): QualityDimension {
  return {
    score: 7,
    rationale: 'Reads cleanly but the hook is generic.',
    weakness: 'The opening line could open any post.',
    suggestions: null,
    weight: 0.25,
    contribution: 17.5,
    ...overrides,
  }
}

function evaluation(overrides: Partial<PostEvaluation> = {}): PostEvaluation {
  return {
    id: 'e1',
    post_id: 'p1',
    platform_id: 'linkedin',
    platform_post_type: 'text-post',
    caption_scoped: false,
    overall_pct: 72.5,
    result: {
      correctness: dimension(),
      clarity: dimension(),
      engagement: dimension(),
      delivery: dimension(),
    },
    model_id: 'claude-haiku-4-5',
    input_hash: 'abc123',
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
    ...overrides,
  }
}

describe('scoreBand', () => {
  it('bands the 0-10 scale at the rubric thresholds', () => {
    expect(scoreBand(10)).toBe('strong')
    expect(scoreBand(8)).toBe('strong')
    expect(scoreBand(7)).toBe('workable')
    expect(scoreBand(5)).toBe('workable')
    expect(scoreBand(4)).toBe('weak')
    expect(scoreBand(0)).toBe('weak')
  })
})

describe('overallBand', () => {
  it('bands the percentage on its own scale, not the score one', () => {
    expect(overallBand(80)).toBe('strong')
    expect(overallBand(79.9)).toBe('workable')
    expect(overallBand(50)).toBe('workable')
    expect(overallBand(49.9)).toBe('weak')
  })

  // The two scales are one order of magnitude apart; feeding a score to the
  // percentage bander (or the reverse) silently produces a plausible answer.
  it('does not agree with scoreBand on the same number', () => {
    expect(overallBand(8)).toBe('weak')
    expect(scoreBand(8)).toBe('strong')
  })
})

describe('overallPct', () => {
  it('passes a normal percentage through', () => {
    expect(overallPct(evaluation({ overall_pct: 72.5 }))).toBe(72.5)
  })

  it('clamps out-of-range and non-finite values so the ring can draw them', () => {
    expect(overallPct(evaluation({ overall_pct: 140 }))).toBe(100)
    expect(overallPct(evaluation({ overall_pct: -3 }))).toBe(0)
    expect(overallPct(evaluation({ overall_pct: NaN }))).toBe(0)
  })
})

describe('suggestionsOf', () => {
  // Go marshals an empty slice as null, so this is the shape on the wire for
  // every dimension the model had nothing to say about.
  it('reads null as no suggestions', () => {
    expect(suggestionsOf(dimension({ suggestions: null }))).toEqual([])
  })

  it('reads a missing dimension as no suggestions', () => {
    expect(suggestionsOf(undefined)).toEqual([])
  })
})

describe('totalSuggestions', () => {
  it('counts across all four dimensions', () => {
    const one = [
      {
        dimension: 'clarity' as const,
        severity: 'high' as const,
        issue: 'Buried lede',
        fix: 'Lead with the outcome.',
        span: 'After twelve years',
      },
    ]
    const evaluated = evaluation({
      result: {
        correctness: dimension({ suggestions: null }),
        clarity: dimension({ suggestions: one }),
        engagement: dimension({ suggestions: [...one, ...one] }),
        delivery: dimension({ suggestions: [] }),
      },
    })
    expect(totalSuggestions(evaluated)).toBe(3)
  })

  it('is zero when the model raised nothing', () => {
    expect(totalSuggestions(evaluation())).toBe(0)
  })
})

describe('isAssessmentStale', () => {
  it('flags a post edited after it was scored', () => {
    expect(isAssessmentStale(evaluation(), '2026-07-21T09:00:00Z')).toBe(true)
  })

  it('does not flag a post untouched since it was scored', () => {
    expect(isAssessmentStale(evaluation(), '2026-07-19T09:00:00Z')).toBe(false)
  })

  // The assessment is written after the post is read, so equal timestamps
  // mean "scored at the last save" — current, not stale.
  it('treats identical timestamps as current', () => {
    expect(isAssessmentStale(evaluation(), '2026-07-20T10:00:00Z')).toBe(false)
  })

  it('stays quiet rather than guessing when a timestamp is unparseable', () => {
    expect(isAssessmentStale(evaluation(), '')).toBe(false)
    expect(
      isAssessmentStale(
        evaluation({ updated_at: 'nope' }),
        '2026-07-21T09:00:00Z',
      ),
    ).toBe(false)
  })
})

describe('stepLabel', () => {
  it('names every stage the flow emits', () => {
    for (const { step, label } of ASSESS_STEPS) {
      expect(stepLabel(step)).toBe(label)
    }
  })

  // A stage added to the flow before this file knows about it should read as
  // prose, not as a raw identifier.
  it('spaces out a stage it has no copy for', () => {
    expect(stepLabel('rerankSuggestions')).toBe('Rerank suggestions')
  })
})

describe('QUALITY_DIMENSIONS', () => {
  it('covers the four keys the backend scores, in rubric order', () => {
    expect(QUALITY_DIMENSIONS.map((d) => d.key)).toEqual([
      'correctness',
      'clarity',
      'engagement',
      'delivery',
    ])
  })

  // CON-85: Correctness and Clarity are platform-agnostic, the other two are
  // judged against the channel's conventions.
  it('marks only Engagement and Delivery as platform-aware', () => {
    expect(
      QUALITY_DIMENSIONS.filter((d) => d.platformAware).map((d) => d.key),
    ).toEqual(['engagement', 'delivery'])
  })
})
