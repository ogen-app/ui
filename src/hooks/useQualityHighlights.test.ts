import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { PostEvaluation, QualityDimension } from '@/types/quality'
import { useQualityHighlights } from './useQualityHighlights'

function dimension(
  suggestions: QualityDimension['suggestions'] = null,
): QualityDimension {
  return { score: 6, verdict: 'v', suggestions, weight: 0.25, contribution: 15 }
}

const EVALUATION: PostEvaluation = {
  id: 'e1',
  post_id: 'p1',
  platform_id: 'li',
  platform_post_type: 'text-post',
  caption_scoped: false,
  overall_pct: 60,
  result: {
    correctness: dimension([
      {
        dimension: 'correctness',
        severity: 'medium',
        span: 'kept 90% of their hives',
        advice: 'Cite it.',
      },
    ]),
    clarity: dimension(),
    engagement: dimension(),
    delivery: dimension([
      {
        dimension: 'delivery',
        severity: 'high',
        span: '[ai playground]',
        advice: 'Delete the tag.',
      },
    ]),
  },
  model_id: 'm',
  input_hash: 'h',
  created_at: '2026-11-02T10:00:00Z',
  updated_at: '2026-11-02T10:00:00Z',
}

const TITLE = '[ai playground] The Smallest Republics'

function setup(open = true, title = TITLE) {
  return renderHook((props) => useQualityHighlights(props), {
    initialProps: { assessment: EVALUATION, open, title },
  })
}

describe('useQualityHighlights', () => {
  it('marks nothing while the panel is closed', () => {
    const { result } = setup(false)
    expect(result.current.active).toBe(false)
    expect(result.current.bodySpans).toBeNull()
    expect(result.current.titleMarks).toEqual([])
  })

  it('finds title spans in the title and leaves the rest to the body', () => {
    const { result } = setup()
    // Most severe first: the high title tag, then the medium body span.
    expect(result.current.titleMarks).toEqual([
      { start: 0, end: 15, index: 0, severity: 'high', edited: false },
    ])
    expect(result.current.bodySpans).toEqual([
      { index: 1, span: 'kept 90% of their hives', severity: 'medium' },
    ])
    expect(result.current.statuses[0]).toBe('marked')
    expect(result.current.statuses[1]).toBeUndefined()
  })

  it('follows a title mark through an edit and reports it edited', () => {
    const { result, rerender } = setup()
    rerender({
      assessment: EVALUATION,
      open: true,
      title: '[ai sandbox] The Smallest Republics',
    })
    expect(result.current.titleMarks[0]).toMatchObject({
      start: 0,
      end: 12,
      edited: true,
    })
    expect(result.current.statuses[0]).toBe('edited')

    rerender({
      assessment: EVALUATION,
      open: true,
      title: 'The Smallest Republics',
    })
    expect(result.current.titleMarks).toEqual([])
    expect(result.current.statuses[0]).toBe('edited')
  })

  it('looks for nothing when a suggestion quotes nothing', () => {
    const unquoted = structuredClone(EVALUATION)
    unquoted.result.correctness.suggestions![0].span = ''
    const { result } = renderHook(() =>
      useQualityHighlights({ assessment: unquoted, open: true, title: TITLE }),
    )
    expect(result.current.bodySpans).toEqual([])
    expect(result.current.statuses[1]).toBeUndefined()
  })

  it('takes the body’s statuses for the spans it was given', () => {
    const { result } = setup()
    act(() => result.current.onBodyStatus({ 1: 'whole' }))
    expect(result.current.statuses[1]).toBe('whole')
  })

  it('toggles from the list, only picks from the post, and Esc lets go', () => {
    const { result } = setup()
    act(() => result.current.toggle(1))
    expect(result.current.chosen).toBe(1)
    act(() => result.current.pick(1))
    expect(result.current.chosen).toBe(1)
    act(() => result.current.toggle(1))
    expect(result.current.chosen).toBeNull()

    act(() => result.current.pick(0))
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(result.current.chosen).toBeNull()
  })

  it('asks the list to reveal a row on every pick in the post, not on a toggle', () => {
    const { result } = setup()
    act(() => result.current.toggle(1))
    expect(result.current.reveal).toBe(0)
    act(() => result.current.pick(1))
    act(() => result.current.pick(1))
    expect(result.current.reveal).toBe(2)
  })

  it('forgets everything when the panel closes', () => {
    const { result, rerender } = setup()
    act(() => result.current.toggle(0))
    rerender({ assessment: EVALUATION, open: false, title: TITLE })
    rerender({ assessment: EVALUATION, open: true, title: TITLE })
    expect(result.current.chosen).toBeNull()
  })
})
