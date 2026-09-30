import { describe, expect, it } from 'vitest'
import type { CampaignPhaseWindow } from '@/types/campaigns'
import {
  addDays,
  boundaryRange,
  canSplit,
  moveBoundary,
  windowDays,
  type DatedPhase,
} from './phasePlan'

function phase(
  id: string,
  start: string | null,
  end: string | null,
): CampaignPhaseWindow {
  return {
    phase_id: id,
    sequence: 0,
    name: id,
    purpose: '',
    start_date: start,
    end_date: end,
    post_count: 0,
  }
}

const PLAN = [
  phase('launch', '2026-10-01', '2026-10-11'),
  phase('sustain', '2026-10-12', '2026-10-21'),
  phase('close', '2026-10-22', '2026-10-31'),
] as DatedPhase[]

describe('day arithmetic', () => {
  it('counts both ends and crosses month and DST boundaries as whole days', () => {
    expect(windowDays('2026-10-01', '2026-10-01')).toBe(1)
    expect(windowDays('2026-10-01', '2026-10-31')).toBe(31)
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    // Europe's clocks go back on 2026-10-25; a day is still a day.
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('canSplit', () => {
  it('needs two or more dated phases', () => {
    expect(canSplit(PLAN)).toBe(true)
    expect(canSplit([PLAN[0]])).toBe(false)
    expect(canSplit([phase('a', null, null), phase('b', null, null)])).toBe(
      false,
    )
  })

  it('refuses a campaign shorter than its phase count', () => {
    // The server's answer for a two-day, three-phase campaign: every window is
    // the whole range, and no contiguous plan exists.
    const short = [
      phase('a', '2026-10-01', '2026-10-02'),
      phase('b', '2026-10-01', '2026-10-02'),
      phase('c', '2026-10-01', '2026-10-02'),
    ]
    expect(canSplit(short)).toBe(false)
  })
})

describe('moveBoundary', () => {
  it('ends one phase where asked and starts the next the day after', () => {
    expect(moveBoundary(PLAN, 0, '2026-10-05')).toEqual([
      { phase_id: 'launch', start_date: '2026-10-01', end_date: '2026-10-05' },
      { phase_id: 'sustain', start_date: '2026-10-06', end_date: '2026-10-21' },
      { phase_id: 'close', start_date: '2026-10-22', end_date: '2026-10-31' },
    ])
  })

  it('always sends the whole plan, contiguous from start to end', () => {
    const plan = moveBoundary(PLAN, 1, '2026-10-28')!
    expect(plan.map((w) => w.phase_id)).toEqual(['launch', 'sustain', 'close'])
    expect(plan[0].start_date).toBe('2026-10-01')
    expect(plan[2].end_date).toBe('2026-10-31')
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].start_date).toBe(addDays(plan[i - 1].end_date, 1))
    }
  })

  it('keeps both phases at least a day long', () => {
    expect(boundaryRange(PLAN, 0)).toEqual({
      min: '2026-10-01',
      max: '2026-10-20',
    })
    expect(moveBoundary(PLAN, 0, '2026-10-01')).not.toBeNull()
    expect(moveBoundary(PLAN, 0, '2026-10-20')).not.toBeNull()
    expect(moveBoundary(PLAN, 0, '2026-09-30')).toBeNull()
    expect(moveBoundary(PLAN, 0, '2026-10-21')).toBeNull()
  })

  it('has no boundary after the last phase', () => {
    expect(moveBoundary(PLAN, 2, '2026-10-30')).toBeNull()
  })
})
