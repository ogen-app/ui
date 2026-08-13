import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'
import { invalidateCampaignPosts, landSavedPost } from './postCache'
import { CAMPAIGN_SUMMARIES_KEY, campaignPostsKey } from './queryKeys'
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
  it('puts the saved post in the list the calendar reads', () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old'), post('p2', 'other')])

    landSavedPost(qc, post('p1', 'renamed'))

    // The bug this exists for: without it the calendar keeps `old` for the
    // whole 30-second staleTime — longer than it takes to rename and go back.
    expect(titles()).toEqual(['renamed', 'other'])
  })

  it('leaves the list alone when it has never been fetched', () => {
    landSavedPost(qc, post('p1', 'renamed'))

    // Seeding a one-post list here would be a lie the calendar then renders:
    // an unfetched list fetches, and it fetches everything.
    expect(qc.getQueryData(LIST)).toBeUndefined()
  })

  it('does not add a post the list does not carry', () => {
    qc.setQueryData<Post[]>(LIST, [post('p2', 'other')])

    landSavedPost(qc, post('p1', 'new'))

    expect(titles()).toEqual(['other'])
  })

  it('marks the summaries roll-up stale — it is derived, so it cannot be patched', () => {
    qc.setQueryData(CAMPAIGN_SUMMARIES_KEY, [])

    landSavedPost(qc, post('p1', 'renamed'))

    expect(qc.getQueryState(CAMPAIGN_SUMMARIES_KEY)?.isInvalidated).toBe(true)
  })

  it('does not refetch the post list — the autosave calls this on every burst', () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])

    landSavedPost(qc, post('p1', 'renamed'))

    // A patch, not an invalidation. The list query is mounted the whole time
    // the editor is open (`usePostNeighbours`), so invalidating here would
    // refetch the campaign's posts every 600ms while someone types.
    expect(qc.getQueryState(LIST)?.isInvalidated).toBe(false)
  })

  it('files the post under its own campaign, not the open one', () => {
    const other = campaignPostsKey('c2')
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])
    qc.setQueryData<Post[]>(other, [post('p9', 'old', 'c2')])

    landSavedPost(qc, post('p9', 'renamed', 'c2'))

    expect(titles()).toEqual(['old'])
    expect(qc.getQueryData<Post[]>(other)?.map((p) => p.title)).toEqual(['renamed'])
  })
})

describe('invalidateCampaignPosts', () => {
  it('marks both the list and the roll-up stale', () => {
    qc.setQueryData<Post[]>(LIST, [post('p1', 'old')])
    qc.setQueryData(CAMPAIGN_SUMMARIES_KEY, [])

    invalidateCampaignPosts(qc, 'c1')

    expect(qc.getQueryState(LIST)?.isInvalidated).toBe(true)
    expect(qc.getQueryState(CAMPAIGN_SUMMARIES_KEY)?.isInvalidated).toBe(true)
  })
})
