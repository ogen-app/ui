/**
 * The rules every keyboard shortcut in the app shares: which keys may be
 * bound, and when a keypress belongs to the app rather than to whatever the
 * user is already doing.
 *
 * The hard part of a global shortcut is not the binding, it is knowing when to
 * stay out of the way. A key listener on `window` hears every keystroke in the
 * app, including the ones aimed at a textarea, a menu or a dialog — and a
 * shortcut that fires while someone is typing is worse than no shortcut at
 * all. All of that judgement lives here, in one function, so a new binding
 * inherits it instead of re-deriving it.
 */

/**
 * Every key the app binds, written as `KeyboardEvent.key`.
 *
 * A closed union rather than a free string. A shortcut is a claim on a key
 * across the whole app, and the thing that goes wrong is two screens claiming
 * the same one for different jobs without either author knowing. This list is
 * where that becomes visible: adding a binding means adding it here first.
 */
export type Hotkey = 'ArrowLeft' | 'ArrowRight'

/**
 * What a screen binds. An **absent or undefined** handler is not the same as a
 * no-op one: the key stays unclaimed and keeps its native behaviour, which is
 * how a screen says "there is nothing in that direction" without swallowing
 * the keypress.
 */
export type HotkeyBindings = Partial<Record<Hotkey, (() => void) | undefined>>

/**
 * Somewhere the keypress is already spoken for.
 *
 * Matched with `closest`, so being *inside* one counts — a button inside a
 * dialog is the dialog's, not the page's. The roles are the ones that trap
 * focus or steer with the arrow keys themselves (Radix dialogs, menus,
 * comboboxes, tab strips): their keyboard handling is the reason they work,
 * and a page shortcut firing behind an open modal would act on a screen the
 * user can't even see.
 *
 * Both the attribute and the role are listed for text entry, because a rich
 * editor is neither a `<textarea>` nor reliably one of the two: the post body
 * is a ProseMirror `div` that happens to carry both, and something else may
 * carry only one.
 */
const ALREADY_SPOKEN_FOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="textbox"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="combobox"]',
  '[role="tablist"]',
  '[role="grid"]',
].join(',')

/** Whether the keypress landed somewhere that owns it already. */
export function isTargetBusy(target: EventTarget | null): boolean {
  // Not an element — `window`, `document`, or a detached target. Nothing to
  // ask, so nothing owns it.
  if (!(target instanceof Element)) return false
  return target.closest(ALREADY_SPOKEN_FOR) !== null
}

/** Whether this keypress must be left alone, whatever is bound to it. */
export function shouldIgnoreHotkey(event: KeyboardEvent): boolean {
  // Someone nearer the target has handled it. Their claim is the specific
  // one, so it wins.
  if (event.defaultPrevented) return true
  // Held down. Every binding the app has moves you to a different document —
  // a discrete step, not something to scrub through at the OS repeat rate,
  // which on a held arrow key is thirty navigations a second.
  if (event.repeat) return true
  // A shortcut is the unmodified key. Modifiers belong to the browser and the
  // OS — Cmd+← is Back on a Mac, and stealing it would be a plain bug.
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return true
  }
  return isTargetBusy(event.target)
}
