import { describe, expect, it } from 'vitest'
import { i18next } from '@/i18n'
import { stepDetail, stepLabel } from './assistantTools'
import type { AssistantStep } from '@/types/assistant'

const t = i18next.t

const step = (changes: Partial<AssistantStep>): AssistantStep => ({
  id: 's1',
  kind: 'tool',
  tool: 'deleteIdeas',
  startedAt: 0,
  endedAt: 10,
  ...changes,
})

describe('a failed tool step', () => {
  it('keeps the tense of what it tried, and says it didn’t go through', () => {
    const done = step({})
    const failed = step({ failed: true })
    expect(stepLabel(t, failed)).not.toBe(stepLabel(t, done))
    expect(stepLabel(t, failed)).toBe(stepLabel(t, step({ endedAt: null })))
    expect(stepDetail(t, failed)).toBe('didn’t go through')
  })
})

describe('a step that said what it read (CON-476)', () => {
  it('words the detail once the step is done', () => {
    expect(
      stepLabel(
        t,
        step({
          tool: 'askAssets',
          detail: { subject: 'Villa Aurora brochure', passages: 3 },
        }),
      ),
    ).toBe('Searched Villa Aurora brochure · 3 passages')
    expect(
      stepLabel(t, step({ tool: 'readAnalysis', detail: { workspace: true } })),
    ).toBe('Read the analysis · workspace lens')
    expect(
      stepLabel(
        t,
        step({ tool: 'readAnalysis', detail: { subject: 'Spring reopening' } }),
      ),
    ).toBe('Read the analysis · Spring reopening’s lens')
    expect(
      stepLabel(
        t,
        step({ tool: 'compareAssets', detail: { analyses: 2, passages: 14 } }),
      ),
    ).toBe('Read 2 analyses and 14 passages')
    expect(
      stepLabel(
        t,
        step({
          tool: 'createCampaignFromAssets',
          detail: { subject: 'Spring reopening', sources: 4 },
        }),
      ),
    ).toBe('Created Spring reopening · attached 4 sources')
  })

  it('keeps the tool’s own label while running, failed, or without words for it', () => {
    const detail = { subject: 'Brochure', passages: 3 }
    expect(
      stepLabel(t, step({ tool: 'askAssets', detail, endedAt: null })),
    ).toBe('Reading the assets')
    expect(
      stepLabel(t, step({ tool: 'askAssets', detail, failed: true })),
    ).toBe('Reading the assets')
    expect(stepLabel(t, step({ tool: 'findIdeas', detail }))).toBe(
      stepLabel(t, step({ tool: 'findIdeas' })),
    )
    expect(stepLabel(t, step({ tool: 'readAssetsState' }))).toBe(
      'Read the bank’s state',
    )
  })
})

describe('the workspace pack’s steps (CON-480)', () => {
  it('name what they read', () => {
    expect(
      stepLabel(
        t,
        step({
          tool: 'activityReport',
          detail: { subject: '2026-04-13 – 2026-04-19' },
        }),
      ),
    ).toBe('Read the activity for Apr 13 – Apr 19')
    expect(
      stepLabel(
        t,
        step({ tool: 'weeklyDigest', detail: { subject: '2026-04-13' } }),
      ),
    ).toBe('Read the week of Apr 13')
    expect(
      stepLabel(
        t,
        step({ tool: 'postHistory', detail: { subject: 'Easter brunch' } }),
      ),
    ).toBe('Read the history of Easter brunch')
    expect(stepLabel(t, step({ tool: 'setAutoPublish', endedAt: null }))).toBe(
      'Changing auto-publish',
    )
  })
})
