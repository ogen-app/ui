import { useTranslation } from 'react-i18next'
import { useCampaigns } from '@/hooks/useCampaigns'
import { usePlatformCatalog, usePlatformViews } from '@/hooks/usePlatforms'
import { periodLabel } from '@/lib/analyticsCitation'
import { presetName } from '@/lib/analyticsWindow'
import { formatList } from '@/lib/intl'
import { connectedAccounts } from '@/lib/platformDictionary'
import type { WindowControl } from '@/stores/analyticsHighlightStore'

/** A window as any of its carriers hold it: a view context, an action. */
export type WindowLike = {
  from?: string
  to?: string
  preset?: string
  platforms?: string[]
  campaignId?: string
}

/** A window's three parts, each in the scope bar's words. */
export type WindowParts = Record<WindowControl, string | null>

/**
 * A window in the words the dashboard's scope bar uses (CON-479): the period
 * as the picker names it ("Last 28 days", else its days), the platforms the
 * page actually counts, and the campaign — "All platforms" and "All
 * campaigns" when nothing narrows them. One place, so the chip, the marker
 * and the set_window row can't word one window three ways.
 *
 * A window the page sent is named as it was sent — it already holds only the
 * platforms the page counted, and a marker is history, so a platform
 * disconnected since must not drop out of it. With `counted`, for a window
 * the assistant set, the platforms go through the page's own rule instead:
 * only a connected one counts, and only while more than one is connected.
 * Naming a platform the numbers don't narrow by is the rail contradicting
 * the screen.
 */
export function useWindowWords({
  counted = false,
}: { counted?: boolean } = {}): {
  parts: (w: WindowLike) => WindowParts
  line: (w: WindowLike, only?: readonly WindowControl[]) => string
} {
  const { t } = useTranslation()
  const views = usePlatformViews()
  const { resolve } = usePlatformCatalog()
  const campaigns = useCampaigns().data ?? []
  const connected = views.filter((v) => connectedAccounts(v).length > 0)
  const parts = (w: WindowLike): WindowParts => {
    const named = !counted
      ? (w.platforms ?? []).map((slug) => resolve(slug)?.name ?? slug)
      : connected.length > 1
        ? (w.platforms ?? []).flatMap((slug) => {
            const view = connected.find((v) => v.info.zernioId === slug)
            return view ? [view.info.name] : []
          })
        : []
    return {
      period: w.preset
        ? presetName(t, w.preset)
        : w.from && w.to
          ? periodLabel(t, w.from, w.to)
          : null,
      platforms:
        named.length > 0
          ? formatList(named)
          : t('assistant.analytics.cite.allPlatforms'),
      campaign: w.campaignId
        ? (campaigns.find((c) => c.id === w.campaignId)?.name ??
          t('analytics.scopeBar.otherCampaign'))
        : t('assistant.analytics.cite.allCampaigns'),
    }
  }
  const line = (
    w: WindowLike,
    only: readonly WindowControl[] = ['period', 'platforms', 'campaign'],
  ) => {
    const p = parts(w)
    return only.flatMap((k) => (p[k] ? [p[k]] : [])).join(' · ')
  }
  return { parts, line }
}
