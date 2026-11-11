import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useViewContextStore } from '@/stores/viewContextStore'
import { VoicesSection } from './VoicesSection'
import type { BrandVoice } from './types'

function voice(id: string, name: string): BrandVoice {
  return {
    id,
    name,
    whenToUse: '',
    summary: '',
    isDefault: false,
    usage: { drafts: 0, published: 0 },
    samples: [],
    rules: {
      emoji: 'never',
      formality: 'neutral',
      person: 'we',
      length: 'medium',
      opening: '',
      closing: '',
    },
    channelNotes: {},
    origin: { kind: 'blank' },
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

const VOICES = [voice('v1', 'House voice'), voice('v2', 'Owner’s letter')]

describe('ticking a Foundation library (CON-472)', () => {
  beforeEach(() => {
    useViewContextStore.setState({ request: null, page: null })
  })

  it('ticks an entry beside its card, says how many and hands them to the assistant', () => {
    render(<VoicesSection voices={VOICES} onOpen={() => {}} />)
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select “House voice”' }),
    )
    expect(screen.getByText('1 voice selected')).toBeTruthy()
    expect(useViewContextStore.getState().page?.selection).toEqual({
      kind: 'voice',
      ids: ['v1'],
      count: 1,
    })
    fireEvent.click(screen.getByText('CLEAR'))
    expect(screen.queryByText('1 voice selected')).toBeNull()
  })

  it('ticks what the assistant’s select names', () => {
    render(<VoicesSection voices={VOICES} onOpen={() => {}} />)
    act(() =>
      useViewContextStore.getState().ask({
        type: 'select',
        screen: 'foundation.voices',
        selection: { kind: 'voice', ids: ['v1', 'v2'] },
      }),
    )
    expect(screen.getByText('2 voices selected')).toBeTruthy()
    expect(useViewContextStore.getState().request).toBeNull()
  })

  it('leaves a select for another kind to its own list', () => {
    render(<VoicesSection voices={VOICES} onOpen={() => {}} />)
    act(() =>
      useViewContextStore.getState().ask({
        type: 'select',
        screen: 'foundation.audiences',
        selection: { kind: 'audience', ids: ['a1'] },
      }),
    )
    expect(screen.queryByText(/selected/)).toBeNull()
  })
})
