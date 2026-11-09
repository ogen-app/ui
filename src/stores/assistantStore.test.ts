import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssistantStreamEvent } from '@/services/api/assistant'

const api = vi.hoisted(() => ({
  dismiss: vi.fn(async () => {}),
  undo: vi.fn(async () => ({
    undone: true,
    kind: 'campaign_dates',
    entityId: 'c1',
  })),
}))

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
    confirmProposal: vi.fn(
      async (
        id: string,
        optionId: string | undefined,
        onEvent: (e: AssistantStreamEvent) => void,
      ) => {
        stream.body = { id, optionId }
        for (const event of stream.events) onEvent(event)
      },
    ),
    dismissProposal: api.dismiss,
    undoAssistantAction: api.undo,
  }
})

const refreshTouched = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/assistantTouched', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/assistantTouched')>()
  return { ...actual, refreshTouched }
})

const { useAssistantStore, setUiActionApplier } =
  await import('./assistantStore')
const { useViewContextStore } = await import('./viewContextStore')

function result(changes: Record<string, unknown> = {}) {
  return {
    explanation: 'Done here.',
    action: 'answered' as const,
    details: {},
    saveVersion: false,
    touched: [],
    unsaved: false,
    proposals: [],
    uiActions: [],
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

  describe('offers', () => {
    const card = {
      id: 'pr1',
      tool: 'draftIdeas',
      summary: 'Draft 2 posts from 3 ideas',
      options: [],
      status: 'pending' as const,
    }

    async function withOffer() {
      const id = useAssistantStore
        .getState()
        .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
      stream.events = [
        { type: 'proposal_created', proposal: card },
        { type: 'complete', result: result({ proposals: [card] }) },
      ]
      await useAssistantStore.getState().send(id, 'Draft these')
      return id
    }

    const offer = (id: string) => lastTurnWithOffer(id)?.proposals?.[0]

    function lastTurnWithOffer(id: string) {
      return useAssistantStore
        .getState()
        .threads[id].turns.find((t) => t.proposals?.length)
    }

    it('keeps an offer on the turn that made it', async () => {
      const id = await withOffer()
      expect(offer(id)).toMatchObject({ id: 'pr1', status: 'pending' })
    })

    it('confirms from the card, as a turn of its own', async () => {
      const id = await withOffer()
      stream.events = [
        { type: 'proposal_resolved', id: 'pr1', status: 'confirmed' },
        {
          type: 'complete',
          result: result({ explanation: 'Done: Draft 2 posts' }),
        },
      ]
      await useAssistantStore.getState().confirmProposal(id, 'pr1')
      expect(stream.body).toEqual({ id: 'pr1', optionId: undefined })
      expect(offer(id)?.status).toBe('confirmed')
      // No user turn: the button is the answer, and the server records it.
      const turns = useAssistantStore.getState().threads[id].turns
      expect(turns.filter((t) => t.role === 'user')).toHaveLength(1)
      expect(turns[turns.length - 1].content).toBe('Done: Draft 2 posts')
    })

    it('closes an offer the server says is gone', async () => {
      const id = await withOffer()
      stream.events = [
        { type: 'error', message: 'This offer no longer exists.', status: 404 },
      ]
      await useAssistantStore.getState().confirmProposal(id, 'pr1')
      expect(offer(id)).toMatchObject({
        status: 'closed',
        error: 'This offer no longer exists.',
      })
    })

    it('does not call an offer confirmed when its stream never answered', async () => {
      const id = await withOffer()
      const { confirmProposal } = await import('@/services/api/assistant')
      vi.mocked(confirmProposal).mockRejectedValueOnce(new Error('HTTP 500'))
      await useAssistantStore.getState().confirmProposal(id, 'pr1')
      expect(offer(id)).toMatchObject({
        status: 'closed',
        error: 'It didn’t go through. Ask again to retry.',
      })
    })

    it('dismisses from the card', async () => {
      const id = await withOffer()
      await useAssistantStore.getState().dismissProposal(id, 'pr1')
      expect(api.dismiss).toHaveBeenCalledWith('pr1')
      expect(offer(id)?.status).toBe('dismissed')
    })

    it('moves past an offer when the next turn starts', async () => {
      const id = await withOffer()
      stream.events = [{ type: 'complete', result: result() }]
      await useAssistantStore.getState().send(id, 'Actually, wait')
      expect(offer(id)?.status).toBe('superseded')
    })
  })

  describe('undo', () => {
    it('undoes, and refreshes what it changed back', async () => {
      const id = useAssistantStore
        .getState()
        .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
      stream.events = [{ type: 'complete', result: result() }]
      await useAssistantStore.getState().send(id, 'Move the end date')
      const turn = lastTurn(id)
      await useAssistantStore.getState().undo(id, turn.id, 'u1')
      expect(lastTurn(id).undo).toEqual({ u1: 'undone' })
      expect(refreshTouched).toHaveBeenLastCalledWith(expect.anything(), [
        { kind: 'campaign', id: 'c1' },
      ])
    })

    it('says so when the change moved on since', async () => {
      const id = useAssistantStore
        .getState()
        .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
      stream.events = [{ type: 'complete', result: result() }]
      await useAssistantStore.getState().send(id, 'Move the end date')
      const { ApiError } = await import('@/services/api/errors')
      api.undo.mockRejectedValueOnce(new ApiError(409, 'changed'))
      await useAssistantStore.getState().undo(id, lastTurn(id).id, 'u2')
      expect(lastTurn(id).undo).toEqual({ u2: 'changed' })
    })

    it('offers UNDO again after a failure that says nothing about the change', async () => {
      const id = useAssistantStore
        .getState()
        .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
      stream.events = [{ type: 'complete', result: result() }]
      await useAssistantStore.getState().send(id, 'Move the end date')
      const { ApiError } = await import('@/services/api/errors')
      api.undo.mockRejectedValueOnce(new ApiError(500, 'boom'))
      await useAssistantStore.getState().undo(id, lastTurn(id).id, 'u3')
      expect(lastTurn(id).undo).toEqual({})
      await useAssistantStore.getState().undo(id, lastTurn(id).id, 'u3')
      expect(lastTurn(id).undo).toEqual({ u3: 'undone' })
    })
  })
})

