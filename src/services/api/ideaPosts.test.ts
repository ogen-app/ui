import { afterEach, describe, expect, it, vi } from 'vitest'
import { draftIdeas, type DraftIdeasEvent } from './ideaPosts'

function streamOf(text: string) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(text))
        controller.close()
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('draftIdeas', () => {
  it('reports a stream that closes before it says it finished', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamOf('event: post\ndata: {"postId":"p1","title":"One"}\n\n'),
      ),
    )
    const events: DraftIdeasEvent[] = []
    await draftIdeas(['i1'], {}, (e) => events.push(e))
    expect(events.map((e) => e.type)).toEqual(['post', 'error'])
  })

  it('adds nothing to a stream that completes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamOf('event: complete\ndata: {"posts":[{"postId":"p1"}]}\n\n'),
      ),
    )
    const events: DraftIdeasEvent[] = []
    await draftIdeas(['i1'], {}, (e) => events.push(e))
    expect(events.map((e) => e.type)).toEqual(['complete'])
  })

  it('carries each draft’s date, and none for an unscheduled one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        streamOf(
          'event: post\ndata: {"postId":"p1","title":"One","publishDate":"2026-11-26"}\n\n' +
            'event: post\ndata: {"postId":"p2","title":"Two","publishDate":""}\n\n' +
            'event: complete\ndata: {"posts":[]}\n\n',
        ),
      ),
    )
    const events: DraftIdeasEvent[] = []
    await draftIdeas(['i1'], {}, (e) => events.push(e))
    expect(events.slice(0, 2)).toEqual([
      { type: 'post', postId: 'p1', title: 'One', publishDate: '2026-11-26' },
      { type: 'post', postId: 'p2', title: 'Two' },
    ])
  })
})
