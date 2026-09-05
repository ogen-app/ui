import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  cachedPostFromList,
  invalidateCampaignPosts,
  landSavedPost,
  withHeldSources,
} from './postCache'
import {
  CAMPAIGN_SUMMARIES_KEY,
  campaignPostsKey,
  WORKSPACE_POSTS_KEY,
} from './queryKeys'
import type { Post } from '@/types/posts'

/** Only the three fields these functions read. */
function post(id: string, title: string, campaign_id = 'c1'): Post {
  return { id, title, campaign_id } as Post
}

const LIST = campaignPostsKey('c1')

let qc: QueryClient

beforeEach(() => {
  qc = new QueryClient()
})

/** What the calendar would render, by title. */
const titles = () => qc.getQueryData<Post[]>(LIST)?.map((p) => p.title)

describe('landSavedPost', () => {
  it('puts the saved post in the list the calendar reads', async () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old'), post('p2', 'other')])

    await landSavedPost(qc, post('p1', 'renamed'))

    // The bug this exists for: without it the calendar keeps `old` for the
    // whole 30-second staleTime — longer than it takes to rename and go back.
    expect(titles()).toEqual(['renamed', 'other'])
  })

  it('leaves the list alone when it has never been fetched', async () => {
    await landSavedPost(qc, post('p1', 'renamed'))

    // Seeding a one-post list here would be a lie the calendar then renders:
    // an unfetched list fetches, and it fetches everything.
    expect(qc.getQueryData(LIST)).toBeUndefined()
  })

  it('does not add a post the list does not carry', async () => {
    qc.setQueryData<Post[]>(LIST, [post('p2', 'other')])

    await landSavedPost(qc, post('p1', 'new'))

    expect(titles()).toEqual(['other'])
  })

  it('marks the summaries roll-up stale — it is derived, so it cannot be patched', async () => {
    qc.setQueryData(CAMPAIGN_SUMMARIES_KEY, [])

    await landSavedPost(qc, post('p1', 'renamed'))

    expect(qc.getQueryState(CAMPAIGN_SUMMARIES_KEY)?.isInvalidated).toBe(true)
  })

  it('does not refetch the post list — the autosave calls this on every burst', async () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])

    await landSavedPost(qc, post('p1', 'renamed'))

    // A patch, not an invalidation. The list query is mounted the whole time
    // the editor is open (`usePostNeighbours`), so invalidating here would
    // refetch the campaign's posts every 600ms while someone types.
    expect(qc.getQueryState(LIST)?.isInvalidated).toBe(false)
  })

  it('files the post under its own campaign, not the open one', async () => {
    const other = campaignPostsKey('c2')
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])
    qc.setQueryData<Post[]>(other, [post('p9', 'old', 'c2')])

    await landSavedPost(qc, post('p9', 'renamed', 'c2'))

    expect(titles()).toEqual(['old'])
    expect(qc.getQueryData<Post[]>(other)?.map((p) => p.title)).toEqual([
      'renamed',
    ])
  })

  it('patches the workspace-wide list too — it sits outside the campaigns namespace', async () => {
    qc.setQueryData<Post[]>(WORKSPACE_POSTS_KEY, [
      post('p1', 'old'),
      post('p2', 'other', 'c2'),
    ])

    await landSavedPost(qc, post('p1', 'renamed'))

    // `useAssetUsage` derives from this cache; without the patch it keeps
    // counting the old `used_asset_ids` for the full staleTime.
    expect(
      qc.getQueryData<Post[]>(WORKSPACE_POSTS_KEY)?.map((p) => p.title),
    ).toEqual(['renamed', 'other'])
  })

  it('waits out an in-flight list fetch so its revert cannot erase the patch', async () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])
    // A refetch dispatched before the save committed: cancellation reverts
    // the query to its pre-fetch state as it settles, so patching before that
    // revert lands would be undone by it.
    let resolveFetch!: (rows: Post[]) => void
    const inFlight = qc
      .fetchQuery({
        queryKey: LIST,
        queryFn: () =>
          new Promise<Post[]>((resolve) => {
            resolveFetch = resolve
          }),
        staleTime: 0,
      })
      .catch(() => {})

    await landSavedPost(qc, post('p1', 'renamed'))
    resolveFetch([post('p1', 'stale')])
    await inFlight

    expect(titles()).toEqual(['renamed'])
  })
})

