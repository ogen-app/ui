import { afterEach, describe, expect, it } from 'vitest'
import {
  isTargetBusy,
  shouldIgnoreAppShortcut,
  shouldIgnoreHotkey,
} from './hotkeys'

/**
 * The events are dispatched rather than constructed, because the two things
 * under test — `target` and `defaultPrevented` — only exist on an event that
 * has actually travelled through the DOM.
 */
function press(el: Element, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: 'ArrowLeft',
    bubbles: true,
    cancelable: true,
    ...init,
  })
  el.dispatchEvent(event)
  return event
}

function mount(html: string): Element {
  document.body.innerHTML = html
  return document.body.firstElementChild!
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isTargetBusy', () => {
  it('leaves the keypress alone while the user is typing', () => {
    for (const html of [
      '<input />',
      '<textarea></textarea>',
      '<select></select>',
      '<div contenteditable="true"></div>',
      // The post body: a ProseMirror editor is a div, not a textarea.
      '<div role="textbox" contenteditable="true"></div>',
    ]) {
      expect(isTargetBusy(mount(html))).toBe(true)
    }
  })

  it('leaves the arrow-driven widgets to steer themselves', () => {
    for (const role of [
      'dialog',
      'menu',
      'listbox',
      'combobox',
      'tablist',
      'grid',
    ]) {
      expect(isTargetBusy(mount(`<div role="${role}"></div>`))).toBe(true)
    }
  })

  it('counts a target *inside* something that owns the key', () => {
    // The button is not itself a typing target, but the dialog around it
    // traps focus — the keypress is the dialog's.
    const dialog = mount('<div role="dialog"><button></button></div>')
    expect(isTargetBusy(dialog.querySelector('button'))).toBe(true)
  })

  it('lets an ordinary control through', () => {
    const page = mount('<div><button></button><a href="#"></a></div>')
    expect(isTargetBusy(page.querySelector('button'))).toBe(false)
    expect(isTargetBusy(page.querySelector('a'))).toBe(false)
  })

  it('claims nothing when there is no element to ask', () => {
    expect(isTargetBusy(null)).toBe(false)
    expect(isTargetBusy(window)).toBe(false)
  })
})

describe('shouldIgnoreHotkey', () => {
  it('takes an ordinary keypress on the page', () => {
    expect(shouldIgnoreHotkey(press(mount('<button></button>')))).toBe(false)
  })

  it('yields to whoever handled it first', () => {
    const el = mount('<button></button>')
    el.addEventListener('keydown', (e) => e.preventDefault())
    expect(shouldIgnoreHotkey(press(el))).toBe(true)
  })

  it('ignores a held key', () => {
    expect(
      shouldIgnoreHotkey(press(mount('<button></button>'), { repeat: true })),
    ).toBe(true)
  })

  it('leaves modified keys to the browser', () => {
    const el = mount('<button></button>')
    for (const modifier of [
      'metaKey',
      'ctrlKey',
      'altKey',
      'shiftKey',
    ] as const) {
      expect(shouldIgnoreHotkey(press(el, { [modifier]: true }))).toBe(true)
    }
  })

  it('ignores a keypress aimed at a text field', () => {
    expect(shouldIgnoreHotkey(press(mount('<textarea></textarea>')))).toBe(true)
  })
})

describe('shouldIgnoreAppShortcut', () => {
  const at = (init: KeyboardEventInit, html = '<div tabindex="0"></div>') => {
    let ignored: boolean | undefined
    const el = mount(html)
    el.addEventListener('keydown', (e) => {
      ignored = shouldIgnoreAppShortcut(e as KeyboardEvent)
    })
    press(el, init)
    return ignored
  }

  it('takes a bare letter, and nothing with a modifier on it', () => {
    expect(at({ key: 'g' })).toBe(false)
    for (const mod of ['metaKey', 'ctrlKey', 'altKey', 'shiftKey'])
      expect(at({ key: 'g', [mod]: true })).toBe(true)
  })

  it('takes `?`, which needs Shift on most layouts', () => {
    expect(at({ key: '?', shiftKey: true })).toBe(false)
  })

  it('takes `[` and `]` typed with AltGr, never with ⌘ or Ctrl alone', () => {
    // AltGr arrives as Ctrl + Alt on Windows and as Alt on a Mac.
    expect(at({ key: '[', altKey: true })).toBe(false)
    expect(at({ key: ']', ctrlKey: true, altKey: true })).toBe(false)
    expect(at({ key: '[', metaKey: true })).toBe(true)
    expect(at({ key: ']', ctrlKey: true })).toBe(true)
  })

  it('stays out of a field and ignores a held key', () => {
    expect(at({ key: 'g' }, '<input />')).toBe(true)
    expect(at({ key: 'g', repeat: true })).toBe(true)
  })
})
