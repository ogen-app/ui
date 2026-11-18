import { afterEach, describe, expect, it, vi } from 'vitest'

import { streamAppEvents } from './events'

/**
 * The broadcast stream's frame handling, and in particular the one frame that
 * is not an event.
 *
 * `recycle` (CON-286) announces that the server is about to close a healthy
 * connection to reclaim its slot. It has to be recognised *as* a frame rather
 * than parsed as one: its `data` is a perfectly good JSON object, so the
 * envelope parser accepts it and produces an event with every field empty and
 * a type nothing routes. That would be silent — the connection would still
 * come back, just through the outage path — which is exactly the kind of
 * mistake a test has to hold, because nothing on screen would show it.
 */

function stubStream(body: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const ENVELOPE = {
  id: 'ev_7',
  topic: 'posts',
  type: 'post_scheduled',
  payload: { post_id: '9aQ2xLkP' },
  created_at: '2026-09-16T09:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamAppEvents', () => {
  it('reports a recycle instead of dispatching it as an event', async () => {
    stubStream('event: recycle\ndata: {"reason":"lifetime"}\n\n')
    const events: string[] = []
    const recycles: number[] = []

    await streamAppEvents(
      {
        onEvent: (event) => events.push(event.type),
        onRecycle: () => recycles.push(1),
      },
      new AbortController().signal,
    )

    expect(recycles).toHaveLength(1)
    expect(events).toEqual([])
  })

  it('keeps delivering the events around it', async () => {
    // The recycle arrives last in practice, but nothing in the format promises
    // that, and a frame handler that returned early for the rest of the read
    // would lose whatever the server flushed with it.
    stubStream(
      `event: post_scheduled\ndata: ${JSON.stringify(ENVELOPE)}\n\n` +
        'event: recycle\ndata: {"reason":"lifetime"}\n\n' +
        `event: asset.updated\ndata: ${JSON.stringify({ ...ENVELOPE, type: 'asset.updated' })}\n\n`,
    )
    const events: string[] = []
    let recycled = false

    await streamAppEvents(
      {
        onEvent: (event) => events.push(event.type),
        onRecycle: () => {
          recycled = true
        },
      },
      new AbortController().signal,
    )

    expect(events).toEqual(['post_scheduled', 'asset.updated'])
    expect(recycled).toBe(true)
  })

  it('survives a server that recycles without a listener', async () => {
    // `onRecycle` is optional — an older caller, or the assistant's own reader
    // — and an unannounced close is still just a close.
    stubStream('event: recycle\ndata: {"reason":"lifetime"}\n\n')

    await expect(
      streamAppEvents({ onEvent: () => {} }, new AbortController().signal),
    ).resolves.toBeUndefined()
  })
})