describe('cachedPostFromList', () => {
  it('finds the post in whichever campaign list holds it', () => {
    qc.setQueryData<Post[]>(campaignPostsKey('c2'), [
      post('p9', 'neighbour', 'c2'),
    ])

    expect(cachedPostFromList(qc, 'p9')?.post.title).toBe('neighbour')
  })

  it("carries the list's fetch time, so a stale seed still refetches", () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])

    // Query judges the seed's age by this, not by when the editor opened —
    // seeding with `now` would let a list from an hour ago pass for fresh.
    expect(cachedPostFromList(qc, 'p1')?.updatedAt).toBe(
      qc.getQueryState(LIST)?.dataUpdatedAt,
    )
  })

  it('has nothing for a post no list has been fetched for', () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])

    expect(cachedPostFromList(qc, 'p2')).toBeUndefined()
  })

  it('ignores the campaigns keys that do not hold posts', () => {
    // Both sit under the `['campaigns']` prefix this searches, and neither
    // holds `Post` rows — the roll-up's entries only look like they do.
    qc.setQueryData(CAMPAIGN_SUMMARIES_KEY, [{ id: 'p1', posts: [] }])
    qc.setQueryData(['campaigns'], [{ id: 'c1', name: 'Launch' }])

    expect(cachedPostFromList(qc, 'p1')).toBeUndefined()
  })
})

describe('invalidateCampaignPosts', () => {
  it('marks the list, the roll-up and the workspace-wide list stale', () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])
    qc.setQueryData(CAMPAIGN_SUMMARIES_KEY, [])
    qc.setQueryData<Post[]>(WORKSPACE_POSTS_KEY, [post('p1', 'old')])

    invalidateCampaignPosts(qc, 'c1')

    expect(qc.getQueryState(LIST)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(CAMPAIGN_SUMMARIES_KEY)?.isInvalidated).toBe(true)
    // The workspace list holds the same rows under its own root; a delete or
    // create that only touched the campaign namespace would leave
    // `useAssetUsage` counting a post that is gone.
    expect(qc.getQueryState(WORKSPACE_POSTS_KEY)?.isInvalidated).toBe(true)
  })
})

/**
 * The half of CON-233 that has no endpoint behind it. The whole-post PUT stopped
 * sending `used_asset_ids`, so its *response* is no longer evidence about the
 * field either — it carries whatever the row held when the server read it, which
 * is before any attach that landed in the same window.
 */
describe('withHeldSources', () => {
  const saved = {
    id: 'p1',
    title: 'Saved title',
    used_asset_ids: ['a1'],
    used_assets: [{ id: 'a1' }],
  } as unknown as Post
  const held = {
    id: 'p1',
    title: 'Stale title',
    used_asset_ids: ['a1', 'a2'],
    used_assets: [{ id: 'a1' }, { id: 'a2' }],
  } as unknown as Post

  it('keeps the sources the client holds over the ones the save answered with', () => {
    // The bug without this: attach a document, type a character, and the
    // autosave's response takes the document straight back off the list — so
    // the attach looks like it was refused when in fact it landed.
    const merged = withHeldSources(saved, held)
    expect(merged.used_asset_ids).toEqual(['a1', 'a2'])
    expect(merged.used_assets).toHaveLength(2)
  })

  it('takes everything else from the response', () => {
    // Only the sources are held back. The save is the newest word on every
    // other field, which is the whole reason it was sent.
    expect(withHeldSources(saved, held).title).toBe('Saved title')
  })

  it('stands on its own when the cache holds nothing', () => {
    // A first save with no cached copy: the response is the only evidence
    // there is, so it wins by default rather than being emptied.
    expect(withHeldSources(saved, undefined).used_asset_ids).toEqual(['a1'])
  })
})

/**
 * The half of CON-233 that has no endpoint behind it. The whole-post PUT stopped
 * sending , so its *response* is no longer evidence about the
 * field either — it carries whatever the row held when the server read it, which
 * is before any attach that landed in the same window.
 */
describe('withHeldSources', () => {
  const saved = {
    id: 'p1',
    title: 'Saved title',
    used_asset_ids: ['a1'],
    used_assets: [{ id: 'a1' }],
  } as unknown as Post
  const held = {
    id: 'p1',
    title: 'Stale title',
    used_asset_ids: ['a1', 'a2'],
    used_assets: [{ id: 'a1' }, { id: 'a2' }],
  } as unknown as Post

  it('keeps the sources the client holds over the ones the save answered with', () => {
    // The bug without this: attach a document, type a character, and the
    // autosave's response takes the document straight back off the list — so
    // the attach looks like it was refused when in fact it landed.
    const merged = withHeldSources(saved, held)
    expect(merged.used_asset_ids).toEqual(['a1', 'a2'])
    expect(merged.used_assets).toHaveLength(2)
  })

  it('takes everything else from the response', () => {
    // Only the sources are held back. The save is the newest word on every
    // other field, which is the whole reason it was sent.
    expect(withHeldSources(saved, held).title).toBe('Saved title')
  })

  it('stands on its own when the cache holds nothing', () => {
    // A first save with no cached copy: the response is the only evidence
    // there is, so it wins by default rather than being emptied.
    expect(withHeldSources(saved, undefined).used_asset_ids).toEqual(['a1'])
  })
})
