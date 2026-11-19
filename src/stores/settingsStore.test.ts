import { beforeEach, describe, expect, it } from 'vitest'
import { selectActivePanel, useSettingsStore } from './settingsStore'

const active = () => selectActivePanel(useSettingsStore.getState())

describe('the right rail', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetAllSettings()
  })
  const rail = () => useSettingsStore.getState()

  it('shows the assistant on first run', () => {
    expect(active()).toBe('assistant')
  })

  it('toggles: Ask Ogen and `]` close it, and open it again', () => {
    rail().toggleRightPanel('assistant')
    expect(active()).toBeNull()
    rail().toggleRightPanel('assistant')
    expect(active()).toBe('assistant')
  })

  it('never closes from a button that means open', () => {
    rail().openRightPanel('assistant')
    rail().openRightPanel('assistant')
    expect(active()).toBe('assistant')
  })

  it('closes from its own X, and the toggle brings it back', () => {
    rail().closeRightPanel()
    expect(active()).toBeNull()
    rail().toggleRightPanel('assistant')
    expect(active()).toBe('assistant')
  })
})

describe('rehydrating the rail', () => {
  const rehydrate = (persisted: unknown) => {
    const { merge } = useSettingsStore.persist.getOptions()
    if (!merge) throw new Error('settingsStore persists without a merge')
    return merge(persisted, useSettingsStore.getState())
  }

  it('opens the assistant when nothing was stored', () => {
    expect(rehydrate(undefined).assistantOpen).toBe(true)
    expect(rehydrate({}).assistantOpen).toBe(true)
  })

  it('keeps a stored choice', () => {
    expect(rehydrate({ assistantOpen: false }).assistantOpen).toBe(false)
    expect(rehydrate({ assistantOpen: true }).assistantOpen).toBe(true)
  })

  // The shape stored while the rail also hosted the post editor's panels.
  it('reads the assistant out of the old panel memory', () => {
    const closed = rehydrate({
      panelMemory: { assistantOpen: false, scoped: { post: 'postQuality' } },
    })
    expect(closed.assistantOpen).toBe(false)
    const open = rehydrate({
      panelMemory: { assistantOpen: true, scoped: { post: 'postQuality' } },
    })
    expect(open.assistantOpen).toBe(true)
  })

  it('brings a rail put away with `]` back closed', () => {
    const m = rehydrate({
      panelMemory: { assistantOpen: true, scoped: {} },
      rightRailHidden: true,
    })
    expect(m.assistantOpen).toBe(false)
  })

  it('treats an unreadable old memory as never seen', () => {
    expect(rehydrate({ panelMemory: 'assistant' }).assistantOpen).toBe(true)
  })

  it('does not carry the old keys into state', () => {
    const m = rehydrate({
      panelMemory: { assistantOpen: true, scoped: {} },
      rightRailHidden: false,
    })
    expect(m).not.toHaveProperty('panelMemory')
    expect(m).not.toHaveProperty('rightRailHidden')
  })
})

describe('the calendar drawer', () => {
  beforeEach(() => {
    useSettingsStore.setState({ assistantOpen: true, calendarDrawer: null })
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
    useSettingsStore.getState().toggleRightPanel('assistant')
    expect(drawer()).toBe('notScheduled')
  })
})
