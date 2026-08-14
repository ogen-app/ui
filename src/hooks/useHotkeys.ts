import { useEffect, useRef } from 'react'
import { shouldIgnoreHotkey, type HotkeyBindings } from '@/lib/hotkeys'

/**
 * Binds keyboard shortcuts for as long as the calling screen is mounted.
 *
 * The listener sits on `window` rather than on a container, because the
 * shortcut belongs to the *screen* and not to any one element on it: the user
 * should not have to have clicked the right thing first. `lib/hotkeys` decides
 * when to stay quiet — see `shouldIgnoreHotkey`.
 *
 * Mount this on one screen at a time. Two mounted at once would both fire, and
 * the app's routes are exclusive enough that this has never had to be a
 * priority system.
 *
 * ```ts
 * useHotkeys({
 *   ArrowLeft: previous ? () => go(previous) : undefined,
 *   ArrowRight: next ? () => go(next) : undefined,
 * })
 * ```
 */
export function useHotkeys(bindings: HotkeyBindings): void {
  /**
   * The bindings as of the last render. Held in a ref so the listener is
   * attached once: callers build their handlers inline, so a fresh object
   * arrives every render and a dependency on it would rip the listener off
   * `window` and put it back between every keystroke.
   */
  const latest = useRef(bindings)
  useEffect(() => {
    latest.current = bindings
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreHotkey(event)) return
      const handler = latest.current[event.key as keyof HotkeyBindings]
      // Unbound, or bound to nothing right now — the screen is saying there is
      // nothing in that direction, so the key keeps its native behaviour.
      if (!handler) return
      event.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
