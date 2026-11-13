import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ASSETS_KEY, assetKey } from '@/hooks/useContent'
import { counted } from '@/lib/intl'
import type { MarkerDetail } from '@/lib/assistantView'
import type { AssetsState } from '@/services/api/content'
import type { Asset } from '@/types/content'

/**
 * Names for the thread's markers, from what the app already holds: an open
 * asset's title on its list ("On Assets · Villa Aurora brochure 2026"), and
 * the Assets list's size ("On Assets · 64 documents"). Nothing is fetched for
 * a marker, so a turn sent from an asset this tab never opened keeps the
 * plain "On an asset"; the size is the bank's now, not when the turn was sent.
 */
export function useMarkerDetail(): MarkerDetail {
  const { t } = useTranslation()
  const qc = useQueryClient()
  return (view) => {
    if (view.focus?.kind === 'asset') {
      const title = qc.getQueryData<Asset>(assetKey(view.focus.id))?.title
      if (!title) return null
      return {
        screen: view.screen === 'campaign.asset' ? 'campaign.assets' : 'assets',
        item: title,
      }
    }
    if (view.screen !== 'assets' && view.screen !== 'campaign.assets')
      return null
    const scope = view.scope.kind === 'campaign' ? view.scope.id : 'workspace'
    const state = qc.getQueryData<AssetsState>([...ASSETS_KEY, 'state', scope])
    return state
      ? {
          item: t('assistant.marker.documents', counted(state.total)),
        }
      : null
  }
}
