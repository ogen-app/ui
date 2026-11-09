import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssistantStreamEvent } from '@/services/api/assistant'

const stream = vi.hoisted(() => ({
  events: [] as AssistantStreamEvent[],
  body: null as unknown,
}))

vi.mock('@/services/api/assistant', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/api/assistant')>()
  return {
    ...actual,
    listThreadMessages: vi.fn(async () => []),
    streamAssistantTurn: vi.fn(
      async (body: unknown, onEvent: (e: AssistantStreamEvent) => void) => {
        stream.body = body
        for (const event of stream.events) onEvent(event)
      },
    ),
  }
})

const refreshTouched = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/assistantTouched', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assistantTouched')>()
  return { ...actual, refreshTouched }
})

const { useAssistantStore } = await import('./assistantStore')
const { useViewContextStore } = await import('./viewContextStore')

function result(changes: Record<string, unknown> = {}) {
  return {
    explanation: 'Done here.',
    action: 'answered' as const,
    details: {},
    saveVersion: false,
    touched: [],
    unsaved: false,
    ...changes,
  }
}

function lastTurn(threadId: string) {
  const turns = useAssistantStore.getState().threads[threadId].turns
  return turns[turns.length - 1]
}

beforeEach(() => {
  useAssistantStore.setState({
    threads: {},
    activeThreadId: null,
    currentThreadId: null,
  })
  stream.events = []
  stream.body = null
  refreshTouched.mockClear()
  useViewContextStore.setState({
    location: { screen: null },
    page: null,
    pageToken: 0,
    dismissed: false,
  })
})

describe('assistantStore', () => {
  it('opens one workspace thread, and sends its scope with the turn', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    expect(id).toBe('workspace')

    stream.events = [{ type: 'complete', result: result() }]
    await useAssistantStore.getState().send(id, 'What happened yesterday?')

    expect(stream.body).toMatchObject({
      instruction: 'What happened yesterday?',
      viewContext: { version: 1, screen: 'home', scope: { kind: 'workspace' } },
    })
  })

  it('builds a turn from the stream and labels it from the pack result', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, 'Spring', 'Spring')
    stream.events = [
      { type: 'tool_call', name: 'runContentPlan', ref: 'r1' },
      { type: 'progress', step: 'build_context' },
      { type: 'explanation_delta', delta: 'Planning…' },
      { type: 'tool_result', ref: 'r1', ok: true },
      {
        type: 'complete',
        result: result({
          explanation: 'Twelve ideas are on the Ideas tab.',
          action: 'content_plan_generated',
          details: { contentPlan: { ideaCount: 12, warnings: [] } },
          touched: [{ kind: 'idea' }],
        }),
      },
    ]
    await useAssistantStore.getState().send(id, 'Plan this campaign')

    const turn = lastTurn(id)
    expect(turn.content).toBe('Twelve ideas are on the Ideas tab.')
    expect(turn.action).toBe('content_plan_generated')
    expect(turn.details?.contentPlan?.ideaCount).toBe(12)
    expect(turn.streaming).toBe(false)
    const tool = turn.steps?.find((s) => s.kind === 'tool')
    expect(tool?.progress).toBe('build_context')
    expect(tool?.endedAt).not.toBeNull()
    // What the turn said it touched is what gets refreshed.
    expect(refreshTouched).toHaveBeenCalledWith(expect.anything(), [
      { kind: 'idea' },
    ])
  })

  it('voids the reply streamed before a pack reload', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    stream.events = [
      { type: 'explanation_delta', delta: 'Let me look at the cam' },
      { type: 'pack_loaded', pack: 'ideas' },
      { type: 'explanation_delta', delta: 'Seven ideas match.' },
    ]
    await useAssistantStore.getState().send(id, 'Show me pricing ideas')
    expect(lastTurn(id).content).toBe('Seven ideas match.')
  })

  it('refreshes the whole subject when the turn never completed', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
    stream.events = [{ type: 'explanation_delta', delta: 'Half a thought' }]
    await useAssistantStore.getState().send(id, 'Plan this campaign')
    expect(refreshTouched).toHaveBeenCalledWith(expect.anything(), [
      { kind: 'campaign', id: 'c1' },
      { kind: 'idea' },
    ])
  })

  it('merges streamed drafts into a campaign thread only', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    let seen = -1
    stream.events = [
      {
        type: 'post_generated',
        post: {
          id: 'p1',
          title: 'Draft',
          content: '',
          platform_id: 'linkedin',
          platform_post_type: '',
          campaign_type_phase_id: null,
          scheduled_at: null,
        },
      },
    ]
    const unsubscribe = useAssistantStore.subscribe((s) => {
      seen = Math.max(seen, s.threads[id]?.streamedPosts.length ?? 0)
    })
    await useAssistantStore.getState().send(id, 'Draft two posts')
    unsubscribe()
    expect(seen).toBe(0)
  })

  it('sends what the screen has selected, and keeps it on the turn', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
    useViewContextStore.getState().setLocation({ screen: 'campaign.ideas' })
    useViewContextStore.getState().registerPage({
      selection: { kind: 'idea', ids: ['i1', 'i2', 'i3'], count: 3 },
      filter: 'pile=waiting',
    })
    stream.events = [{ type: 'complete', result: result() }]
    await useAssistantStore.getState().send(id, 'What do these share?')

    const sent = {
      version: 1,
      screen: 'campaign.ideas',
      scope: { kind: 'campaign', id: 'c1' },
      selection: { kind: 'idea', ids: ['i1', 'i2', 'i3'], count: 3 },
      filter: 'pile=waiting',
    }
    expect(stream.body).toEqual({
      instruction: 'What do these share?',
      viewContext: sent,
    })
    const turns = useAssistantStore.getState().threads[id].turns
    expect(turns[turns.length - 2].view).toEqual(sent)
  })

  it('sends the screen alone once after the chip is dismissed', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    useViewContextStore.getState().setLocation({ screen: 'assets' })
    useViewContextStore.getState().registerPage({
      selection: { kind: 'asset', ids: ['a1'], count: 1 },
    })
    useViewContextStore.getState().dismiss()
    stream.events = [{ type: 'complete', result: result() }]
    await useAssistantStore.getState().send(id, 'Summarise everything')

    expect((stream.body as { viewContext: unknown }).viewContext).toEqual({
      version: 1,
      screen: 'assets',
      scope: { kind: 'workspace' },
    })
    expect(useViewContextStore.getState().dismissed).toBe(false)
  })
})
