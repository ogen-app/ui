import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  addDistillRead,
  commitDistill,
  composeDistill,
  getDistillRun,
  openRunOf,
  requestDistill,
  stopDistillRead,
} from './brandDistill'

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
      positioning: { differentiators: [] },
    })
    expect(sent(fetchMock).url).toMatch(/\/api\/brand\/distills\/r1\/commit$/)
    expect(sent(fetchMock).body.voices[0].rules.person).toBe('')
    expect(sent(fetchMock).body.guardrails).not.toHaveProperty('disclaimer')
    expect(result.skipped).toEqual([])
    expect(result.applied.audiences).toEqual([])
  })
})

describe('a read a source at a time', () => {
  it('reads an incremental run with its reads, the website named and iconed', async () => {
    stubFetch({
      id: 'r1',
      status: 'collecting',
      incremental: true,
      coverage: { voices: { level: 'thin', note: '1 passage from 1 source.' } },
      website: null,
      sources: [],
      reads: [
        {
          id: 'rd1',
          kind: 'website',
          status: 'ready',
          website: {
            url: 'https://acme.com',
            mapped: true,
            pagesFound: 9,
            siteName: 'Acme',
            faviconUrl: null,
          },
          sources: null,
          answers: null,
          coverage: null,
          failure: null,
          createdAt: '2026-11-24T10:00:00Z',
          finishedAt: null,
        },
      ],
      proposal: null,
    })
    const run = await getDistillRun('r1')
    expect(run.incremental).toBe(true)
    expect(run.coverage.voices?.level).toBe('thin')
    expect(run.reads[0]).toMatchObject({
      kind: 'website',
      sources: [],
      answers: [],
      coverage: {},
      website: { siteName: 'Acme', faviconUrl: null },
    })
  })

  it('reads a run that is not incremental as having no reads', async () => {
    stubFetch({
      id: 'r1',
      status: 'reading',
      website: { url: 'https://acme.com', mapped: true, pagesFound: 9 },
      sources: [],
      proposal: null,
    })
    const run = await getDistillRun('r1')
    expect(run.incremental).toBe(false)
    expect(run.reads).toEqual([])
    expect(run.coverage).toEqual({})
    expect(run.website).toMatchObject({ siteName: '', faviconUrl: null })
  })

  it('adds one source to the run', async () => {
    const fetchMock = stubFetch(
      { id: 'rd2', kind: 'asset', status: 'pending', sources: [] },
      202,
    )
    const read = await addDistillRead('r1', { assetId: 'a1' })
    expect(sent(fetchMock)).toMatchObject({
      method: 'POST',
      body: { assetId: 'a1' },
    })
    expect(sent(fetchMock).url).toMatch(/\/api\/brand\/distills\/r1\/reads$/)
    expect(read.coverage).toEqual({})
  })

  it('stops a read, and composes the run', async () => {
    const stop = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', stop)
    await stopDistillRead('r1', 'rd2')
    expect(sent(stop)).toMatchObject({ method: 'DELETE' })
    expect(sent(stop).url).toMatch(/\/api\/brand\/distills\/r1\/reads\/rd2$/)

    const compose = stubFetch({ id: 'r1', status: 'pending', sources: [] }, 202)
    const run = await composeDistill('r1')
    expect(sent(compose)).toMatchObject({ method: 'POST' })
    expect(sent(compose).url).toMatch(/\/api\/brand\/distills\/r1\/compose$/)
    expect(run.status).toBe('pending')
  })

  it('finds the open run in a 409, and nothing where there is none', () => {
    expect(
      openRunOf({ run: { id: 'r9', status: 'collecting', incremental: true } }),
    ).toMatchObject({ id: 'r9', incremental: true, reads: [] })
    expect(openRunOf({ run: null })).toBeNull()
    expect(openRunOf(undefined)).toBeNull()
  })
})
