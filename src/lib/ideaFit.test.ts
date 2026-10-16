import { describe, expect, it } from 'vitest'
import { byFit, fitPlace } from './ideaFit'

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