describe('the assets pack (CON-460)', () => {
  it('keeps a turn’s assets results on its reply', async () => {
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    stream.events = [
      {
        type: 'complete',
        result: result({
          assets: { savedViews: { list: 'assets', views: [] } },
        }),
      },
    ]
    await useAssistantStore.getState().send(id, 'Which smart groups?')
    expect(lastTurn(id).assets).toEqual({
      savedViews: { list: 'assets', views: [] },
    })
  })
})

describe('the thread list (CON-459)', () => {
  it('opens a listed thread without making it the current subject', () => {
    const store = useAssistantStore.getState()
    const here = store.openThread(
      { kind: 'campaign', campaignId: 'c1' },
      '',
      'Here',
    )
    const id = useAssistantStore
      .getState()
      .adoptThread({ kind: 'campaign', campaignId: 'c9' }, '', 'Elsewhere')
    const state = useAssistantStore.getState()
    expect(state.activeThreadId).toBe(id)
    expect(state.currentThreadId).toBe(here)
    expect(state.threads[id]).toMatchObject({ loaded: false, turns: [] })
  })

  it('forgets every thread on a workspace switch', () => {
    useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, '', 'Here')
    useAssistantStore.getState().reset()
    const state = useAssistantStore.getState()
    expect(state.threads).toEqual({})
    expect(state.activeThreadId).toBeNull()
    expect(state.currentThreadId).toBeNull()
  })

  it('refreshes the list when a turn finishes', async () => {
    const { queryClient } = await import('@/lib/queryClient')
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'campaign', campaignId: 'c1' }, '', '')
    stream.events = [{ type: 'complete', result: result() }]
    await useAssistantStore.getState().send(id, 'Hello')
    expect(spy).toHaveBeenCalledWith({ queryKey: ['assistant', 'threads'] })
    expect(useAssistantStore.getState().threads[id].lastActiveAt).toEqual(
      expect.any(Number),
    )
  })
})

