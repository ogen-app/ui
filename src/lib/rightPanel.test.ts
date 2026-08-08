import { describe, expect, it } from 'vitest'
import {
  EMPTY_PANEL_MEMORY,
  closePanel,
  openPanel,
  resolveActivePanel,
  sanitizePanelMemory,
  togglePanel,
  type PanelMemory,
} from './rightPanel'

const memory = (m: Partial<PanelMemory> = {}): PanelMemory => ({
  ...EMPTY_PANEL_MEMORY,
  ...m,
})

describe('resolveActivePanel', () => {
  it('shows the panel remembered for the screen you are on', () => {
    const m = memory({ scoped: { post: 'postQuality' } })
    expect(resolveActivePanel(m, 'post')).toBe('postQuality')
  })

  it('never opens the rail onto a panel this screen cannot render', () => {
    // The whole reason the active panel is derived rather than stored: reload
    // on the campaign list with a post panel remembered and the naive version
    // gives you an empty 480px column.
    const m = memory({ scoped: { post: 'postQuality' } })
    expect(resolveActivePanel(m, null)).toBeNull()
    expect(resolveActivePanel(m, 'calendar')).toBeNull()
  })

  it('falls back to the assistant, which every screen can show', () => {
    const m = memory({ assistantOpen: true, scoped: { post: 'postQuality' } })
    expect(resolveActivePanel(m, null)).toBe('assistant')
    expect(resolveActivePanel(m, 'calendar')).toBe('assistant')
    // Still covered on the screen that owns it.
    expect(resolveActivePanel(m, 'post')).toBe('postQuality')
  })

  it('keeps each screen’s choice apart', () => {
    const m = memory({ scoped: { post: 'postPreview', calendar: 'notScheduled' } })
    expect(resolveActivePanel(m, 'post')).toBe('postPreview')
    expect(resolveActivePanel(m, 'calendar')).toBe('notScheduled')
  })
})

describe('openPanel', () => {
  it('files a panel under its own screen, whatever screen you opened it from', () => {
    const m = openPanel(EMPTY_PANEL_MEMORY, 'notScheduled', 'post')
    expect(m.scoped).toEqual({ calendar: 'notScheduled' })
  })

  it('clears the covering panel when the assistant is opened', () => {
    // Otherwise the assistant is filed as open underneath something still
    // covering it, and the trigger looks broken.
    const m = openPanel(memory({ scoped: { post: 'postQuality' } }), 'assistant', 'post')
    expect(resolveActivePanel(m, 'post')).toBe('assistant')
  })

  it('leaves the other screen’s choice alone when the assistant is opened', () => {
    const m = openPanel(
      memory({ scoped: { post: 'postQuality', calendar: 'notScheduled' } }),
      'assistant',
      'post',
    )
    expect(m.scoped).toEqual({ calendar: 'notScheduled' })
  })
})

describe('closePanel', () => {
  it('drops a panel back to the assistant rather than collapsing the rail', () => {
    const m = closePanel(
      memory({ assistantOpen: true, scoped: { post: 'postQuality' } }),
      'post',
    )
    expect(resolveActivePanel(m, 'post')).toBe('assistant')
  })

  it('closes the rail when the assistant is what is showing', () => {
    const m = closePanel(memory({ assistantOpen: true }), 'post')
    expect(resolveActivePanel(m, 'post')).toBeNull()
  })

  it('does nothing when nothing is showing', () => {
    const m = memory({ scoped: { calendar: 'notScheduled' } })
    expect(closePanel(m, 'post')).toEqual(m)
  })

  it('closes what is on screen, not what is remembered elsewhere', () => {
    // Assistant showing on the post screen; the calendar's choice is not the
    // one under the X, and must survive.
    const m = closePanel(
      memory({ assistantOpen: true, scoped: { calendar: 'notScheduled' } }),
      'post',
    )
    expect(m.scoped).toEqual({ calendar: 'notScheduled' })
    expect(m.assistantOpen).toBe(false)
  })
})

describe('togglePanel', () => {
  it('closes the panel that is showing and opens one that is not', () => {
    const opened = togglePanel(EMPTY_PANEL_MEMORY, 'postQuality', 'post')
    expect(resolveActivePanel(opened, 'post')).toBe('postQuality')
    const closed = togglePanel(opened, 'postQuality', 'post')
    expect(resolveActivePanel(closed, 'post')).toBeNull()
  })

  it('switches between panels on the same screen without closing the rail', () => {
    const m = togglePanel(
      memory({ scoped: { post: 'postQuality' } }),
      'postSettings',
      'post',
    )
    expect(resolveActivePanel(m, 'post')).toBe('postSettings')
  })

  it('reveals a remembered panel that is currently shadowed by nothing', () => {
    // Toggling a panel you cannot see (the assistant is up) opens it, since
    // "the one showing" is what toggle compares against.
    const m = togglePanel(
      memory({ assistantOpen: true, scoped: { post: 'postQuality' } }),
      'assistant',
      'calendar',
    )
    expect(resolveActivePanel(m, 'calendar')).toBeNull()
    expect(resolveActivePanel(m, 'post')).toBe('postQuality')
  })
})

describe('sanitizePanelMemory', () => {
  it('keeps a memory this build still understands', () => {
    const m = memory({ assistantOpen: true, scoped: { post: 'postVersions' } })
    expect(sanitizePanelMemory(m)).toEqual(m)
  })

  it('drops a panel id this build no longer has', () => {
    // A renamed or retired panel would otherwise reopen the rail onto an id
    // nothing renders — the failure the whole model exists to prevent.
    const m = sanitizePanelMemory({
      assistantOpen: false,
      scoped: { post: 'postVibes', calendar: 'notScheduled' },
    })
    expect(m.scoped).toEqual({ calendar: 'notScheduled' })
  })

  it('drops a panel filed under a screen that does not own it', () => {
    const m = sanitizePanelMemory({ scoped: { calendar: 'postQuality' } })
    expect(m.scoped).toEqual({})
  })

  it('survives a blob that is not a memory at all', () => {
    expect(sanitizePanelMemory(undefined)).toEqual(EMPTY_PANEL_MEMORY)
    expect(sanitizePanelMemory('assistant')).toEqual(EMPTY_PANEL_MEMORY)
    expect(sanitizePanelMemory({ assistantOpen: 'yes' })).toEqual(EMPTY_PANEL_MEMORY)
  })
})
