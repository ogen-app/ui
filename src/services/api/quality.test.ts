import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamPostAssessment, type AssessEvent } from './quality'

/**
 * The assess stream on the wire. What is pinned is the `error` event's code:
 * a 402 is the post's run allowance being spent (CON-438), which the panel
 * answers as a plan limit rather than as a breakage.
 */

function stubStream(frames: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(frames, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    ),
  )
}

async function collect(): Promise<AssessEvent[]> {
  const events: AssessEvent[] = []
  await streamPostAssessment('p1', (e) => events.push(e))
  return events
}

afterEach(() => vi.unstubAllGlobals())

describe('streamPostAssessment', () => {
  it('carries the code of an error event', async () => {
    stubStream(
      'event: error\ndata: {"message":"entitlement_exceeded: quality_reviews_per_post (limit 5, current 5)","code":402}\n\n',
    )
    expect(await collect()).toEqual([
      {
        type: 'error',
        message:
          'entitlement_exceeded: quality_reviews_per_post (limit 5, current 5)',
        code: 402,
      },
    ])
  })

  it('reads a missing code as none', async () => {
    stubStream('event: error\ndata: {"message":"model failed"}\n\n')
    expect(await collect()).toEqual([
      { type: 'error', message: 'model failed', code: null },
    ])
  })
})
