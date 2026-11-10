import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCampaignProblems } from './campaignProblems'

function answer(body: object) {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ),
  )
}

describe('getCampaignProblems', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is null when the overview has no problems at all', async () => {
    answer({ brief: {} })
    expect(await getCampaignProblems('c1')).toBeNull()
  })

  it('reads a nil list as none', async () => {
    answer({ problems: null, problemsDismissed: 2 })
    expect(await getCampaignProblems('c1')).toEqual({
      problems: [],
      dismissed: 2,
    })
  })

  it('leaves out a problem without a key', async () => {
    answer({
      problems: [
        { code: 'gap', severity: 'info', message: 'Quiet week', fixes: [] },
        {
          key: 'gap:1',
          code: 'gap',
          severity: 'info',
          message: 'Quiet',
          fixes: null,
        },
      ],
    })
    const read = await getCampaignProblems('c1')
    expect(read?.problems.map((p) => p.key)).toEqual(['gap:1'])
  })
})
