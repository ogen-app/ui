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
export type Hotkey =
  // A screen's own: the post editor's previous and next.
  | 'ArrowLeft'
  | 'ArrowRight'
  // The app's (CON-394, `hooks/useAppShortcuts`): the left menu, the right
  // panel, the assistant, the cheat sheet, and "g then a letter".
  | '['
  | ']'
  | 'o'
  | '?'
  | 'g'
  // The filter sentence's "add a detail" — bound by `FilterSentence` itself,
  // listed here so nothing else claims it.
  | '/'

/** The second key of "g then a letter" (CON-394): where it goes. */
export type GoKey = 'i' | 'a' | 'c' | 'n' | 'f' | 's' | 't' | 'p' | 'r'

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
  // Mid-IME-composition arrows move the candidate selection. The target check
  // below covers this in practice (composition happens in editable elements),
  // but the event says so directly, and the direct answer is the reliable one.
  if (event.isComposing) return true
  // A shortcut is the unmodified key. Modifiers belong to the browser and the
  // OS — Cmd+← is Back on a Mac, and stealing it would be a plain bug.
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
    return true
  }
  return isTargetBusy(event.target)
}

/**
 * Whether an app-wide shortcut (CON-394) must leave this keypress alone.
 *
 * The rule above, with the modifiers read per key rather than all refused:
 *
 * - **⌘ / Meta never.** Those are the browser's and the OS's.
 * - **`[` and `]` on every layout.** German, Nordic and Swiss keyboards type
 *   them with Alt or AltGr — and AltGr on Windows reports Ctrl+Alt — so the
 *   key the layout produced (`event.key`) is what counts, whatever made it.
 *   A lone Ctrl is still somebody else's.
 * - **`?` is Shift+/** on most layouts, so Shift is how it arrives; AltGr is
 *   allowed for the layouts that put it there.
 * - **Every other key unmodified.** A shifted letter is a different key
 *   (`O`, not `o`) and is not ours.
 */
export function shouldIgnoreAppShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing) return true
  if (event.metaKey) return true
  const key = event.key
  if (key === '[' || key === ']' || key === '?') {
    if (event.ctrlKey && !event.altKey) return true
  } else if (event.ctrlKey || event.altKey || event.shiftKey) {
    return true
  }
  return isTargetBusy(event.target)
}
