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
