import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseHistoryResult,
  streamAssistantTurn,
  threadScope,
  type AssistantStreamEvent,
} from './assistant'

describe('threadScope', () => {
  it('names each thread the way the history route takes it', () => {
    expect(threadScope({ kind: 'workspace' })).toBe('workspace')
    expect(threadScope({ kind: 'campaign', campaignId: 'c1' })).toBe(
      'campaign:c1',
    )
    expect(threadScope({ kind: 'post', postId: 'p1', campaignId: 'c1' })).toBe(
      'post:p1',
    )
  })
})

describe('parseHistoryResult', () => {
  it('reads a universal turn, with the pack results under `results`', () => {
    const result = parseHistoryResult(
      JSON.stringify({
        explanation: 'Planned 12 ideas.',
        action: 'answered',
        touched: [{ kind: 'idea' }, { kind: 'campaign', id: 'c1' }],
        results: {
          campaign: {
            explanation: 'ignored, the orchestrator spoke',
            action: 'content_plan_generated',
            contentPlan: {
              ideaCount: 12,
              grounding: {
                mode: 'grounded',
                sources: [{ id: 'a1', title: 'Brochure' }],
              },
            },
          },
        },
      }),
      'campaign',
    )
    expect(result.explanation).toBe('Planned 12 ideas.')
    expect(result.action).toBe('content_plan_generated')
    expect(result.details.contentPlan).toEqual({
      ideaCount: 12,
      warnings: [],
      grounding: {
        mode: 'grounded',
        sources: [{ id: 'a1', title: 'Brochure' }],
      },
    })
    expect(result.touched).toEqual([
      { kind: 'idea', id: undefined },
      { kind: 'campaign', id: 'c1' },
    ])
  })

  it('reads the documents a draft drew on as its grounding', () => {
    const read = (draftedPosts: object) =>
      parseHistoryResult(
        JSON.stringify({
          explanation: 'Drafted.',
          results: { campaign: { draftedPosts } },
        }),
        'campaign',
      ).details.draftedPosts
    expect(
      read({ postCount: 2, usedAssets: [{ id: 'a1', title: 'Brochure' }] }),
    ).toEqual({
      postCount: 2,
      warnings: [],
      grounding: {
        mode: 'grounded',
        sources: [{ id: 'a1', title: 'Brochure' }],
      },
    })
    expect(read({ postCount: 2 })).toEqual({ postCount: 2, warnings: [] })
  })

  it('reads a post-pack result and its clone', () => {
    const result = parseHistoryResult(
      JSON.stringify({
        explanation: 'Cloned it for Instagram.',
        action: 'answered',
        touched: [{ kind: 'post', id: 'p2' }],
        results: {
          post: {
            action: 'cloned',
            cloneResult: { newPostId: 'p2', adapted: true },
          },
        },
      }),
      'post',
    )
    expect(result.action).toBe('cloned')
    expect(result.clonePostId).toBe('p2')
  })

  it('reads a campaign row migrated from the old table', () => {
    const result = parseHistoryResult(
      JSON.stringify({
        explanation: 'Done.',
        action: 'content_plan_generated',
        contentPlan: { postCount: 8 },
        briefApplied: true,
      }),
      'campaign',
    )
    expect(result.action).toBe('content_plan_generated')
    // The old count was posts; it is read as the plan's size.
    expect(result.details.contentPlan?.ideaCount).toBe(8)
    expect(result.details.brief).toEqual({ applied: true })
  })

  it('reads a post row migrated from the old table', () => {
    const result = parseHistoryResult(
      JSON.stringify({
        explanation: 'Tightened it.',
        action: 'edited',
        saveVersion: true,
        versionNote: 'shorter',
      }),
      'post',
    )
    expect(result.action).toBe('edited')
    expect(result.saveVersion).toBe(true)
    expect(result.versionNote).toBe('shorter')
  })

  it('shows an unreadable row as prose', () => {
    const result = parseHistoryResult('not json', 'workspace')
    expect(result.explanation).toBe('not json')
    expect(result.action).toBe('answered')
  })

  it('keeps a declined turn declined', () => {
    const result = parseHistoryResult(
      JSON.stringify({ explanation: 'Out of scope.', action: 'declined' }),
      'workspace',
    )
    expect(result.action).toBe('declined')
  })
})

describe('calendar findings', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keep only the fixes a row can act on', async () => {
    const findings = {
      campaignId: 'c1',
      findings: [
        {
          key: 'k1',
          code: 'crowded_day',
          severity: 'warning',
          message: 'Thursday is crowded.',
          fixes: [
            { kind: 'note', title: 'Have a look' },
            { kind: 'open', title: 'Open the post', postId: 'p1' },
            { kind: 'redistribute', title: 'Spread them', proposalId: 'pr1' },
          ],
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            `event: calendar_findings\ndata: ${JSON.stringify(findings)}\n\n`,
            { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    )
    const events: AssistantStreamEvent[] = []
    await streamAssistantTurn(
      {
        instruction: 'check',
        viewContext: {
          version: 1,
          screen: 'campaign.calendar',
          scope: { kind: 'campaign', id: 'c1' },
        },
      },
      (e) => events.push(e),
    )
    const event = events.find((e) => e.type === 'calendar_findings')
    expect(
      event?.type === 'calendar_findings' &&
        event.findings.findings[0].fixes.map((f) => f.title),
    ).toEqual(['Open the post', 'Spread them'])
  })
})
