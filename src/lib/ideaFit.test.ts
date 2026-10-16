import { describe, expect, it } from 'vitest'
import { byFit, fitLevelStrength, fitPlace, fitRows } from './ideaFit'

const idea = (
  id: string,
  fit_score: number | null,
  created_at = '2026-10-01',
) => ({
  id,
  fit_score,
  created_at,
})

describe('byFit', () => {
  it('puts the best fit first and the unscored last', () => {
    const sorted = [
      idea('low', 31),
      idea('none', null),
      idea('high', 88),
      idea('mid', 57),
    ].sort(byFit)
    expect(sorted.map((i) => i.id)).toEqual(['high', 'mid', 'low', 'none'])
  })

  it('breaks a tie oldest first, then by id', () => {
    const sorted = [
      idea('b', 70, '2026-10-02'),
      idea('c', 70, '2026-10-01'),
      idea('a', 70, '2026-10-01'),
      idea('y', null, '2026-10-03'),
      idea('x', null, '2026-10-01'),
    ].sort(byFit)
    expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b', 'x', 'y'])
  })

  it('treats a missing score as unscored', () => {
    const sorted = [
      { id: 'old', created_at: '2026-01-01' },
      idea('new', 12),
    ].sort(byFit)
    expect(sorted.map((i) => i.id)).toEqual(['new', 'old'])
  })
})

describe('fitPlace', () => {
  it('runs from the strong left edge to the weak right edge', () => {
    expect(fitPlace(100)).toBe(0)
    expect(fitPlace(10)).toBe(1)
    expect(fitPlace(55)).toBe(0.5)
  })

  it('clamps a score outside 10–100', () => {
    expect(fitPlace(140)).toBe(0)
    expect(fitPlace(0)).toBe(1)
  })
})

describe('fitRows', () => {
  it('reads the criteria heaviest first, with the phase as a hint', () => {
    const rows = fitRows({
      lens: 'campaign',
      criteria: {
        timeliness: { level: 1, why: 'Window ended.' },
        brand_fit: { level: 4, why: 'Fits the voice.' },
        message_fit: { level: 4, why: 'Serves the message.' },
        phase_fit: { level: 4, why: 'Widens the story.', phase: 'Launch' },
      },
    })
    expect(rows.map((r) => r.key)).toEqual([
      'message_fit',
      'phase_fit',
      'timeliness',
      'brand_fit',
    ])
    expect(rows[1]).toEqual({
      key: 'phase_fit',
      level: 4,
      why: 'Widens the story.',
      hint: 'Launch',
    })
  })

  it('keeps a criterion this build does not know, after the known ones', () => {
    const rows = fitRows({
      lens: 'workspace',
      criteria: {
        zeitgeist: { level: 3, why: 'New.' },
        evergreen: { level: 5, why: 'Any month.' },
      },
    })
    expect(rows.map((r) => r.key)).toEqual(['evergreen', 'zeitgeist'])
  })

  it('leaves out an unrated criterion and clamps the rest to 1–5', () => {
    const rows = fitRows({
      lens: 'campaign',
      criteria: {
        evidence: { level: 0, why: 'Not rated.' },
        gap_fill: { level: 9, why: 'Clamped.' },
      },
    })
    expect(rows).toEqual([
      { key: 'gap_fill', level: 5, why: 'Clamped.', hint: null },
    ])
  })
})

describe('fitLevelStrength', () => {
  it('runs from the weak end at 1 to the strong end at 5', () => {
    expect(fitLevelStrength(1)).toBe(0)
    expect(fitLevelStrength(3)).toBe(50)
    expect(fitLevelStrength(5)).toBe(100)
  })
})
