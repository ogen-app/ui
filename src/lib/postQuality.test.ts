import { describe, expect, it } from 'vitest'
import type {
  PostEvaluation,
  QualityDimension,
  QualitySuggestion,
} from '@/types/quality'
import {
  ASSESS_STEPS,
  QUALITY_DIMENSIONS,
  automaticTrigger,
  formatDelta,
  heaviestDimension,
  lowestDimension,
  radarPoint,
  radarScore,
  scoreDelta,
  overallBand,
  overallPct,
  postSuggestions,
  runsLeft,
  scoreBand,
  staleReason,
  stepLabel,
  suggestionsOf,
} from './postQuality.ts'

function dimension(
  overrides: Partial<QualityDimension> = {},
): QualityDimension {
  return {
    score: 7,
    verdict: 'Reads cleanly, but the opening line could open any post.',
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
    trigger: 'manual',
    stale: false,
    runs_used: 1,
    runs_limit: null,
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

function suggestion(
  overrides: Partial<QualitySuggestion> = {},
): QualitySuggestion {
  return {
    dimension: 'clarity',
    severity: 'medium',
    span: 'After twelve years',
    advice: 'Lead with the outcome so the claim lands before the fold.',
    ...overrides,
  }
}

describe('postSuggestions', () => {
  it('gathers every dimension into one list, most severe first', () => {
    const evaluated = evaluation({
      result: {
        correctness: dimension({
          suggestions: [
            suggestion({ dimension: 'correctness', severity: 'low' }),
          ],
        }),
        clarity: dimension({
          suggestions: [
            suggestion({ dimension: 'clarity', severity: 'medium' }),
          ],
        }),
        engagement: dimension({
          suggestions: [
            suggestion({ dimension: 'engagement', severity: 'high' }),
            suggestion({ dimension: 'engagement', severity: 'low' }),
          ],
        }),
        delivery: dimension({ suggestions: null }),
      },
    })
    expect(
      postSuggestions(evaluated).map((s) => [s.dimension, s.severity]),
    ).toEqual([
      ['engagement', 'high'],
      ['clarity', 'medium'],
      ['correctness', 'low'],
      ['engagement', 'low'],
    ])
  })

  // Stable, so the same result never reshuffles between two renders.
  it('keeps rubric order between suggestions of the same severity', () => {
    const evaluated = evaluation({
      result: {
        correctness: dimension(),
        clarity: dimension({
          suggestions: [suggestion({ dimension: 'clarity', severity: 'high' })],
        }),
        engagement: dimension(),
        delivery: dimension({
          suggestions: [
            suggestion({ dimension: 'delivery', severity: 'high' }),
          ],
        }),
      },
    })
    expect(postSuggestions(evaluated).map((s) => s.dimension)).toEqual([
      'clarity',
      'delivery',
    ])
  })

  it('is empty when the model raised nothing', () => {
    expect(postSuggestions(evaluation())).toEqual([])
  })
})

describe('staleReason', () => {
  it('is null for a current score', () => {
    expect(staleReason(evaluation({ stale: false }))).toBeNull()
  })

  it("passes the server's reason through", () => {
    expect(
      staleReason(evaluation({ stale: true, stale_reason: 'context' })),
    ).toBe('context')
    expect(staleReason(evaluation({ stale: true, stale_reason: 'both' }))).toBe(
      'both',
    )
  })

  it('reads a reasonless stale as a content change', () => {
    expect(staleReason(evaluation({ stale: true }))).toBe('content')
  })

  // The reason names a catalogue key; one from a newer server must not
  // render as the raw key.
  it('reads a reason it has no copy for as a content change', () => {
    const unknown = { stale: true, stale_reason: 'rubric' } as unknown
    expect(staleReason(evaluation(unknown as Partial<PostEvaluation>))).toBe(
      'content',
    )
  })

  // A run's `complete` evaluation carries no staleness at all.
  it('treats a missing flag as current', () => {
    expect(staleReason(evaluation({ stale: undefined }))).toBeNull()
  })
})

describe('runsLeft', () => {
  it('says nothing on an unlimited plan', () => {
    expect(runsLeft(evaluation({ runs_limit: null }))).toBeNull()
    expect(runsLeft(evaluation({ runs_limit: undefined }))).toBeNull()
    expect(runsLeft(null)).toBeNull()
  })

  it('counts what is left of the cap', () => {
    expect(runsLeft(evaluation({ runs_used: 3, runs_limit: 5 }))).toEqual({
      left: 2,
      limit: 5,
    })
  })

  it('never goes below zero', () => {
    expect(runsLeft(evaluation({ runs_used: 7, runs_limit: 5 }))?.left).toBe(0)
  })
})

describe('automaticTrigger', () => {
  it('names a lifecycle checkpoint', () => {
    expect(automaticTrigger(evaluation({ trigger: 'ready' }))).toBe('ready')
    expect(automaticTrigger(evaluation({ trigger: 'published' }))).toBe(
      'published',
    )
  })

  it('says nothing for a manual run or a pre-CON-438 row', () => {
    expect(automaticTrigger(evaluation({ trigger: 'manual' }))).toBeNull()
    expect(automaticTrigger(evaluation({ trigger: '' }))).toBeNull()
    expect(automaticTrigger(evaluation({ trigger: undefined }))).toBeNull()
  })

  it('says nothing for a checkpoint it has no copy for', () => {
    const unknown = { trigger: 'imported' } as unknown
    expect(
      automaticTrigger(evaluation(unknown as Partial<PostEvaluation>)),
    ).toBeNull()
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

  // The radar's left half is the writing, the right half the channel fit
  // (CON-440); the corners are what put each dimension on its side.
  it('puts the platform-aware dimensions on the right-hand corners', () => {
    for (const d of QUALITY_DIMENSIONS) {
      expect(d.corner.endsWith('e')).toBe(d.platformAware)
    }
  })
})

describe('heaviestDimension', () => {
  it('names the dimension with the largest weight', () => {
    const e = evaluation()
    e.result.engagement = dimension({ weight: 0.4 })
    expect(heaviestDimension(e)).toBe('engagement')
  })

  // Equal weights are the plain average; naming one would invent a lean.
  it('names none when the top weight is shared', () => {
    expect(heaviestDimension(evaluation())).toBeNull()
  })
})

describe('lowestDimension', () => {
  it('names the single lowest score', () => {
    const e = evaluation()
    e.result.delivery = dimension({ score: 5 })
    expect(lowestDimension(e)).toBe('delivery')
  })

  it('names none on a tie for last', () => {
    expect(lowestDimension(evaluation())).toBeNull()
  })
})

describe('scoreDelta', () => {
  it('is the change since the previous run, zero included', () => {
    const before = evaluation()
    const after = evaluation()
    after.result.delivery = dimension({ score: 9 })
    expect(scoreDelta(after, before, 'delivery')).toBe(2)
    expect(scoreDelta(after, before, 'clarity')).toBe(0)
  })

  it('is null with nothing to compare against', () => {
    expect(scoreDelta(evaluation(), null, 'clarity')).toBeNull()
  })
})

describe('formatDelta', () => {
  it('signs every change, with a real minus and a ±0 for none', () => {
    expect(formatDelta(2)).toBe('+2')
    expect(formatDelta(-1)).toBe('\u22121')
    expect(formatDelta(0)).toBe('\u00b10')
  })
})

describe('radarPoint', () => {
  it('puts a 10 on the outer corner and a 0 on the centre', () => {
    expect(radarPoint('nw', 10, 90)).toEqual({ x: -90, y: -90 })
    expect(radarPoint('se', 10, 90)).toEqual({ x: 90, y: 90 })
    expect(radarPoint('ne', 0, 90)).toEqual({ x: 0, y: 0 })
  })

  it('scales linearly along the diagonal', () => {
    expect(radarPoint('sw', 5, 90)).toEqual({ x: -45, y: 45 })
  })

  it('clamps scores outside the 0-10 axis', () => {
    expect(radarScore(14)).toBe(10)
    expect(radarScore(-2)).toBe(0)
    expect(radarScore(NaN)).toBe(0)
  })
})
