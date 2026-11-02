import { afterEach, describe, expect, it, vi } from 'vitest'
import { beginLocalRun } from '@/lib/localRuns'
import { handleEvent } from '@/stores/eventStreamStore'
import type { AppEvent } from '@/types/events'
import {
  AUTO_RUN_TTL_MS,
  clearAutoAssessments,
  useAutoAssessmentStore,
} from './autoAssessmentStore'

/**
 * Automatic assessments as the broadcast stream reports them (CON-438). The
 * real path: an event goes through `handleEvent`, and the store is what the
 * quality panel reads its "Assessing…" state from.
 */

function event(type: string, payload: Record<string, unknown>, id = 'p1') {
  return {
    id: 'e1',
    topic: `entity:post:${id}`,
    type,
    payload: { postId: id, ...payload },
    created_at: '2026-11-02T12:00:00Z',
  } satisfies AppEvent
}

const running = (id = 'p1') => useAutoAssessmentStore.getState().runs[id]

afterEach(() => {
  clearAutoAssessments()
  vi.useRealTimers()
})

describe('automatic assessments', () => {
  it('marks a post as being assessed when a checkpoint run starts', () => {
    handleEvent(event('assessment.started', { trigger: 'ready' }))
    expect(running()?.trigger).toBe('ready')
    expect(running('p2')).toBeUndefined()
  })

  it.each(['assessment.completed', 'assessment.failed'])(
    'clears it on %s',
    (type) => {
      handleEvent(event('assessment.started', { trigger: 'version' }))
      handleEvent(event(type, { trigger: 'version', overallPct: 72 }))
      expect(running()).toBeUndefined()
    },
  )

  // A manual run has its own stream; a second spinner would be noise.
  it('ignores a start that is not automatic', () => {
    handleEvent(event('assessment.started', { trigger: 'manual' }))
    handleEvent(event('assessment.started', {}))
    expect(running()).toBeUndefined()
  })

  // The ending of an automatic run is dropped as an echo while this tab
  // streams a manual one — the spinner must still go.
  it('clears even while a manual run on the post is local', () => {
    handleEvent(event('assessment.started', { trigger: 'scheduled' }))
    const end = beginLocalRun('assessment', 'p1')
    try {
      handleEvent(event('assessment.completed', { trigger: 'scheduled' }))
    } finally {
      end()
    }
    expect(running()).toBeUndefined()
  })

  // At-most-once delivery: an ending can be lost.
  it('forgets a run whose ending never arrives', () => {
    vi.useFakeTimers()
    handleEvent(event('assessment.started', { trigger: 'published' }))
    vi.advanceTimersByTime(AUTO_RUN_TTL_MS - 1)
    expect(running()).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(running()).toBeUndefined()
  })
})
