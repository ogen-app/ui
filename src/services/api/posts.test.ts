import { afterEach, describe, expect, it, vi } from 'vitest'
import { addPostAssets } from './posts'

/**
 * The executable statement of CON-233's post half: path, method and body of the
 * membership endpoint, and the two answers the client has to read correctly.
 *
 * Worth pinning because the whole point of the endpoint is what it *doesn't*
 * send — a post payload restating the record. A regression that reintroduced
 * one would still attach the document, and nothing on screen would differ until
 * a field it overwrote was noticed somewhere else.
 */

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

describe('addPostAssets', () => {
  it('posts only the ids, to the post-scoped membership path', async () => {
    const fetchMock = stubFetch(
      jsonResponse(200, { id: 'p1', used_asset_ids: ['a1'], used_assets: [] }),
    )

    await addPostAssets('p1', ['a1'])

    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/p1/assets')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    // The body is the ids and nothing else — no `content`, no `status`, none of
    // the fields a whole-post PUT would have carried and could have reset.
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      asset_ids: ['a1'],
    })
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
    expect(post.used_assets?.[0].title).toBe('Brand guide')
  })

  it("surfaces the submitted-post lock in the server's own words", async () => {
    // CON-251: sources are locked content, so the endpoint answers 409 exactly
    // as PUT does. The caller toasts this message rather than a generic one —
    // "unschedule to edit" is the only part that says what to do about it.
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