describe('settleHistory', () => {
  it('reads answers, expiry and supersession back into a reloaded thread', async () => {
    const { settleHistory } = await import('./assistantStore')
    const offer = (id: string, summary: string, expiresAt?: string) => ({
      id,
      tool: 't',
      summary,
      expiresAt,
      options: [],
      status: 'pending' as const,
    })
    const turns = [
      { id: 'u1', role: 'user' as const, content: 'Draft these' },
      {
        id: 'a1',
        role: 'assistant' as const,
        content: '',
        proposals: [offer('p1', 'Draft 2 posts')],
      },
      {
        id: 'u2',
        role: 'user' as const,
        content: 'Confirmed: Draft 2 posts',
        answer: 'confirmed' as const,
      },
      {
        id: 'a2',
        role: 'assistant' as const,
        content: '',
        proposals: [offer('p2', 'Set aside 6 ideas', '2020-01-01T00:00:00Z')],
      },
      { id: 'u3', role: 'user' as const, content: 'And these?' },
      {
        id: 'a3',
        role: 'assistant' as const,
        content: '',
        proposals: [offer('p3', 'Merge 7 ideas')],
      },
    ]
    settleHistory(turns, Date.parse('2026-11-08T00:00:00Z'))
    expect(turns[1].proposals?.[0].status).toBe('confirmed')
    expect(turns[3].proposals?.[0].status).toBe('expired')
    expect(turns[5].proposals?.[0].status).toBe('pending')
  })
})

describe('screen changes', () => {
  it('applies a turn’s ui actions in order, and remembers where each left', async () => {
    const applied: string[] = []
    const restored: string[] = []
    setUiActionApplier({
      apply: async (action) => {
        applied.push(action.type)
        return action.type === 'select' ? undefined : `/before-${action.type}`
      },
      restore: async (href) => {
        restored.push(href)
      },
    })
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    stream.events = [
      { type: 'ui_action', action: { type: 'navigate', screen: 'ideas' } },
      {
        type: 'ui_action',
        action: { type: 'set_filter', screen: 'ideas', filter: 'pile=waiting' },
      },
      {
        type: 'ui_action',
        action: {
          type: 'select',
          screen: 'ideas',
          selection: { kind: 'idea', ids: ['i1'] },
        },
      },
      { type: 'complete', result: result() },
    ]
    await useAssistantStore.getState().send(id, 'Show me what is waiting')

    expect(applied).toEqual(['navigate', 'set_filter', 'select'])
    const turn = lastTurn(id)
    expect(turn.uiActions?.map((a) => a.before)).toEqual([
      '/before-navigate',
      '/before-set_filter',
      undefined,
    ])

    await useAssistantStore.getState().undoUiAction(id, turn.id, 1)
    expect(restored).toEqual(['/before-set_filter'])
    expect(lastTurn(id).uiActions?.[1].undone).toBe(true)
    setUiActionApplier(null)
  })

  it('runs nothing on the screen for a turn that failed', async () => {
    const applied: string[] = []
    setUiActionApplier({
      apply: async (action) => {
        applied.push(action.type)
        return '/x'
      },
      restore: async () => {},
    })
    const id = useAssistantStore
      .getState()
      .openThread({ kind: 'workspace' }, '', '')
    stream.events = [
      { type: 'ui_action', action: { type: 'navigate', screen: 'ideas' } },
      { type: 'error', message: 'Something went wrong on my side.' },
    ]
    await useAssistantStore.getState().send(id, 'Open ideas')
    expect(applied).toEqual([])
    setUiActionApplier(null)
  })
})
