import { describe, expect, it } from 'vitest'
import {
  assetUsageIndex,
  campaignsLabel,
  elsewhereLabel,
  postsLabel,
  NO_USAGE,
} from './assetUsage'

const campaign = (id: string, name: string, asset_ids: string[]) => ({ id, name, asset_ids })
const post = (campaign_id: string, used_asset_ids: string[]) => ({ campaign_id, used_asset_ids })

describe('assetUsageIndex', () => {
  it('names every campaign holding a document', () => {
    const index = assetUsageIndex(
      [campaign('c1', 'Q3 launch', ['a1']), campaign('c2', 'Always on', ['a1', 'a2'])],
      [],
      null,
    )
    expect(index.get('a1')?.campaigns).toEqual(['Q3 launch', 'Always on'])
    expect(index.get('a2')?.campaigns).toEqual(['Always on'])
  })

  it('counts the posts that wrote from a document', () => {
    const index = assetUsageIndex([], [post('c1', ['a1']), post('c2', ['a1', 'a2'])], null)
    expect(index.get('a1')?.posts).toBe(2)
    expect(index.get('a2')?.posts).toBe(1)
  })

  it("splits out the scope campaign's own posts", () => {
    const index = assetUsageIndex([], [post('c1', ['a1']), post('c2', ['a1'])], 'c1')
    expect(index.get('a1')).toMatchObject({ posts: 2, postsHere: 1 })
  })

  // The bank has no scope, so nothing is "here" — and postsHere must not
  // quietly equal posts, or the campaign cell's second line would double the
  // first the moment it were reused there.
  it('has no local posts in the bank', () => {
    const index = assetUsageIndex([], [post('c1', ['a1'])], null)
    expect(index.get('a1')?.postsHere).toBe(0)
  })

  it('counts a post once however often it names the same document', () => {
    const index = assetUsageIndex([], [post('c1', ['a1', 'a1'])], 'c1')
    expect(index.get('a1')).toMatchObject({ posts: 1, postsHere: 1 })
  })

  it('has no entry for a document nothing uses', () => {
    expect(assetUsageIndex([campaign('c1', 'Q3', [])], [], null).get('a1')).toBeUndefined()
  })

  // Membership survives the document it points at, and a campaign left holding
  // a deleted id must not throw or invent a row.
  it('tolerates ids with no document behind them', () => {
    const index = assetUsageIndex([campaign('c1', 'Q3', ['gone'])], [], null)
    expect(index.get('gone')?.campaigns).toEqual(['Q3'])
  })
})

describe('labels', () => {
  const usage = (campaigns: string[], posts = 0, postsHere = 0) => ({ campaigns, posts, postsHere })

  it('names a single campaign and counts several', () => {
    expect(campaignsLabel(usage(['Q3 launch']))).toBe('Q3 launch')
    expect(campaignsLabel(usage(['Q3 launch', 'Always on']))).toBe('2 campaigns')
    expect(campaignsLabel(NO_USAGE)).toBeNull()
  })

  it('falls back to a name for an untitled campaign', () => {
    const index = assetUsageIndex([{ id: 'c1', name: '  ', asset_ids: ['a1'] }], [], null)
    expect(campaignsLabel(index.get('a1')!)).toBe('Untitled campaign')
  })

  it('counts posts in words', () => {
    expect(postsLabel(1)).toBe('1 post')
    expect(postsLabel(4)).toBe('4 posts')
  })

  it('leaves the scope campaign out of the others', () => {
    expect(elsewhereLabel(usage(['Q3 launch']), true)).toBeNull()
    expect(elsewhereLabel(usage(['Q3 launch', 'Always on']), true)).toBe('Also in 1 campaign')
    expect(elsewhereLabel(usage(['a', 'b', 'c']), true)).toBe('Also in 2 campaigns')
  })
})
