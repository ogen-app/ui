import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PANEL_MEMORY } from '@/lib/rightPanel'
import { selectActivePanel, useSettingsStore } from './settingsStore'

/**
 * The panel context — which screen is under the right sidebar, and which
 * campaign it is about.
 *
 * The campaign is deliberately sticky, so a panel fades out with its data
 * instead of vanishing mid-transition when the screen unmounts. What that
 * stickiness must *not* survive is the next screen: the workspace calendar
 * claims the same `calendar` scope with no campaign at all, and inheriting the
 * last one would have its not-scheduled panel list one campaign's strays under
 * a grid showing every campaign's.
 */
beforeEach(() => {
  useSettingsStore.setState({ scope: null, campaignId: null })
})

describe('setPanelScope', () => {
  const set = useSettingsStore.getState().setPanelScope

  it('keeps the campaign while nothing is claiming the scope', () => {
    set('calendar', 'c-1')
    set(null)
    expect(useSettingsStore.getState()).toMatchObject({
      scope: null,
      campaignId: 'c-1',
    })
  })

  it('clears the campaign when a screen claims the scope without one', () => {
    set('calendar', 'c-1')
    set('calendar')
    expect(useSettingsStore.getState()).toMatchObject({
      scope: 'calendar',
      campaignId: null,
    })
  })

  it('replaces it when the next screen names a different campaign', () => {
    set('calendar', 'c-1')
    set('post', 'c-2')
    expect(useSettingsStore.getState().campaignId).toBe('c-2')
  })
})

describe('toggleRightRail', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      scope: null,
      rightRailHidden: false,
      panelMemory: EMPTY_PANEL_MEMORY,
    })
  })
  const active = () => selectActivePanel(useSettingsStore.getState())
  const toggle = () => useSettingsStore.getState().toggleRightRail()

  it('opens the assistant on an empty rail', () => {
    toggle()
    expect(active()).toBe('assistant')
  })

  it('hides an open rail and brings back what it showed', () => {
    useSettingsStore.setState({ scope: 'calendar' })
    useSettingsStore.getState().openRightPanel('calendarSettings')
    toggle()
    expect(active()).toBeNull()
    expect(useSettingsStore.getState().rightRailHidden).toBe(true)
    toggle()
    expect(active()).toBe('calendarSettings')
  })

  it('shows the rail again when a panel is opened while hidden', () => {
    toggle()
    toggle()
    useSettingsStore.getState().toggleRightPanel('assistant')
    expect(active()).toBe('assistant')
  })

  it('closes nothing it is not showing', () => {
    toggle()
    toggle()
    useSettingsStore.getState().closeRightPanel()
    toggle()
    expect(active()).toBe('assistant')
  })
})
