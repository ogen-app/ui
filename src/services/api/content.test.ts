import { afterEach, describe, expect, it, vi } from 'vitest'
import { bulkTagAssets, updateAsset } from './content'

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

function sentBody(fetchMock: ReturnType<typeof stubFetch>, call = 0) {
  return JSON.parse(
    (fetchMock.mock.calls[call][1] as RequestInit).body as string,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/**
 * The presence-aware PUT (CON-279). This is the assertion that stops the old
 * bug coming back by accident: what makes an omitted field safe is that it is
 * *absent from the JSON*, not that it is sent as null or as an empty list —
 * both of which the server would read as "clear it".
 */
describe('updateAsset', () => {
  it('sends only the fields it was given', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}))

    await updateAsset('a1', { title: 'Notes', content: '# Notes' })

    const body = sentBody(fetchMock)
    expect(body).toEqual({ title: 'Notes', content: '# Notes' })
    expect('tag_ids' in body).toBe(false)
    expect('alt_text' in body).toBe(false)
  })

  it('sends an emptied field, which is how it is cleared', async () => {
    const fetchMock = stubFetch(jsonResponse(200, {}))

    await updateAsset('a1', {
      title: 'Photo',
      content: '',
      alt_text: '',
      tag_ids: [],
    })

    const body = sentBody(fetchMock)
    expect(body.alt_text).toBe('')
    expect(body.tag_ids).toEqual([])
  })
})

describe('bulkTagAssets', () => {
  it('posts the selection with the tags to add and remove', async () => {
    const fetchMock = stubFetch(jsonResponse(200, [{ id: 'a1' }, { id: 'a2' }]))

    const updated = await bulkTagAssets({
      asset_ids: ['a1', 'a2'],
      add: ['t1'],
      remove: ['t2'],
    })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/content-bank/assets/tags')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' })
    expect(sentBody(fetchMock)).toEqual({
      asset_ids: ['a1', 'a2'],
      add: ['t1'],
      remove: ['t2'],
    })
    // The reply is the assets it touched, which is also how a caller learns
    // that one of its ids was skipped.
    expect(updated.map((a) => a.id)).toEqual(['a1', 'a2'])
  })

  it("surfaces the server's refusal rather than a generic failure", async () => {
    // The server rejects a tag named in both lists instead of picking a
    // winner; the dialog can only report that if the message survives.
    stubFetch(
      jsonResponse(400, { error: 'a tag cannot be both added and removed' }),
    )

    await expect(
      bulkTagAssets({ asset_ids: ['a1'], add: ['t1'], remove: ['t1'] }),
    ).rejects.toThrow('a tag cannot be both added and removed')
  })
})
