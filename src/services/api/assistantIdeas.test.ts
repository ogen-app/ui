import { describe, expect, it } from 'vitest'
import { draftedPost, ideasResults } from './assistantIdeas'

describe('ideasResults', () => {
  it('is absent when the pack recorded nothing', () => {
    expect(ideasResults({})).toBeUndefined()
    expect(ideasResults({ ideas: {} })).toBeUndefined()
  })

  it('reads ideas found and a verdict with its undo', () => {
    const r = ideasResults({
      ideas: {
        findIdeas: {
          total: 14,
          ideas: [
            {
              id: 'i1',
              title: 'The pool',
              verdict: 'yes',
              fitScore: 82,
              plan: {},
            },
            { id: '', title: 'dropped' },
          ],
        },
        setIdeaVerdict: {
          idea: { id: 'i1', title: 'The pool', verdict: 'later' },
          undoId: 'u1',
        },
        setIdeaVerdicts: { done: 5, failed: ['i9'], undoId: 'u2' },
        deleteIdeas: { done: 2 },
      },
    })
    expect(r?.found).toMatchObject({
      total: 14,
      ideas: [{ id: 'i1', title: 'The pool', verdict: 'yes', fitScore: 82 }],
    })
    expect(r?.found?.ideas).toHaveLength(1)
    expect(r?.decided).toMatchObject({
      idea: { verdict: 'later' },
      undoId: 'u1',
    })
    expect(r?.decidedMany).toMatchObject({
      done: 5,
      failed: 1,
      undoId: 'u2',
      ideas: [],
    })
    expect(r?.deleted?.undoId).toBeUndefined()
  })

  it('reads a compiled post’s grounding, exploratory without sources', () => {
    const read = (grounding: unknown) =>
      ideasResults({
        ideas: {
          compileIdeas: {
            postId: 'p1',
            title: 'Water, not rooms',
            posts: [{ postId: 'p1', title: 'Water, not rooms' }],
            campaignId: 'c1',
            ideas: 3,
            grounding,
            undoId: 'u3',
          },
        },
      })?.compiled
    expect(
      read({ mode: 'grounded', sources: [{ id: 'a1', title: 'Brochure' }] })
        ?.grounding,
    ).toEqual({ mode: 'grounded', sources: [{ id: 'a1', title: 'Brochure' }] })
    expect(read({ mode: 'grounded', sources: [] })?.grounding.mode).toBe(
      'exploratory',
    )
    expect(read(undefined)?.grounding.mode).toBe('exploratory')
  })

  it('reads a planned post per platform, each with its date or none', () => {
    const r = ideasResults({
      ideas: {
        compileIdeas: {
          postId: 'p1',
          title: 'Water, not rooms',
          platformId: 'instagram',
          posts: [
            {
              postId: 'p1',
              title: 'Water, not rooms',
              status: 'planned',
              platformId: 'instagram',
            },
            {
              postId: 'p2',
              title: 'Water, not rooms',
              status: 'planned',
              platformId: 'linkedin',
              date: '2026-11-26',
            },
          ],
          campaignId: 'c1',
          ideas: 2,
          undoId: 'u3',
        },
        draftIdeas: {
          posts: [
            { postId: 'p3', title: 'A', platformId: 'x', publishDate: '' },
            {
              postId: 'p4',
              title: 'B',
              platformId: 'x',
              publishDate: '2026-11-27',
            },
          ],
        },
      },
    })
    expect(r?.compiled?.posts).toEqual([
      {
        postId: 'p1',
        title: 'Water, not rooms',
        platformId: 'instagram',
        date: undefined,
      },
      {
        postId: 'p2',
        title: 'Water, not rooms',
        platformId: 'linkedin',
        date: '2026-11-26',
      },
    ])
    expect(r?.drafted?.posts.map((p) => p.publishDate)).toEqual([
      undefined,
      '2026-11-27',
    ])
  })

  it('reads why an idea fits', () => {
    const r = ideasResults({
      ideas: {
        getIdea: {
          idea: { id: 'i1', title: 'The pool' },
          angle: 'The spa is in the hillside',
          fit: {
            score: 82,
            lens: 'campaign',
            criteria: [
              {
                key: 'message_fit',
                question: '…',
                weight: 3,
                level: 5,
                means: '…',
                why: 'On brief',
              },
            ],
            caps: [{ cap: 'off_brief', meaning: '…' }],
          },
          sourceAsset: { id: 'a1', title: 'Brochure' },
          analysis: { id: 'an1', gist: 'The spa carries the house' },
          posts: [
            {
              id: 'p1',
              title: 'Pool post',
              status: 'draft',
              campaign_id: 'c1',
            },
          ],
        },
      },
    })
    expect(r?.idea).toMatchObject({
      angle: 'The spa is in the hillside',
      fit: {
        score: 82,
        lens: 'campaign',
        criteria: [{ key: 'message_fit', level: 5, why: 'On brief' }],
        caps: ['off_brief'],
      },
      sourceAsset: { id: 'a1' },
      analysisGist: 'The spa carries the house',
      posts: [{ id: 'p1', status: 'draft', campaignId: 'c1' }],
    })
  })

  it('reads what a selection shares, in the card’s order, empty kinds left out', () => {
    const r = ideasResults({
      ideas: {
        ideasInCommon: {
          ideas: [
            { id: 'i1', title: 'A' },
            { id: 'i2', title: 'B' },
          ],
          terms: [{ value: 'pool', ideaIds: ['i1', 'i2'] }],
          assets: [{ value: 'a1', label: 'Brochure', ideaIds: ['i1'] }],
          campaigns: [],
        },
      },
    })
    expect(r?.common?.shared.map((s) => s.kind)).toEqual(['assets', 'terms'])
    expect(r?.common?.shared[1].values[0]).toEqual({
      value: 'pool',
      label: 'pool',
      ideaIds: ['i1', 'i2'],
    })
  })
})

