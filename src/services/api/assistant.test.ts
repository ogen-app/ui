import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  listThreads,
  offerOutcome,
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

  it('reads a draft’s grounding, and nothing when its sources are unknown', () => {
    const read = (draftedPosts: object) =>
      parseHistoryResult(
        JSON.stringify({
          explanation: 'Drafted.',
          results: { campaign: { draftedPosts } },
        }),
        'campaign',
      ).details.draftedPosts
    expect(
      read({
        postCount: 2,
        grounding: {
          mode: 'grounded',
          sources: [
            { id: 'a1', title: 'Brochure', analysisId: 'an1', ideaId: 'i1' },
          ],
        },
      }),
    ).toEqual({
      postCount: 2,
      warnings: [],
      grounding: {
        mode: 'grounded',
        sources: [
          { id: 'a1', title: 'Brochure', analysisId: 'an1', ideaId: 'i1' },
        ],
      },
    })
    expect(
      read({ postCount: 1, grounding: { mode: 'exploratory' } })?.grounding,
    ).toEqual({ mode: 'exploratory', sources: [] })
    // Pasted material: the server leaves grounding out, and so does this —
    // never "not grounded". The documents it used to name no longer count.
    expect(
      read({ postCount: 2, usedAssets: [{ id: 'a1', title: 'Brochure' }] })
        ?.grounding,
    ).toBeUndefined()
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

  it('reads what an enriched brief drew on (CON-474)', () => {
    const result = parseHistoryResult(
      JSON.stringify({
        explanation: 'Filled in the brief.',
        results: {
          campaign: {
            brief: {
              applied: true,
              undoId: 'u1',
              grounding: {
                mode: 'grounded',
                sources: [{ id: 'a1', title: 'Brochure', analysisId: 'an1' }],
              },
            },
          },
        },
      }),
      'campaign',
    )
    expect(result.details.brief).toEqual({
      applied: true,
      undoId: 'u1',
      grounding: {
        mode: 'grounded',
        sources: [{ id: 'a1', title: 'Brochure', analysisId: 'an1' }],
      },
    })
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

describe('listThreads', () => {
  afterEach(() => vi.unstubAllGlobals())

  const serve = (rows: object[]) => {
    const fetch = vi.fn(
      async (_url: RequestInfo | URL) =>
        new Response(JSON.stringify(rows), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetch)
    return fetch
  }

  it('reads each thread into a subject it can route to, and skips the rest', async () => {
    const fetch = serve([
      {
        scope: 'workspace',
        scope_kind: 'workspace',
        scope_id: '',
        title: '',
        campaign_id: '',
        campaign_title: '',
        archived: false,
        last_message_at: '2026-11-09T10:00:00Z',
        last_role: 'model',
        preview: 'Planned 12 ideas.',
        message_count: 2,
      },
      {
        scope: 'campaign:c1',
        scope_kind: 'campaign',
        scope_id: 'c1',
        title: 'Spring launch',
        campaign_id: 'c1',
        campaign_title: 'Spring launch',
        archived: true,
        last_message_at: '2026-11-08T10:00:00Z',
        last_role: 'user',
        preview: 'Move the end date.',
        message_count: 6,
      },
      {
        scope: 'post:p1',
        scope_kind: 'post',
        scope_id: 'p1',
        title: 'Teaser',
        campaign_id: 'c1',
        campaign_title: 'Spring launch',
        archived: false,
        last_message_at: '2026-11-07T10:00:00Z',
        last_role: 'user',
        preview: 'Shorter, please.',
        message_count: 1,
      },
      // No campaign to route a post through, and a kind this build predates:
      // both are left out rather than drawn as dead rows.
      { scope: 'post:p2', scope_kind: 'post', scope_id: 'p2' },
      { scope: 'series:s1', scope_kind: 'series', scope_id: 's1' },
    ])
    const page = await listThreads()
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      '/api/assistant/threads?limit=50',
    )
    // Not a full page: there is nothing older to ask for.
    expect(page.next).toBeNull()
    expect(page.threads).toEqual([
      {
        subject: { kind: 'workspace' },
        title: '',
        campaignTitle: '',
        archived: false,
        lastMessageAt: '2026-11-09T10:00:00Z',
        preview: 'Planned 12 ideas.',
      },
      {
        subject: { kind: 'campaign', campaignId: 'c1' },
        title: 'Spring launch',
        campaignTitle: 'Spring launch',
        archived: true,
        lastMessageAt: '2026-11-08T10:00:00Z',
        preview: 'Move the end date.',
      },
      {
        subject: { kind: 'post', postId: 'p1', campaignId: 'c1' },
        title: 'Teaser',
        campaignTitle: 'Spring launch',
        archived: false,
        lastMessageAt: '2026-11-07T10:00:00Z',
        preview: 'Shorter, please.',
      },
    ])
  })

  it('pages by the last row’s time, and only after a full page', async () => {
    const full = Array.from({ length: 50 }, (_, i) => ({
      scope: `campaign:c${i}`,
      scope_kind: 'campaign',
      scope_id: `c${i}`,
      last_message_at: `2026-11-0${(i % 9) + 1}T10:00:00Z`,
    }))
    serve(full)
    expect((await listThreads()).next).toBe(full[49].last_message_at)
    const fetch = serve([])
    await listThreads('2026-11-01T10:00:00Z')
    expect(String(fetch.mock.calls[0]?.[0])).toContain(
      'before=2026-11-01T10%3A00%3A00Z',
    )
  })
})

describe('the assets pack’s results (CON-460)', () => {
  const read = (results: object) =>
    parseHistoryResult(
      JSON.stringify({ explanation: 'Here.', action: 'answered', results }),
      'workspace',
    ).assets

  it('reads each tool’s output, and the smart groups beside them', () => {
    const assets = read({
      assets: {
        ask: {
          scope: 'open_asset',
          excerpts: [{ assetId: 'a1', title: 'Brochure', pages: 'p. 12' }],
        },
        analysis: {
          assetId: 'a1',
          title: 'Brochure',
          lens: { status: 'ready', readAt: '2026-11-06T10:00:00Z' },
          gist: 'Sells the slow stay.',
          keyPoints: ['Spa', 'Terrace'],
          ideas: { undecided: 5, yes: 2, later: 1, no: 0 },
          topIdeas: [{ id: 'i1', title: 'The thermal pool' }],
          otherLenses: [
            { campaignId: 'c1', campaignName: 'Spring', status: 'ready' },
          ],
        },
        compare: {
          mode: 'compare',
          assets: [
            { id: 'a1', title: 'Brochure', letter: 'A', from: 'analysis' },
            { id: 'a2', title: 'Press kit', letter: 'B', from: 'passages' },
          ],
          shared: [
            {
              text: 'Opens 14 March',
              assetIds: ['a1', 'a2'],
              letters: ['A', 'B'],
            },
          ],
          partial: [],
          conflicts: [
            { text: 'Spa hours', assetIds: ['a1', 'a2'], letters: ['A', 'B'] },
          ],
          grounding: {
            mode: 'grounded',
            sources: [{ id: 'a1', title: 'Brochure' }],
          },
        },
        campaign: {
          campaignId: 'c9',
          name: 'Spring reopening',
          type: 'Launch',
          startDate: '2026-03-02T00:00:00Z',
          assetIds: ['a1', 'a2'],
          undoId: 'u7',
        },
      },
      savedViews: {
        list: 'assets',
        views: [
          {
            id: 'v1',
            name: 'Needs analysis',
            filter: 'status=new',
            shared: true,
            count: 12,
          },
        ],
      },
    })
    expect(assets?.ask).toEqual({
      scope: 'open_asset',
      excerpts: [{ assetId: 'a1', title: 'Brochure', pages: 'p. 12' }],
    })
    expect(assets?.analysis).toMatchObject({
      assetId: 'a1',
      lens: { status: 'ready' },
      ideas: { undecided: 5, yes: 2, later: 1, no: 0 },
      otherLenses: [
        { campaignId: 'c1', campaignName: 'Spring', status: 'ready' },
      ],
    })
    expect(assets?.compare).toMatchObject({
      mode: 'compare',
      assets: [
        { letter: 'A', from: 'analysis' },
        { letter: 'B', from: 'passages' },
      ],
      conflicts: [{ text: 'Spa hours', letters: ['A', 'B'] }],
    })
    expect(assets?.campaign).toMatchObject({ campaignId: 'c9', undoId: 'u7' })
    expect(assets?.savedViews).toEqual({
      list: 'assets',
      views: [{ id: 'v1', name: 'Needs analysis', shared: true, count: 12 }],
    })
  })

  it('reads the campaign pack’s search on a campaign’s asset page', () => {
    const assets = read({
      campaign: {
        action: 'answered',
        ask: {
          scope: 'open_asset',
          excerpts: [{ assetId: 'a1', title: 'Brochure', pages: 'p. 3' }],
        },
      },
    })
    expect(assets?.ask).toEqual({
      scope: 'open_asset',
      excerpts: [{ assetId: 'a1', title: 'Brochure', pages: 'p. 3' }],
    })
  })

  it('counts the ids a comparison couldn’t find', () => {
    expect(
      read({
        assets: {
          compare: {
            mode: 'compare',
            assets: [{ id: 'a1', title: 'A', letter: 'A', from: 'analysis' }],
            missing: ['x1', 'x2'],
          },
        },
      })?.compare?.missing,
    ).toBe(2)
  })

  it('leaves out what it can’t read, and is absent when nothing ran', () => {
    expect(read({})).toBeUndefined()
    expect(
      read({
        assets: {
          ask: { scope: 'somewhere', excerpts: [] },
          analysis: { title: 'No id', lens: { status: 'ready' } },
          compare: { mode: 'compare', assets: [] },
        },
        savedViews: { list: 'posts', views: [] },
      }),
    ).toBeUndefined()
  })
})

describe('the brand tools’ results (CON-461)', () => {
  const read = (results: object) =>
    parseHistoryResult(
      JSON.stringify({ explanation: 'Done.', action: 'answered', results }),
      'workspace',
    ).foundation

  it('reads each tool by name, and which of a family ran', () => {
    const f = read({
      foundation: {
        updateVoice: {
          voice: {
            id: 'v1',
            name: 'Warm host',
            whenToUse: 'Most posts',
            isDefault: true,
            rules: {
              emoji: 'never',
              formality: 'casual',
              person: 'we',
              length: 'medium',
            },
          },
          undoId: 'u1',
        },
        removeAudience: {
          audience: { id: 'a1', name: 'Planners', who: 'Wedding planners' },
          unbound: 3,
          undoId: 'u2',
        },
        updateGuardrails: {
          guardrails: {
            mayClaim: ['x'],
            neverClaim: ['y', 'z'],
            bannedWords: ['luxury'],
            disclaimer: '',
          },
          undoId: 'u3',
        },
        editBrand: {
          done: 4,
          undoIds: ['b1', 'b2'],
          failed: [{ what: 'remove a fact', reason: 'gone' }],
        },
        startBrandDistill: { runId: 'r1', status: 'running', counts: {} },
        listSeries: {
          campaignId: 'c1',
          series: [
            {
              id: 's1',
              name: 'From the kitchen',
              runs: true,
              rhythm: { times: 1, per: 'week' },
            },
          ],
        },
        runSeries: {
          campaignId: 'c1',
          seriesId: 's1',
          running: true,
          rhythm: { times: 2, per: 'month' },
          undoId: 'u4',
        },
        getBrand: {
          voices: [],
          expiredFacts: [
            {
              id: 'f1',
              statement: 'Spring rate €690',
              source: 'Annex',
              expiresAt: '2026-03-31',
            },
          ],
        },
      },
      repair: {
        checkBrand: {
          checked: 4,
          findings: [
            {
              postId: 'p1',
              title: 'Rooftop teaser',
              rule: 'banned_word',
              severity: 'high',
              quote: 'luxury',
              issue: 'Uses a banned word.',
              fix: { kind: 'open_post', title: 'Open the post', postId: 'p1' },
            },
          ],
        },
      },
    })
    expect(f?.voice).toMatchObject({
      change: 'updated',
      name: 'Warm host',
      isDefault: true,
      undoId: 'u1',
    })
    expect(f?.audience).toMatchObject({
      change: 'removed',
      unbound: 3,
      undoId: 'u2',
    })
    expect(f?.guardrails).toEqual({
      mayClaim: 1,
      neverClaim: 2,
      bannedWords: ['luxury'],
      disclaimer: '',
      undoId: 'u3',
    })
    expect(f?.bulk).toMatchObject({ done: 4, undoIds: ['b1', 'b2'] })
    expect(f?.distill).toMatchObject({ runId: 'r1', status: 'running' })
    expect(f?.seriesList?.series[0]).toMatchObject({
      name: 'From the kitchen',
      runs: true,
    })
    expect(f?.run).toMatchObject({
      running: true,
      rhythm: { times: 2, per: 'month' },
    })
    expect(f?.expiredFacts).toEqual([
      {
        id: 'f1',
        statement: 'Spring rate €690',
        source: 'Annex',
        expiresAt: '2026-03-31',
      },
    ])
    expect(f?.brandCheck?.findings[0]).toMatchObject({
      postId: 'p1',
      severity: 'high',
      fixTitle: 'Open the post',
    })
  })

  it('is absent when no brand tool ran', () => {
    expect(read({})).toBeUndefined()
    expect(read({ foundation: { getBrand: { voices: [] } } })).toBeUndefined()
  })
})

describe('the repair pack’s results (CON-462)', () => {
  const read = (results: object) =>
    parseHistoryResult(
      JSON.stringify({ explanation: 'Done.', action: 'answered', results }),
      'campaign',
    )

  it('reads a rewritten post with its own grounding (CON-474)', () => {
    const { repair } = read({
      repair: {
        revisePost: {
          postId: 'p1',
          revised: true,
          versioned: true,
          note: 'saved as a new version',
          grounding: {
            mode: 'grounded',
            sources: [{ id: 'a1', title: 'Brochure', analysisId: 'an1' }],
          },
        },
      },
    })
    expect(repair?.revised).toEqual({
      postId: 'p1',
      revised: true,
      versioned: true,
      grounding: {
        mode: 'grounded',
        sources: [{ id: 'a1', title: 'Brochure', analysisId: 'an1' }],
      },
    })
    expect(
      read({ repair: { revisePost: { postId: 'p1', revised: true } } }).repair
        ?.revised?.grounding,
    ).toBeUndefined()
  })

  it('replays a recorded calendar check as the turn’s findings', () => {
    const result = read({
      repair: {
        checkCalendar: {
          campaignId: 'c1',
          dismissed: 1,
          findings: [
            {
              key: 'post_type_not_allowed:abc',
              code: 'post_type_not_allowed',
              severity: 'warning',
              message: '1 story post on Instagram uses a dropped type',
              postIds: ['p1'],
              fixes: [
                {
                  kind: 'convert_post_type',
                  title: 'Make them image-post',
                  postIds: ['p1'],
                  postType: 'image-post',
                  proposalId: 'pr1',
                },
                {
                  kind: 'delete',
                  title: 'Delete them',
                  postIds: ['p1'],
                  proposalId: 'pr2',
                },
              ],
            },
          ],
        },
      },
    })
    expect(result.findings?.dismissed).toBe(1)
    expect(result.findings?.findings[0].fixes[1]).toEqual({
      kind: 'delete',
      title: 'Delete them',
      postId: undefined,
      postIds: ['p1'],
      proposalId: 'pr2',
    })
    expect(result.repair).toBeUndefined()
  })

  it('reads the review with each finding’s key and fixes', () => {
    const review = read({
      repair: {
        reviewCampaign: {
          campaignId: 'c1',
          postsChecked: 4,
          findings: [
            {
              kind: 'brief',
              key: 'brief_tone:1',
              severity: 'medium',
              aspect: 'goal_alignment',
              issue: 'The goal names no audience.',
              fixes: [
                {
                  kind: 'improve_brief',
                  title: 'Improve the brief’s goal',
                  proposalId: 'pr3',
                },
              ],
            },
            {
              kind: 'post',
              key: 'post_drift:2',
              severity: 'high',
              postId: 'p2',
              title: 'Late check-out',
              issue: 'Promises free parking.',
              fixes: [
                {
                  kind: 'revise_post',
                  title: 'Rewrite it to follow the brief',
                  postId: 'p2',
                  proposalId: 'pr4',
                },
                { kind: 'open_post', title: 'Open the post', postId: 'p2' },
              ],
            },
          ],
        },
      },
    }).repair?.review
    expect(review?.postsChecked).toBe(4)
    expect(review?.findings.map((f) => [f.kind, f.key, f.label])).toEqual([
      ['brief', 'brief_tone:1', 'Goal alignment'],
      ['post', 'post_drift:2', 'Late check-out'],
    ])
    expect(review?.findings[1].fixes.map((f) => f.kind)).toEqual([
      'revise_post',
      'open_post',
    ])
  })

  it('reads the optimise plan with the posts it keeps, and a fix’s undo', () => {
    const repair = read({
      repair: {
        optimiseCalendar: {
          campaignId: 'c1',
          proposalId: 'pr5',
          moves: [
            {
              postId: 'p1',
              title: 'Spa',
              from: '2026-04-17',
              to: '2026-04-14',
            },
          ],
          locked: [{ postId: 'p3', title: 'Pool', date: '2026-04-15' }],
        },
        changePostType: { changed: 2, undoId: 'u1' },
        unschedulePosts: {
          changed: 1,
          withdrawing: 1,
          skipped: [{ postId: 'p9', reason: 'it is published' }],
        },
      },
    }).repair
    expect(repair?.plan?.locked).toEqual([
      { postId: 'p3', title: 'Pool', date: '2026-04-15' },
    ])
    expect(repair?.converted).toEqual({
      changed: 2,
      withdrawing: 0,
      skipped: [],
      undoId: 'u1',
    })
    expect(repair?.unscheduled?.skipped[0].reason).toBe('it is published')
    expect(repair?.deleted).toBeUndefined()
  })
})

describe('the analytics pack’s results (CON-463)', () => {
  const read = (body: object) =>
    parseHistoryResult(
      JSON.stringify({ explanation: 'Done.', action: 'answered', ...body }),
      'workspace',
    )

  it('keeps the reads as the turn’s analytics', () => {
    const result = read({
      results: {
        analytics: {
          postingFrequency: {
            applied: { platforms: ['instagram'] },
            data: [
              {
                platform: 'instagram',
                posts_per_week: 3,
                avg_engagement_rate: 4.1,
                avg_engagement: 812,
                weeks_count: 12,
              },
            ],
          },
        },
      },
    })
    expect(result.analytics?.frequency?.data).toEqual([
      { platform: 'instagram', perWeek: 3, rate: 4.1, weeks: 12 },
    ])
  })

  it('reads a set_window with its window', () => {
    const result = read({
      uiActions: [
        {
          type: 'set_window',
          screen: 'analytics',
          window: {
            from: '2026-03-01',
            to: '2026-03-31',
            platforms: ['instagram'],
            campaignId: 'c1',
          },
        },
      ],
    })
    expect(result.uiActions).toEqual([
      expect.objectContaining({
        type: 'set_window',
        screen: 'analytics',
        window: {
          from: '2026-03-01',
          to: '2026-03-31',
          platforms: ['instagram'],
          campaignId: 'c1',
        },
      }),
    ])
  })

  it('reads an open_add_source, which used to be dropped (CON-474)', () => {
    const result = read({
      uiActions: [
        {
          type: 'open_add_source',
          screen: 'campaign.assets',
          campaignId: 'c1',
        },
      ],
    })
    expect(result.uiActions).toEqual([
      expect.objectContaining({
        type: 'open_add_source',
        screen: 'campaign.assets',
        campaignId: 'c1',
      }),
    ])
  })

  it('reads an open_connect with what it opens', () => {
    const result = read({
      uiActions: [
        {
          type: 'open_connect',
          screen: 'settings',
          connect: { platform: 'instagram', accountId: 'a1', reconnect: true },
        },
      ],
    })
    expect(result.uiActions[0]).toMatchObject({
      type: 'open_connect',
      connect: { platform: 'instagram', accountId: 'a1', reconnect: true },
    })
  })
})

describe('a draft written from ideas (CON-466)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('streams as a generated post', async () => {
    const drafted = {
      postId: 'p1',
      title: 'A pool in the rock',
      platformId: 'instagram',
      ideaIds: ['i1'],
      usedAssetIds: [],
      grounding: { mode: 'exploratory' },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            `event: idea_draft_post\ndata: ${JSON.stringify(drafted)}\n\n`,
            { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
          ),
      ),
    )
    const events: AssistantStreamEvent[] = []
    await streamAssistantTurn(
      {
        instruction: 'draft them',
        viewContext: {
          version: 1,
          screen: 'campaign.ideas',
          scope: { kind: 'campaign', id: 'c1' },
        },
      },
      (e) => events.push(e),
    )
    expect(events).toEqual([
      {
        type: 'post_generated',
        post: expect.objectContaining({
          id: 'p1',
          title: 'A pool in the rock',
          platform_id: 'instagram',
          scheduled_at: null,
        }),
      },
    ])
  })
})

