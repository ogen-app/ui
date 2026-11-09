import { beforeEach, describe, expect, it } from 'vitest'
import type { UIAction } from '@/lib/assistantUiActions'
import { useViewContextStore } from './viewContextStore'

const select: UIAction = {
  type: 'select',
  screen: 'ideas',
  selection: { kind: 'idea', ids: ['i1'] },
}

beforeEach(() => {
  useViewContextStore.setState({
    location: { screen: null },
    request: null,
    dismissed: false,
  })
})

describe('viewContextStore', () => {
  it('drops a request no list took up once the user leaves for another screen', () => {
    const store = useViewContextStore.getState()
    store.setLocation({ screen: 'campaign.calendar' })
    store.ask(select)
    useViewContextStore.getState().setLocation({ screen: 'assets' })
    expect(useViewContextStore.getState().request).toBeNull()
  })

  it('keeps a request on the way to the screen it is for', () => {
    useViewContextStore.getState().ask(select)
    useViewContextStore.getState().setLocation({ screen: 'ideas' })
    expect(useViewContextStore.getState().request?.action).toEqual(select)
  })

  it('lifts a dismissed chip on a new screen', () => {
    useViewContextStore.getState().dismiss()
    useViewContextStore.getState().setLocation({ screen: 'asset' })
    expect(useViewContextStore.getState().dismissed).toBe(false)
  })
})