describe('draftedPost', () => {
  it('reads an idea_draft_post event', () => {
    expect(
      draftedPost({
        postId: 'p1',
        title: 'A pool in the rock',
        platformId: 'instagram',
        ideaIds: ['i1'],
        usedAssetIds: ['a1'],
        grounding: {
          mode: 'grounded',
          sources: [{ id: 'a1', title: 'Brochure' }],
        },
      }),
    ).toMatchObject({
      postId: 'p1',
      title: 'A pool in the rock',
      platformId: 'instagram',
      ideaIds: ['i1'],
      grounding: {
        mode: 'grounded',
        sources: [{ id: 'a1', title: 'Brochure' }],
      },
    })
    expect(draftedPost({ title: 'no id' })).toBeNull()
  })

  it('reads what CON-481 added to each tool', () => {
    const r = ideasResults({
      ideas: {
        findIdeas: {
          total: 6,
          pileTotal: 14,
          ideas: [
            {
              id: 'i1',
              title: 'The pool',
              verdict: 'later',
              remindAt: '2026-05-01T00:00:00Z',
              plan: { platform_id: 'instagram', post_type: 'carousel' },
            },
          ],
        },
        setIdeaVerdicts: {
          done: 1,
          verdict: 'later',
          remindAt: '2026-05-01T00:00:00Z',
          ideas: [{ id: 'i1', title: 'The pool', verdict: 'later' }],
        },
        compileIdeas: {
          campaignId: 'c1',
          ideas: 2,
          posts: [{ postId: 'p1', title: 'Water', postType: 'carousel' }],
          builtFrom: [{ id: 'i1', title: 'The pool' }],
          theses: [{ title: 'Cut into the hill', points: ['warm'] }],
          grounding: { mode: 'exploratory' },
        },
        editIdea: {
          idea: { id: 'i1', title: 'A pool' },
          changed: ['title'],
          before: { title: 'The pool', plan: { platform_id: null } },
        },
        ideasInCommon: {
          ideas: [{ id: 'i1', title: 'A' }],
          theme: 'the spa',
          angle: 'Water, not rooms.',
          splits: [
            {
              field: 'platform',
              values: [{ value: 'linkedin', ideaIds: ['i1'] }],
            },
          ],
        },
        mergeIdeas: {
          idea: { id: 'k1', title: 'Kept' },
          deleted: ['d1'],
          groups: [
            { idea: { id: 'k1', title: 'Kept' }, deleted: ['d1'] },
            { idea: { id: 'k2', title: 'Also kept' }, deleted: ['d2', 'd3'] },
          ],
        },
        getIdea: {
          idea: { id: 'i1', title: 'The pool' },
          analysis: {
            id: 'an1',
            lens: { campaignId: 'c1', campaignName: 'Spring' },
          },
        },
      },
    })
    expect(r?.found?.pileTotal).toBe(14)
    expect(r?.found?.ideas[0]).toMatchObject({
      remindAt: '2026-05-01T00:00:00Z',
      plan: { platformId: 'instagram', postType: 'carousel' },
    })
    expect(r?.decidedMany).toMatchObject({
      verdict: 'later',
      remindAt: '2026-05-01T00:00:00Z',
      ideas: [{ id: 'i1' }],
    })
    expect(r?.compiled).toMatchObject({
      builtFrom: [{ id: 'i1', title: 'The pool' }],
      theses: [{ title: 'Cut into the hill', points: ['warm'] }],
      posts: [{ postType: 'carousel' }],
    })
    expect(r?.edited?.before).toEqual({
      title: 'The pool',
      note: undefined,
      plan: {
        platformId: undefined,
        postType: undefined,
        phaseId: undefined,
        targetDate: undefined,
      },
    })
    expect(r?.common).toMatchObject({
      theme: 'the spa',
      angle: 'Water, not rooms.',
      splits: [{ field: 'platform', values: [{ value: 'linkedin' }] }],
    })
    expect(r?.merged?.groups.map((g) => g.deleted)).toEqual([1, 2])
    expect(r?.idea?.lens).toEqual({ campaignId: 'c1', campaignName: 'Spring' })
  })
})
