import { describe, expect, it } from 'vitest'
import type { IdeaDistillRun } from '@/types/assetAnalysis'
import {
  DISTILL_COUNTS,
  activeRun,
  focusLength,
  focusTooLong,
  outcomeOf,
} from './ideaDistill'

const run = (over: Partial<IdeaDistillRun> = {}): IdeaDistillRun => ({
  id: 'r1',
  asset_id: 'a1',
  campaign_id: null,
  analysis_id: 'an1',
  status: 'pending',
  focus: '',
  count: 5,
  ideas_count: 0,
  failure_code: '',
  failure_reason: '',
  created_by: null,
  created_at: '2026-10-21T10:00:00Z',
  finished_at: null,
  ...over,
})

describe('ideaDistill', () => {
  it('offers every count from 3 to 10', () => {
    expect(DISTILL_COUNTS).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('counts the focus as the server does: trimmed, in code points', () => {
    expect(focusLength('  CFOs  ')).toBe(4)
    // One emoji is one character in Go's rune count, two in `.length`.
    expect(focusLength('🚀')).toBe(1)
    expect(focusTooLong('a'.repeat(300))).toBe(false)
    expect(focusTooLong(` ${'a'.repeat(300)} `)).toBe(false)
    expect(focusTooLong('a'.repeat(301))).toBe(true)
  })

  it('finds the run in flight among the newest-first list', () => {
    const older = run({ id: 'old', status: 'ready', ideas_count: 3 })
    expect(activeRun([older])).toBeUndefined()
    expect(activeRun([run({ id: 'new', status: 'running' }), older])?.id).toBe(
      'new',
    )
  })

  it('reads what a settled run came to', () => {
    expect(outcomeOf(run({ status: 'running' }))).toBeNull()
    expect(outcomeOf(run({ status: 'ready', ideas_count: 4 }))).toBe('landed')
    expect(outcomeOf(run({ status: 'ready', ideas_count: 0 }))).toBe('empty')
    expect(outcomeOf(run({ status: 'failed' }))).toBe('failed')
    expect(
      outcomeOf(run({ status: 'skipped', failure_code: 'limit_reached' })),
    ).toBe('limit')
    expect(
      outcomeOf(
        run({ status: 'skipped', failure_code: 'entitlement_disabled' }),
      ),
    ).toBe('plan')
  })
})
