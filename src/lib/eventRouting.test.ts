import { describe, expect, it } from 'vitest'
import { invalidationsFor, localRunKeyFor, parseTopic } from './eventRouting'
import type { AppEvent } from '@/types/events'

const event = (
  topic: string,
  type: string,
  payload: AppEvent['payload'] = null,
): AppEvent => ({
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
    expect(parseTopic('entity:campaign:c1')).toEqual({
      kind: 'campaign',
      id: 'c1',
    })
    expect(parseTopic('entity:asset:a1')).toEqual({ kind: 'asset', id: 'a1' })
    expect(parseTopic('entity:zernio_account:z1')).toEqual({
      kind: 'zernioAccount',
      id: 'z1',
    })
  })

  it('reads the tenant-wide sync topic', () => {
    expect(parseTopic('zernio:sync')).toEqual({ kind: 'zernioSync' })
  })

  it('reports a topic it does not know rather than guessing', () => {
    // `job:*` and `user:*` are documented shapes with no publisher yet — the
    // stream has to survive one appearing.
    expect(parseTopic('job:j1')).toEqual({ kind: 'unknown', topic: 'job:j1' })
    expect(parseTopic('entity:post:')).toEqual({
      kind: 'unknown',
      topic: 'entity:post:',
    })
    expect(parseTopic('')).toEqual({ kind: 'unknown', topic: '' })
  })
})

