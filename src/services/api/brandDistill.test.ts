import { afterEach, describe, expect, it, vi } from 'vitest'
import { commitDistill, getDistillRun, requestDistill } from './brandDistill'

/**
 * Brand reads on the wire (CON-399/400). What is pinned is the translation:
 * a voice's narrator is `''` on the wire and `'none'` here, both ways, and a
 * proposal's `null` lists arrive as empty ones.
 */

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sent(fetchMock: ReturnType<typeof vi.fn>) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
  }
}

const rules = {
  emoji: 'never',
  formality: 'neutral',
  length: 'medium',
  opening: '',
  closing: '',
}

afterEach(() => vi.unstubAllGlobals())

describe('brand distill wire', () => {
  it('starts a read with the request as given', async () => {
    const fetchMock = stubFetch(
      { id: 'r1', status: 'collecting', sources: null },
      202,
    )
    const run = await requestDistill({ websiteUrl: 'https://acme.com' })
    expect(sent(fetchMock)).toMatchObject({
      method: 'POST',
      body: { websiteUrl: 'https://acme.com' },
    })
    expect(sent(fetchMock).url).toMatch(/\/api\/brand\/distills$/)
    expect(run.sources).toEqual([])
    expect(run.proposal).toBeNull()
  })

  it("reads a voice with no narrator as 'none', and empties null lists", async () => {
    stubFetch({
      id: 'r1',
      status: 'ready',
      sources: [],
      answers: null,
      proposal: {
        voices: [
          { proposalId: 'v1', samples: null, rules: { ...rules, person: '' } },
        ],
        audiences: null,
        guardrails: {
          mayClaim: null,
          neverClaim: [],
          bannedWords: null,
          disclaimer: null,
        },
        facts: null,
        questions: null,
        coverage: null,
        dropped: null,
      },
    })
    const run = await getDistillRun('r1')
    expect(run.proposal?.voices[0].rules.person).toBe('none')
    expect(run.proposal?.voices[0].samples).toEqual([])
    expect(run.proposal?.facts).toEqual([])
    expect(run.proposal?.guardrails.mayClaim).toEqual([])
    expect(run.proposal?.dropped).toEqual({
      ungrounded: 0,
      duplicate: 0,
      limit: 0,
    })
  })

  it("commits 'none' as the empty string the server takes", async () => {
    const fetchMock = stubFetch({
      applied: { voices: [], audiences: null, guardrails: null, facts: [] },
      skipped: null,
    })
    const result = await commitDistill('r1', {
      voices: [
        {
          proposalId: 'v1',
          name: 'Plain',
          whenToUse: '',
          isDefault: true,
          samples: ['a'],
          rules: { ...rules, person: 'none' } as never,
          channelNotes: {},
        },
      ],
      audiences: [],
      guardrails: { mayClaim: [], neverClaim: [], bannedWords: [] },
      facts: [],
    })
    expect(sent(fetchMock).url).toMatch(/\/api\/brand\/distills\/r1\/commit$/)
    expect(sent(fetchMock).body.voices[0].rules.person).toBe('')
    expect(sent(fetchMock).body.guardrails).not.toHaveProperty('disclaimer')
    expect(result.skipped).toEqual([])
    expect(result.applied.audiences).toEqual([])
  })
})
