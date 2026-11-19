import { beforeEach, describe, expect, it } from 'vitest'
import { EMPTY_PANEL_MEMORY } from '@/lib/rightPanel'
import { selectActivePanel, useSettingsStore } from './settingsStore'

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
    useSettingsStore.setState({ scope: 'post' })
    useSettingsStore.getState().openRightPanel('postQuality')
    toggle()
    expect(active()).toBeNull()
    expect(useSettingsStore.getState().rightRailHidden).toBe(true)
    toggle()
    expect(active()).toBe('postQuality')
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

describe('the calendar drawer', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      scope: null,
      rightRailHidden: false,
      panelMemory: { assistantOpen: true, helpOpen: false, scoped: {} },
      calendarDrawer: null,
    })
  })
  const drawer = () => useSettingsStore.getState().calendarDrawer

  it('opens beside the assistant rather than in its place', () => {
    useSettingsStore.getState().toggleCalendarDrawer('notScheduled')
    expect(drawer()).toBe('notScheduled')
    expect(selectActivePanel(useSettingsStore.getState())).toBe('assistant')
  })

  it('switches panels, and closes on the one already showing', () => {
    const { toggleCalendarDrawer } = useSettingsStore.getState()
    toggleCalendarDrawer('notScheduled')
    toggleCalendarDrawer('calendarSettings')
    expect(drawer()).toBe('calendarSettings')
    toggleCalendarDrawer('calendarSettings')
    expect(drawer()).toBeNull()
  })

  it('stays open when asked to open what is showing', () => {
    useSettingsStore.getState().openCalendarDrawer('notScheduled')
    useSettingsStore.getState().openCalendarDrawer('notScheduled')
    expect(drawer()).toBe('notScheduled')
  })

  it('is left alone by the rail', () => {
    useSettingsStore.getState().openCalendarDrawer('notScheduled')
    useSettingsStore.getState().closeRightPanel()
    useSettingsStore.getState().toggleRightRail()
    expect(drawer()).toBe('notScheduled')
  })
})
