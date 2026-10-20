import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { shouldIgnoreAppShortcut } from '@/lib/hotkeys'
import { campaignIdOf, goTarget, GO_TIMEOUT_MS } from '@/lib/shortcuts'
import { useSettingsStore } from '@/stores/settingsStore'
import { useShortcutsStore } from '@/stores/shortcutsStore'

/** The assistant's composer, marked by `AssistantComposer`. */
const COMPOSER = '[data-assistant-composer]'

/**
 * Puts the cursor in the assistant's composer once the rail has drawn it —
 * two frames, because opening the rail is a state change and the composer
 * mounts on the render after.
 */
function focusComposer() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      document.querySelector<HTMLTextAreaElement>(COMPOSER)?.focus(),
    ),
  )
}

/**
 * The app's keyboard shortcuts (CON-394), for as long as a session is open:
 *
 * - `[` toggles the left menu (⌘B still does);
 * - `]` puts the right rail away, or brings back what it was showing;
 * - `o` opens the assistant with the cursor in its composer;
 * - `?` opens the cheat sheet;
 * - `g` then a letter goes to a module — inside a campaign, to its own
 *   sections (`lib/shortcuts`). The letter has a second; anything else, or
 *   the pause, cancels.
 *
 * When to stay quiet is `shouldIgnoreAppShortcut`'s: never while typing, in a
 * menu or a dialog, or with ⌘ held. `/` is the filter sentence's own.
 */
export function useAppShortcuts() {
  const navigate = useNavigate()
  /** The pending `g`, as its timeout — null when none is waiting. */
  const pending = useRef<number | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreAppShortcut(event)) return
      const key = event.key

      if (pending.current !== null) {
        window.clearTimeout(pending.current)
        pending.current = null
        const target = goTarget(key, campaignIdOf(window.location.pathname))
        if (!target) return
        event.preventDefault()
        void navigate(target as Parameters<typeof navigate>[0])
        return
      }

      const settings = useSettingsStore.getState()
      switch (key) {
        case 'g':
          event.preventDefault()
          pending.current = window.setTimeout(() => {
            pending.current = null
          }, GO_TIMEOUT_MS)
          return
        case '[':
          event.preventDefault()
          settings.toggleSidebar()
          return
        case ']':
          event.preventDefault()
          settings.toggleRightRail()
          return
        case 'o':
          event.preventDefault()
          settings.openRightPanel('assistant')
          focusComposer()
          return
        case '?':
          event.preventDefault()
          useShortcutsStore.getState().setOpen(true)
          return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (pending.current !== null) window.clearTimeout(pending.current)
    }
  }, [navigate])
}
