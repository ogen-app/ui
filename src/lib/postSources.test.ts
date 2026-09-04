import { describe, expect, it } from 'vitest'
import { indexAssets, postAssets } from '@/lib/postSources'
import type { Asset } from '@/types/content'

function asset(id: string, title: string): Asset {
  return {
    id,
    title,
    content: '',
    status: 'ready',
    type: null,
    alt_text: '',
    tag_ids: [],
    tags: [],
    created_by: 'u1',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  }
}

describe('indexAssets', () => {
  it('indexes the post’s hydrated documents by id', () => {
    const map = indexAssets([asset('a', 'Brief'), asset('b', 'Transcript')])
    expect(map.get('a')?.title).toBe('Brief')
    expect(map.get('b')?.title).toBe('Transcript')
  })

  it('covers a document the client attached before the server echoed it back', () => {
    const map = indexAssets([], [asset('c', 'Just picked')])
    expect(map.get('c')?.title).toBe('Just picked')
  })

  it('lets the server’s copy win over the optimistic one', () => {
    // The picker's copy can be stale — a title edited elsewhere, a status that
    // has since moved on. Whatever came back with the post is the newer fact.
    const map = indexAssets([asset('a', 'Renamed')], [asset('a', 'Old name')])
    expect(map.get('a')?.title).toBe('Renamed')
  })
})

describe('postAssets', () => {
  it('keeps the order the ids are in, not the order the details arrived', () => {
    const known = indexAssets([asset('b', 'Second'), asset('a', 'First')])
    expect(postAssets(['a', 'b'], known).map((r) => r.asset?.title)).toEqual([
      'First',
      'Second',
    ])
  })

  it('yields a row with no asset for an id nothing has hydrated yet', () => {
    // Attached in another tab: it is a real source, so it is listed rather
    // than dropped — only its name is missing.
    const rows = postAssets(['ghost'], indexAssets([]))
    expect(rows).toEqual([{ id: 'ghost', asset: null }])
  })

  it('is empty for a post that reads from nothing', () => {
    expect(postAssets([], indexAssets([]))).toEqual([])
  })
})