describe('invalidationsFor', () => {
  it('refreshes the post and every calendar showing it on new analytics', () => {
    const e = event('entity:post:p1', 'post.analytics.updated')
    expect(keys(e)).toContainEqual(['post', 'p1'])
    expect(hitsPostLists(e)).toBe(true)
  })

  it('refreshes only the lists on a clone — the new post is not in any cache', () => {
    // The topic names the *clone*, not the post it came from, so there is no
    // `['post', …]` entry to make stale — only the rows it has to appear in.
    const e = event('entity:post:p1', 'post.cloned')
    expect(keys(e)).toEqual([undefined, ['posts']])
    expect(hitsPostLists(e)).toBe(true)
  })

  it('keeps the workspace-wide post list in step with every post write', () => {
    // `['posts']` sits outside `['campaigns']` on purpose, so no campaign
    // filter ever reaches it — each of these events has to name it, or
    // `useAssetUsage` keeps counting from stale rows.
    for (const type of [
      'post.analytics.updated',
      'post.cloned',
      'post.restored',
      'post.scheduled',
      'assistant.completed',
      'assistant.failed',
    ]) {
      expect(keys(event('entity:post:p1', type))).toContainEqual(['posts'])
    }
  })

  it("refreshes every calendar after someone else's assistant turn", () => {
    // The turn can have rewritten the title, and there is no `post_updated`
    // in the catalogue — this event is the only notice a teammate's tab gets.
    // A failed turn counts: it can have written the body before it gave up.
    for (const type of ['assistant.completed', 'assistant.failed']) {
      const e = event('entity:post:p1', type)
      expect(keys(e)).toContainEqual(['post', 'p1'])
      expect(hitsPostLists(e)).toBe(true)
    }
  })

  it('sends an assessment result to its own namespace, not the post', () => {
    // Nesting it under the post would drag it into every autosave refetch.
    expect(keys(event('entity:post:p1', 'assessment.completed'))).toEqual([
      ['postAssessment', 'p1'],
    ])
  })

  it('refreshes the whole campaign after a campaign-scoped AI run', () => {
    // Posts and overview both nest under this key; the workspace-wide post
    // list holds the same rows outside it, so it comes along by name.
    expect(keys(event('entity:campaign:c1', 'content_plan.completed'))).toEqual(
      [['campaigns', 'c1'], ['posts']],
    )
  })

  it('refreshes the documents when a background read finishes', () => {
    // A scraped page (CON-222) arrives empty and fills in from a worker, so
    // this event is the only notice any tab gets. One filter covers the
    // campaign's list and the open document — the latter nests under it.
    const e = event('entity:asset:a1', 'asset.updated', { status: 'ready' })
    expect(keys(e)).toEqual([['assets']])
  })

  it('ignores an asset event it does not know', () => {
    expect(invalidationsFor(event('entity:asset:a1', 'asset.deleted'))).toEqual(
      [],
    )
  })

  it('refreshes the publishing surfaces when an account changes', () => {
    expect(
      keys(event('entity:zernio_account:z1', 'zernio.account.disconnected')),
    ).toEqual([['platforms'], ['zernio', 'accounts'], ['zernio', 'health']])
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
    expect(
      invalidationsFor(event('zernio:sync', 'zernio.sync.ok')),
    ).toHaveLength(3)
    expect(
      invalidationsFor(
        event('zernio:sync', 'zernio.sync.ok', { summary: 'ok' }),
      ),
    ).toHaveLength(3)
  })

  it('always acts on a failed sync', () => {
    expect(
      invalidationsFor(event('zernio:sync', 'zernio.sync.failed')),
    ).toHaveLength(3)
  })

  it('acts on every type the bus actually publishes', () => {
    // The whole vocabulary, spelled as CON-285 fixed it. This is the one thing
    // in the file worth pinning: a drifted literal raises nothing and breaks
    // nothing on screen — it is an invalidation that silently stops happening,
    // and the symptom is a teammate's tab showing yesterday's post.
    const published: Array<[string, string]> = [
      ['entity:post:p1', 'assistant.completed'],
      ['entity:post:p1', 'assistant.failed'],
      ['entity:post:p1', 'assessment.completed'],
      ['entity:post:p1', 'assessment.failed'],
      ['entity:post:p1', 'post.cloned'],
      ['entity:post:p1', 'post.restored'],
      ['entity:post:p1', 'post.scheduled'],
      ['entity:post:p1', 'post.analytics.updated'],
      ['entity:campaign:c1', 'assistant.completed'],
      ['entity:campaign:c1', 'assistant.failed'],
      ['entity:campaign:c1', 'content_plan.completed'],
      ['entity:campaign:c1', 'content_plan.failed'],
      ['entity:asset:a1', 'asset.updated'],
      ['entity:zernio_account:z1', 'zernio.account.attached'],
      ['entity:zernio_account:z1', 'zernio.account.attach_failed'],
      ['entity:zernio_account:z1', 'zernio.account.updated'],
      ['entity:zernio_account:z1', 'zernio.account.disconnected'],
      ['entity:zernio_account:z1', 'zernio.account.revived'],
      ['zernio:sync', 'zernio.sync.failed'],
    ]
    for (const [topic, type] of published) {
      expect(invalidationsFor(event(topic, type))).not.toHaveLength(0)
    }
  })

  it('does nothing for an event type it does not know', () => {
    expect(
      invalidationsFor(event('entity:post:p1', 'post_teleported')),
    ).toEqual([])
    expect(invalidationsFor(event('job:j1', 'anything'))).toEqual([])
  })
})

describe('localRunKeyFor', () => {
  it('matches a terminal AI event to the run that would have produced it', () => {
    expect(localRunKeyFor(event('entity:post:p1', 'assistant.completed'))).toBe(
      'assistant:p1',
    )
    expect(localRunKeyFor(event('entity:post:p1', 'assessment.failed'))).toBe(
      'assessment:p1',
    )
    expect(
      localRunKeyFor(event('entity:campaign:c1', 'content_plan.completed')),
    ).toBe('contentPlan:c1')
  })

  it('leaves plain mutations alone', () => {
    // `post.scheduled` also duplicates the initiator's own invalidation, but
    // redundant is not harmful — there is no stream mid-write to protect.
    expect(localRunKeyFor(event('entity:post:p1', 'post.scheduled'))).toBeNull()
    expect(localRunKeyFor(event('zernio:sync', 'zernio.sync.ok'))).toBeNull()
  })

  it('does not match an AI event against the wrong subject kind', () => {
    expect(
      localRunKeyFor(event('entity:campaign:c1', 'assessment.completed')),
    ).toBeNull()
    expect(
      localRunKeyFor(event('entity:post:p1', 'content_plan.completed')),
    ).toBeNull()
  })
})
