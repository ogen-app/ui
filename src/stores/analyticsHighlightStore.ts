import { create } from 'zustand'

/** A scope-bar control the assistant can change. */
export type WindowControl = 'period' | 'platforms' | 'campaign'

/**
 * Which of the dashboard's scope-bar controls the assistant just changed
 * (CON-479), so the bar can tint them and say so: the rail records the change,
 * and this is the same change seen where it happened. Cleared the moment the
 * user touches the bar, or the turn's change is put back — after that the
 * controls are simply the user's again.
 *
 * Session state, never persisted: it is about the last few seconds.
 */
type AnalyticsHighlightState = {
  changed: ReadonlySet<WindowControl>
  mark: (changed: WindowControl[]) => void
  clear: () => void
}

export const useAnalyticsHighlightStore = create<AnalyticsHighlightState>(
  (set) => ({
    changed: new Set(),
    mark: (changed) => set({ changed: new Set(changed) }),
    clear: () =>
      set((state) => (state.changed.size > 0 ? { changed: new Set() } : {})),
  }),
)

/** The server's `changed` names, as the bar's controls; unknown names drop. */
export function windowControls(changed: readonly string[] | undefined) {
  const out: WindowControl[] = []
  for (const name of changed ?? []) {
    if (
      name === 'period' ||
      name === 'from' ||
      name === 'to' ||
      name === 'preset'
    )
      out.push('period')
    else if (name === 'platforms' || name === 'platform') out.push('platforms')
    else if (
      name === 'campaign' ||
      name === 'campaignId' ||
      name === 'campaign_id'
    )
      out.push('campaign')
  }
  return [...new Set(out)]
}
