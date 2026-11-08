import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { refreshTouched, subjectTouches } from './assistantTouched'

function setup() {
  const qc = new QueryClient()
  // A query under each root the assistant can touch.
  const keys = [
    ['post', 'p1'],
    ['post', 'p2'],
    ['postVersions', 'p1'],
    ['postNotes', 'p1'],
    ['campaigns', 'c1'],
    ['campaigns', 'c1', 'posts'],
    ['campaigns', 'c2', 'posts'],
    ['campaigns', 'summaries'],
    ['posts'],
    ['ideas', 'list', {}],
    ['assets', 'a1'],
    ['assets', 'list', {}],
    ['brand'],
  ]
  for (const key of keys) qc.setQueryData(key, {})
  const stale = () =>
    qc
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.isInvalidated)
      .map((q) => JSON.stringify(q.queryKey))
      .sort()
  return { qc, stale }
}

describe('refreshTouched', () => {
  it('marks a touched post and every list that shows it', async () => {
    const { qc, stale } = setup()
    await refreshTouched(qc, [{ kind: 'post', id: 'p1' }])
    expect(stale()).toEqual(
      [
        ['post', 'p1'],
        ['postVersions', 'p1'],
        ['postNotes', 'p1'],
        ['campaigns', 'c1', 'posts'],
        ['campaigns', 'c2', 'posts'],
        ['campaigns', 'summaries'],
        ['posts'],
      ]
        .map((k) => JSON.stringify(k))
        .sort(),
    )
  })

  it('reads a touch without an id as every entity of that kind', async () => {
    const { qc, stale } = setup()
    await refreshTouched(qc, [{ kind: 'idea' }, { kind: 'asset' }])
    expect(stale()).toEqual(
      [
        ['ideas', 'list', {}],
        ['assets', 'a1'],
        ['assets', 'list', {}],
      ]
        .map((k) => JSON.stringify(k))
        .sort(),
    )
  })

  it('marks a campaign with everything nested under it', async () => {
    const { qc, stale } = setup()
    await refreshTouched(qc, [{ kind: 'campaign', id: 'c1' }])
    expect(stale()).toEqual(
      [
        ['campaigns', 'c1'],
        ['campaigns', 'c1', 'posts'],
      ]
        .map((k) => JSON.stringify(k))
        .sort(),
    )
  })

  it('ignores a kind this build predates', async () => {
    const { qc } = setup()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    await refreshTouched(qc, [{ kind: 'starship', id: 'x' }])
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('subjectTouches', () => {
  it('errs wide for a turn that never said what it touched', () => {
    expect(subjectTouches({ kind: 'campaign', campaignId: 'c1' })).toEqual([
      { kind: 'campaign', id: 'c1' },
      { kind: 'idea' },
    ])
  })
})
