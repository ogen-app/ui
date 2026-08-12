import { describe, expect, it } from 'vitest'
import { invalidationsFor, localRunKeyFor, parseTopic } from './eventRouting'
import type { AppEvent } from '@/types/events'

const event = (topic: string, type: string, payload: AppEvent['payload'] = null): AppEvent => ({
  id: 'evt-1',
  topic,
  type,
  payload,
  created_at: '2026-08-03T19:27:29Z',
})

/** The exact query keys an event invalidates, for filters that name one. */
const keys = (e: AppEvent) => invalidationsFor(e).map((f) => f.queryKey)

/** Whether any filter matches a campaign's post list. */
const hitsPostLists = (e: AppEvent) =>
  invalidationsFor(e).some((f) =>
    f.predicate?.({ queryKey: ['campaigns', 'c1', 'posts'] } as never),
  )

describe('parseTopic', () => {
  it('reads the entity topics', () => {
    expect(parseTopic('entity:post:p1')).toEqual({ kind: 'post', id: 'p1' })
    expect(parseTopic('entity:campaign:c1')).toEqual({ kind: 'campaign', id: 'c1' })
    expect(parseTopic('entity:zernio_account:z1')).toEqual({ kind: 'zernioAccount', id: 'z1' })
  })

  it('reads the tenant-wide sync topic', () => {
    expect(parseTopic('zernio:sync')).toEqual({ kind: 'zernioSync' })
  })

  it('reports a topic it does not know rather than guessing', () => {
    // `job:*` and `user:*` are documented shapes with no publisher yet — the
    // stream has to survive one appearing.
    expect(parseTopic('job:j1')).toEqual({ kind: 'unknown', topic: 'job:j1' })
    expect(parseTopic('entity:post:')).toEqual({ kind: 'unknown', topic: 'entity:post:' })
    expect(parseTopic('')).toEqual({ kind: 'unknown', topic: '' })
  })
})

describe('invalidationsFor', () => {
  it('refreshes the post and every calendar showing it on new analytics', () => {
    const e = event('entity:post:p1', 'post.analytics.updated')
    expect(keys(e)).toContainEqual(['post', 'p1'])
    expect(hitsPostLists(e)).toBe(true)
  })

  it('refreshes only the lists on a clone — the source post is unchanged', () => {
    const e = event('entity:post:p1', 'post_cloned')
    expect(keys(e)).toEqual([undefined])
    expect(hitsPostLists(e)).toBe(true)
  })

  it('sends an assessment result to its own namespace, not the post', () => {
    // Nesting it under the post would drag it into every autosave refetch.
    expect(keys(event('entity:post:p1', 'assessment_completed'))).toEqual([
      ['postAssessment', 'p1'],
    ])
  })

  it('refreshes the whole campaign after a campaign-scoped AI run', () => {
    // Posts and overview both nest under this key.
    expect(keys(event('entity:campaign:c1', 'content_plan_completed'))).toEqual([
      ['campaigns', 'c1'],
    ])
  })

  it('refreshes the publishing surfaces when an account changes', () => {
    expect(keys(event('entity:zernio_account:z1', 'zernio.account.disconnected'))).toEqual([
      ['platforms'],
      ['zernio', 'accounts'],
      ['zernio', 'health'],
    ])
  })

  it('ignores a sync tick that moved nothing', () => {
    // Fires on a timer for the whole tenant, in every open tab, forever.
    const quiet = event('zernio:sync', 'zernio.sync.ok', {
      summary: 'upserts=0 soft_deletes=0',
    })
    expect(invalidationsFor(quiet)).toEqual([])
  })

  it('acts on a sync tick that moved something', () => {
    const busy = event('zernio:sync', 'zernio.sync.ok', {
      summary: 'upserts=1 soft_deletes=0',
    })
    expect(invalidationsFor(busy)).toHaveLength(3)
  })

  it('acts on a sync tick it cannot read', () => {
    // Wrong towards a refetch is the cheap direction.
    expect(invalidationsFor(event('zernio:sync', 'zernio.sync.ok'))).toHaveLength(3)
    expect(
      invalidationsFor(event('zernio:sync', 'zernio.sync.ok', { summary: 'ok' })),
    ).toHaveLength(3)
  })

  it('always acts on a failed sync', () => {
    expect(invalidationsFor(event('zernio:sync', 'zernio.sync.failed'))).toHaveLength(3)
  })

  it('does nothing for an event type it does not know', () => {
    expect(invalidationsFor(event('entity:post:p1', 'post_teleported'))).toEqual([])
    expect(invalidationsFor(event('job:j1', 'anything'))).toEqual([])
  })
})

describe('localRunKeyFor', () => {
  it('matches a terminal AI event to the run that would have produced it', () => {
    expect(localRunKeyFor(event('entity:post:p1', 'assistant_completed'))).toBe('assistant:p1')
    expect(localRunKeyFor(event('entity:post:p1', 'assessment_failed'))).toBe('assessment:p1')
    expect(localRunKeyFor(event('entity:campaign:c1', 'content_plan_completed'))).toBe(
      'contentPlan:c1',
    )
  })

  it('leaves plain mutations alone', () => {
    // `post_scheduled` also duplicates the initiator's own invalidation, but
    // redundant is not harmful — there is no stream mid-write to protect.
    expect(localRunKeyFor(event('entity:post:p1', 'post_scheduled'))).toBeNull()
    expect(localRunKeyFor(event('zernio:sync', 'zernio.sync.ok'))).toBeNull()
  })

  it('does not match an AI event against the wrong subject kind', () => {
    expect(localRunKeyFor(event('entity:campaign:c1', 'assessment_completed'))).toBeNull()
    expect(localRunKeyFor(event('entity:post:p1', 'content_plan_completed'))).toBeNull()
  })
})
