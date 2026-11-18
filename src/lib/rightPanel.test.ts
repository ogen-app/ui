import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PANEL_MEMORY,
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
  })

  it('falls back to the assistant, which every screen can show', () => {
    const m = memory({ assistantOpen: true, scoped: { post: 'postQuality' } })
    expect(resolveActivePanel(m, null)).toBe('assistant')
    // Still covered on the screen that owns it.
    expect(resolveActivePanel(m, 'post')).toBe('postQuality')
  })
})

describe('openPanel', () => {
  it('files a panel under its own screen, whatever screen you opened it from', () => {
    const m = openPanel(EMPTY_PANEL_MEMORY, 'postQuality', null)
    expect(m.scoped).toEqual({ post: 'postQuality' })
  })

  it('clears the covering panel when the assistant is opened', () => {
    // Otherwise the assistant is filed as open underneath something still
    // covering it, and the trigger looks broken.
    const m = openPanel(
      memory({ scoped: { post: 'postQuality' } }),
      'assistant',
      'post',
    )
    expect(resolveActivePanel(m, 'post')).toBe('assistant')
  })

  it('leaves the post screen’s choice alone when the assistant is opened elsewhere', () => {
    const m = openPanel(
      memory({ scoped: { post: 'postQuality' } }),
      'assistant',
      null,
    )
    expect(m.scoped).toEqual({ post: 'postQuality' })
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
    const m = memory({ scoped: { post: 'postQuality' } })
    expect(closePanel(m, null)).toEqual(m)
  })

  it('closes what is on screen, not what is remembered elsewhere', () => {
    // Assistant showing off the post screen; the post's choice is not the
    // one under the X, and must survive.
    const m = closePanel(
      memory({ assistantOpen: true, scoped: { post: 'postQuality' } }),
      null,
    )
    expect(m.scoped).toEqual({ post: 'postQuality' })
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
      null,
    )
    expect(resolveActivePanel(m, null)).toBeNull()
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
      scoped: { post: 'postVibes' },
    })
    expect(m.scoped).toEqual({})
  })

  it('forgets the calendar panels the rail used to host', () => {
    // They are the calendar's own drawer now (`calendarDrawer`), so last
    // week's `calendar` entry must not survive into a scope that is gone.
    const m = sanitizePanelMemory({
      assistantOpen: true,
      scoped: { post: 'postPreview', calendar: 'notScheduled' },
    })
    expect(m.scoped).toEqual({ post: 'postPreview' })
  })

  it('drops a panel filed under a screen that does not own it', () => {
    const m = sanitizePanelMemory({ scoped: { calendar: 'postQuality' } })
    expect(m.scoped).toEqual({})
  })

  it('treats an unreadable blob as a first run', () => {
    expect(sanitizePanelMemory(undefined)).toEqual(DEFAULT_PANEL_MEMORY)
    expect(sanitizePanelMemory('assistant')).toEqual(DEFAULT_PANEL_MEMORY)
  })

  it('keeps the rail shut for someone who shut it', () => {
    // The first-run default must not resurrect itself on every reload.
    expect(sanitizePanelMemory({ assistantOpen: false, scoped: {} })).toEqual(
      EMPTY_PANEL_MEMORY,
    )
    expect(sanitizePanelMemory({ assistantOpen: 'yes' })).toEqual(
      EMPTY_PANEL_MEMORY,
    )
  })
})