describe('an offer answered from its card (CON-467)', () => {
  it('reads what a run left undone, and its retry', () => {
    const r = parseHistoryResult(
      JSON.stringify({
        explanation: 'Done in part: Draft 12 posts. 3 not done.',
        action: 'answered',
        result: {
          status: 'ok',
          result: { posts: [] },
          notMade: [
            { id: 'i1', title: 'Six rooms · instagram', reason: 'timed out' },
            { id: 'i2', reason: 'it no longer exists' },
            { id: '', reason: 'nothing to name' },
          ],
          retryProposalId: 'pr9',
        },
      }),
      'campaign',
    )
    expect(r.answered).toEqual({
      reoffered: false,
      notMade: [
        { id: 'i1', title: 'Six rooms · instagram', reason: 'timed out' },
        { id: 'i2', title: undefined, reason: 'it no longer exists' },
      ],
      retryProposalId: 'pr9',
      tagged: undefined,
    })
  })

  it('reads a re-offer and a tagging, and nothing from a plain run', () => {
    expect(offerOutcome({ status: 'proposed', proposalId: 'pr2' })).toEqual({
      reoffered: true,
      notMade: [],
      retryProposalId: undefined,
      tagged: undefined,
    })
    expect(
      offerOutcome({ status: 'ok', result: { tagged: 14, undoId: 'u1' } })
        ?.tagged,
    ).toEqual({ count: 14, undoId: 'u1' })
    expect(offerOutcome({ status: 'ok', result: { done: 3 } })).toBeUndefined()
    expect(offerOutcome(undefined)).toBeUndefined()
  })

  it('reads the drafts a replace deleted (CON-468)', () => {
    expect(
      offerOutcome({
        status: 'ok',
        result: { drafted: { postCount: 4 }, deleted: 3, kept: ['p9'] },
      })?.replaced,
    ).toEqual({ deleted: 3, kept: 1 })
  })

  it('marks the option the server recommends', () => {
    const r = parseHistoryResult(
      JSON.stringify({
        explanation: 'Thursday is full.',
        action: 'answered',
        results: {},
        proposals: [
          {
            id: 'pr1',
            tool: 'applyCalendarMoves',
            summary: 'Thursday already has 3 posts',
            options: [
              { id: 'anyway', title: 'Add it anyway' },
              { id: 'friday', title: 'Move it to Friday', recommended: true },
            ],
          },
        ],
      }),
      'campaign',
    )
    expect(r.proposals[0].recommended).toBe('friday')
  })
})

describe('the campaign state (CON-468)', () => {
  it('reads a raised goal and a removal from the campaign pack', () => {
    const r = parseHistoryResult(
      JSON.stringify({
        explanation: 'Raised the goal.',
        action: 'answered',
        results: {
          campaign: {
            action: 'goal_updated',
            goal: { perPeriod: 32, cadence: 'month', target: 96, undoId: 'u1' },
            platforms: { removed: 'Threads', undoId: 'u2' },
          },
        },
      }),
      'campaign',
    )
    expect(r.action).toBe('goal_updated')
    expect(r.details.goal).toEqual({
      perPeriod: 32,
      cadence: 'month',
      target: 96,
      undoId: 'u1',
    })
    expect(r.details.platforms).toEqual({
      added: '',
      removed: 'Threads',
      undoId: 'u2',
    })
  })
})
