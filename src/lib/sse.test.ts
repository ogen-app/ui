import { describe, expect, it } from 'vitest'
import { createSSEParser, type SSEFrame } from './sse'

/** Feeds `chunks` through one parser and returns everything it dispatched. */
function parse(...chunks: string[]): SSEFrame[] {
  const frames: SSEFrame[] = []
  const feed = createSSEParser((frame) => frames.push(frame))
  for (const chunk of chunks) feed(chunk)
  return frames
}

describe('createSSEParser', () => {
  it('reads the shape the backend actually emits', () => {
    expect(parse('id: abc\nevent: post_scheduled\ndata: {"a":1}\n\n')).toEqual([
      { event: 'post_scheduled', data: '{"a":1}', id: 'abc', retry: null },
    ])
  })

  it('joins multiple data lines with newlines', () => {
    expect(parse('event: x\ndata: one\ndata: two\n\n')[0].data).toBe('one\ntwo')
  })

  it('defaults a frame with no event field to `message`', () => {
    // The old lib/sse.ts dropped these outright.
    expect(parse('data: hello\n\n')).toEqual([
      { event: 'message', data: 'hello', id: null, retry: null },
    ])
  })

  it('keeps a frame that carries an event but no data', () => {
    // The old contentPlan parser dropped these outright.
    expect(parse('event: complete\n\n')).toEqual([
      { event: 'complete', data: '', id: null, retry: null },
    ])
  })

  it('accepts a field with no space after the colon', () => {
    expect(parse('event:step\ndata:{}\n\n')[0]).toMatchObject({
      event: 'step',
      data: '{}',
    })
  })

  it('strips exactly one leading space, so content whitespace survives', () => {
    // A text delta's own indentation is content. The old contentPlan parser
    // trimmed it away.
    expect(
      parse('event: content_delta\ndata:   two spaces kept\n\n')[0].data,
    ).toBe('  two spaces kept')
  })

  it('preserves a trailing space in a delta', () => {
    expect(parse('data: word \n\n')[0].data).toBe('word ')
  })

  it('swallows heartbeat comments without dispatching', () => {
    expect(parse(': ping\n\n')).toEqual([])
  })

  it('still delivers an event that follows a heartbeat', () => {
    expect(parse(': ping\n\nevent: tick\ndata: 1\n\n')).toHaveLength(1)
  })

  it('reassembles a frame split across chunk boundaries', () => {
    expect(parse('event: comp', 'lete\ndata: {"ok":', 'true}\n', '\n')).toEqual(
      [{ event: 'complete', data: '{"ok":true}', id: null, retry: null }],
    )
  })

  it('dispatches every frame in a chunk carrying several', () => {
    const frames = parse('event: a\ndata: 1\n\nevent: b\ndata: 2\n\n')
    expect(frames.map((f) => f.event)).toEqual(['a', 'b'])
  })

  it('holds an unterminated frame back rather than guessing', () => {
    expect(parse('event: a\ndata: 1\n')).toEqual([])
  })

  it('handles CRLF line endings', () => {
    expect(parse('event: a\r\ndata: 1\r\n\r\n')).toEqual([
      { event: 'a', data: '1', id: null, retry: null },
    ])
  })

  it('reads the empty id the zernio publishers emit', () => {
    expect(parse('id: \nevent: zernio.sync.ok\ndata: {}\n\n')[0].id).toBe('')
  })

  it('parses retry as a number and ignores a malformed one', () => {
    expect(parse('retry: 5000\ndata: x\n\n')[0].retry).toBe(5000)
    expect(parse('retry: soon\ndata: x\n\n')[0].retry).toBeNull()
  })

  it('ignores unknown fields', () => {
    expect(parse('event: a\nweird: value\ndata: 1\n\n')[0]).toMatchObject({
      event: 'a',
      data: '1',
    })
  })
})
