import { afterEach, describe, expect, it, vi } from 'vitest'
import { addPostAssets, postToPayload, removePostAsset } from './posts'
import type { Post } from '@/types/posts'

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'po1',
    campaign_id: 'c1',
    platform_id: 'p1',
    platform_post_type: 'text-post',
    social_account_id: '',
    title: 'Launch day',
    content: 'We shipped it.',
    media_urls: [],
    scheduled_at: null,
    published_at: '2026-09-01T10:00:00Z',
    published_url: 'https://linkedin.com/feed/update/123',
    status: 'published',
    cta_type: 'none',
    cta_url: '',
    target_audience_notes: '',
    used_asset_ids: [],
    campaign_type_phase_id: null,
    publisher_post_id: 'zern-1',
    created_by: 'u1',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    campaign: null,
    platform: null,
    used_assets: [],
    campaign_type_phase: null,
    ...overrides,
  } as Post
}

function stubFetch(res: Response) {
  const fetchMock = vi.fn().mockResolvedValue(res)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The post PUT is whole-resource and the handler assigns every field from the
 * request, so anything this builder forgets is a field the next autosave
 * clears. `published_url` is the one that bites (CON-165): it is written
 * server-side, so nothing in the editor touches it, and an omission would only
 * show up as published posts quietly losing their permalink the first time
 * anyone edited them.
 *
 * `used_asset_ids` is the opposite case and the reason both are asserted side
 * by side: the server reads *it* presence-aware (CON-233), so listing it is the
 * bug and omitting it is the fix. One field must be named or it is lost, the
 * other must be absent or it is restated — and a builder that treats them the
 * same way is wrong about one of them.
 */
describe('postToPayload', () => {
  it('round-trips the permalink rather than dropping it', () => {
    const payload = postToPayload(makePost())
    expect(payload.published_url).toBe('https://linkedin.com/feed/update/123')
  })

  it('carries an empty permalink as empty, not as absent', () => {
    // Absent and "" mean the same thing to the server here, but only because
    // it defaults the field; asserting the shape keeps the intent explicit.
    const payload = postToPayload(makePost({ published_url: '' }))
    expect('published_url' in payload).toBe(true)
    expect(payload.published_url).toBe('')
  })

  it('leaves the sources out of the PUT entirely', () => {
    // Not `[]` and not the post's own list: the key must be *absent*, which is
    // what tells the server to leave the stored set — and the column — alone.
    // Sending it back would put every autosave in a race with an attach.
    const payload = postToPayload(makePost({ used_asset_ids: ['a1'] }))
    expect('used_asset_ids' in payload).toBe(false)
    expect(payload.content).toBe('We shipped it.')
  })

  it('leaves out the fields the API does not take', () => {
    const payload = postToPayload(makePost())
    expect('publisher_post_id' in payload).toBe(false)
    expect('id' in payload).toBe(false)
  })
})

/**
 * The executable statement of CON-233's post half: path, method and body of the
 * membership endpoints, and the two answers the client has to read correctly.
 *
 * Worth pinning because the whole point of an endpoint like this is what it
 * *doesn't* send. A regression that reintroduced a whole-post payload would
 * still attach the document, and nothing on screen would differ until a field
 * it overwrote was noticed somewhere else.
 */
describe('post membership', () => {
  it('posts only the ids, to the post-scoped membership path', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { id: 'p1', used_asset_ids: ['a1'], used_assets: [] }),
    )

    await addPostAssets('p1', ['a1'])

    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/p1/assets')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    // The body is the ids and nothing else — no `content`, no `status`, none of
    // the fields a whole-post PUT would have carried and could have reset.
    expect(JSON.parse(init.body as string)).toEqual({ asset_ids: ['a1'] })
  })

  it('returns the post the server wrote, hydrated', async () => {
    // `used_assets` riding along is what lets the sources card name the new
    // document without a second request for the asset list — which carries
    // every document's full markdown.
    stubFetch(
      jsonResponse(200, {
        id: 'p1',
        used_asset_ids: ['a1', 'a2'],
        used_assets: [{ id: 'a2', title: 'Brand guide' }],
      }),
    )

    const post = await addPostAssets('p1', ['a2'])

    expect(post.used_asset_ids).toEqual(['a1', 'a2'])
    expect(post.used_assets[0].title).toBe('Brand guide')
  })

  it('names the asset in the path on removal, with no body at all', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { id: 'p1', used_asset_ids: [], used_assets: [] }),
    )

    await removePostAsset('p1', 'a1')

    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/p1/assets/a1')
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it("surfaces the submitted-post lock in the server's own words", async () => {
    // CON-251: sources are locked content, so the endpoint answers 409 exactly
    // as the PUT does. The caller toasts this message rather than a generic one
    // — "unschedule to edit" is the only part that says what to do about it.
    stubFetch(
      jsonResponse(409, {
        error:
          'post has been submitted (scheduled) and its content is locked; unschedule to edit',
      }),
    )

    await expect(addPostAssets('p1', ['a1'])).rejects.toThrow(
      'unschedule to edit',
    )
  })
})
