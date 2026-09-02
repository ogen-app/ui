/**
 * The right sidebar's panel model: which panels exist, which screen each one
 * belongs to, and how a remembered choice becomes the panel on screen.
 *
 * Split out of `settingsStore` because the resolution rule *is* the design, and
 * it is worth reading — and testing — without a store or a router around it.
 */

/** A panel that belongs to one screen and can only render while you are on it. */
export type ScopedPanel =
  | 'calendarSettings'
  | 'notScheduled'
  | 'postSettings'
  | 'postPreview'
  | 'postQuality'
  | 'postVersions'

/** Content shown in the right sidebar. Only one panel is on screen at a time. */
export type RightPanel = 'assistant' | ScopedPanel

/** The screen a scoped panel needs underneath it in order to render. */
export type PanelScope = 'calendar' | 'post'

/**
 * Which screen each scoped panel belongs to.
 *
 * Exhaustive by construction: a new panel does not type-check until it says
 * where it lives. That is what stops a panel being remembered somewhere it can
 * never be shown.
 */
export const PANEL_SCOPE: Record<ScopedPanel, PanelScope> = {
  calendarSettings: 'calendar',
  notScheduled: 'calendar',
  postSettings: 'post',
  postPreview: 'post',
  postQuality: 'post',
  postVersions: 'post',
}

const SCOPED_PANELS = Object.keys(PANEL_SCOPE) as ScopedPanel[]

/**
 * What the sidebar remembers between visits. This is the only part of the
 * panel state that reaches localStorage.
 *
 * Deliberately *not* "the panel that was open": that is a fact about one
 * screen, and restoring it onto whichever screen you happen to reload on is
 * how you end up staring at an empty rail. This is one remembered choice per
 * screen, and what you see is derived from it by `resolveActivePanel`.
 */
export type PanelMemory = {
  /**
   * The assistant is the rail's floor rather than a seventh panel: every other
   * panel is an overlay on top of it, and closing an overlay drops back here
   * instead of collapsing the rail. It is also the only panel available on
   * every screen, which makes it the fallback that keeps the rule total.
   */
  assistantOpen: boolean
  /** Screen -> the panel last chosen there. */
  scoped: Partial<Record<PanelScope, ScopedPanel>>
}

/** Nothing open anywhere. The floor of the model, and what closing everything reaches. */
export const EMPTY_PANEL_MEMORY: PanelMemory = {
  assistantOpen: false,
  scoped: {},
}

/**
 * What someone who has never touched the rail gets: the assistant, open.
 *
 * The assistant is the product, not a utility drawer — a first run that hides
 * it behind a small mark in the corner buries the thing the app is for. It
 * stays a default rather than a rule: close it once and the memory holds that
 * from then on, everywhere.
 */
export const DEFAULT_PANEL_MEMORY: PanelMemory = {
  assistantOpen: true,
  scoped: {},
}

/**
 * The panel on screen: the most specific thing the current screen can actually
 * serve, falling back to the assistant, falling back to closed.
 *
 * Two properties come out of this and they are the whole point:
 *
 * 1. **The rail can never open onto nothing.** `postQuality` remembered while
 *    you are on the campaign list resolves to the assistant, or to closed —
 *    never to a 480px column hosting an empty portal.
 * 2. **Navigation cannot rewrite memory.** Moving between screens only changes
 *    `scope`, which is an argument here, not state that gets saved. Memory is
 *    written by clicks alone, so leaving a screen and coming back is a no-op
 *    rather than something that has to be carefully undone.
 */
export function resolveActivePanel(
  memory: PanelMemory,
  scope: PanelScope | null,
): RightPanel | null {
  const scoped = scope ? memory.scoped[scope] : undefined
  if (scoped) return scoped
  return memory.assistantOpen ? 'assistant' : null
}

function forget(
  scoped: PanelMemory['scoped'],
  scope: PanelScope,
): PanelMemory['scoped'] {
  const { [scope]: _dropped, ...rest } = scoped
  return rest
}

/**
 * Remember `panel` as the choice for its screen, and put it on screen now.
 *
 * Opening the assistant also clears the current screen's overlay. Without that,
 * "open the assistant" would record it as open *underneath* a panel still
 * covering it, and the button would look broken. Only the current screen's
 * choice is cleared — the other one belongs to a screen you are not on, and
 * forgetting it here would throw away a choice made somewhere else.
 */
export function openPanel(
  memory: PanelMemory,
  panel: RightPanel,
  scope: PanelScope | null,
): PanelMemory {
  if (panel === 'assistant') {
    return {
      assistantOpen: true,
      scoped: scope ? forget(memory.scoped, scope) : memory.scoped,
    }
  }
  return {
    ...memory,
    scoped: { ...memory.scoped, [PANEL_SCOPE[panel]]: panel },
  }
}

/**
 * Close whatever is on screen. An overlay drops back to the assistant; the
 * assistant itself closes the rail. One X, one level at a time.
 */
export function closePanel(
  memory: PanelMemory,
  scope: PanelScope | null,
): PanelMemory {
  const active = resolveActivePanel(memory, scope)
  if (active === null) return memory
  if (active === 'assistant') return { ...memory, assistantOpen: false }
  return { ...memory, scoped: forget(memory.scoped, PANEL_SCOPE[active]) }
}

/** Open the panel, or close it if it is the one already showing. */
export function togglePanel(
  memory: PanelMemory,
  panel: RightPanel,
  scope: PanelScope | null,
): PanelMemory {
  return resolveActivePanel(memory, scope) === panel
    ? closePanel(memory, scope)
    : openPanel(memory, panel, scope)
}

/**
 * Rebuild a rehydrated memory from scratch, keeping only what this build still
 * recognises.
 *
 * Persisted enum values outlive the code that named them. Rename or retire a
 * panel and last week's localStorage would otherwise reopen the rail onto an id
 * nothing renders — the exact failure the resolution rule exists to prevent,
 * reintroduced through the back door.
 */
export function sanitizePanelMemory(value: unknown): PanelMemory {
  // Nothing readable there — including the first run, where there is nothing at
  // all. Treat unreadable as never-seen and hand back the first-run default.
  if (typeof value !== 'object' || value === null) return DEFAULT_PANEL_MEMORY
  const raw = value as Partial<PanelMemory>
  const scoped: PanelMemory['scoped'] = {}
  if (typeof raw.scoped === 'object' && raw.scoped !== null) {
    for (const [scope, panel] of Object.entries(raw.scoped)) {
      // The panel has to be one we know *and* has to claim the scope it was
      // filed under, so a hand-edited or half-migrated blob can't park a post
      // panel on the calendar.
      if (
        SCOPED_PANELS.includes(panel as ScopedPanel) &&
        PANEL_SCOPE[panel as ScopedPanel] === scope
      ) {
        scoped[scope as PanelScope] = panel as ScopedPanel
      }
    }
  }
  return { assistantOpen: raw.assistantOpen === true, scoped }
}
