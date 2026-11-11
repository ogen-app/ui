import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { screenName } from '@/lib/assistantView'
import { counted } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import { useCampaigns } from '@/hooks/useCampaigns'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { formatList } from '@/lib/intl'
import { windowCampaign, type UIAction } from '@/lib/assistantUiActions'
import { periodLabel } from '@/lib/analyticsCitation'
import { ResolvedLine, ResultBlock, TextAction } from './blocks'
import type { AppliedUIAction } from '@/lib/assistantUiActions'

/**
 * What a turn did to the screen (CON-450, D5) — "Filtered Ideas", "Opened an
 * asset" — each with the way back: BACK for a navigation, UNDO for the rest.
 * Read-tier, so nothing asked first; the screen behind the rail is the proof,
 * and this is the record.
 */
export function UiActionRows({
  threadId,
  turnId,
  actions,
}: {
  threadId: string
  turnId: string
  actions: AppliedUIAction[]
}) {
  const { t } = useTranslation()
  const undo = useAssistantStore((s) => s.undoUiAction)
  const describe = useWindowWords()
  const { resolve } = usePlatformCatalog()
  const platformName = (slug: string) => resolve(slug)?.name ?? slug
  return (
    <div className="flex flex-col gap-4">
      {actions.map((applied, index) => (
        <ResultBlock
          key={index}
          // `before` is absent when the action never ran — no route for it,
          // no applier, or it threw — so the screen did not change.
          status={
            applied.before
              ? t('assistant.word.onScreen')
              : t('assistant.word.notApplied')
          }
          tone={applied.before ? 'neutral' : 'warning'}
          title={actionTitle(t, applied, describe, platformName)}
          action={
            applied.before && !applied.undone ? (
              <TextAction onClick={() => void undo(threadId, turnId, index)}>
                {applied.action.type === 'navigate' ||
                applied.action.type === 'open_connect' ||
                applied.action.type === 'open_add_source'
                  ? t('assistant.uiAction.back')
                  : t('assistant.undo.undo')}
              </TextAction>
            ) : undefined
          }
        >
          {applied.undone && (
            <ResolvedLine>{t('assistant.uiAction.putBack')}</ResolvedLine>
          )}
        </ResultBlock>
      ))}
    </div>
  )
}

/**
 * A window in the words its cards cite it in: period · platforms · campaign,
 * with the campaign named from the list the dashboard picks from.
 */
function useWindowWords(): (action: UIAction) => string {
  const { t } = useTranslation()
  const { resolve } = usePlatformCatalog()
  const campaigns = useCampaigns().data ?? []
  return (action) => {
    const w = action.window
    const parts: string[] = []
    if (w?.from && w.to) parts.push(periodLabel(t, w.from, w.to))
    parts.push(
      w && w.platforms.length > 0
        ? formatList(w.platforms.map((s) => resolve(s)?.name ?? s))
        : t('assistant.analytics.cite.allPlatforms'),
    )
    const id = windowCampaign(action)
    parts.push(
      id
        ? (campaigns.find((c) => c.id === id)?.name ??
            t('analytics.scopeBar.otherCampaign'))
        : t('assistant.analytics.cite.workspace'),
    )
    return parts.join(' · ')
  }
}

function actionTitle(
  t: TFunction,
  { action }: AppliedUIAction,
  describe: (action: UIAction) => string,
  platformName: (slug: string) => string,
): string {
  const screen = screenName(t, action.screen)
  switch (action.type) {
    case 'open_connect': {
      const platform = platformName(action.connect?.platform ?? '')
      return action.connect?.reconnect
        ? t('assistant.uiAction.openReconnect', { platform })
        : t('assistant.uiAction.openConnect', { platform })
    }
    case 'open_add_source':
      return t('assistant.uiAction.openAddSource', { screen })
    case 'set_window':
      return t('assistant.uiAction.setWindow', {
        screen: screenName(t, 'analytics'),
        window: describe(action),
      })
    case 'navigate':
      return t('assistant.uiAction.navigate', { screen })
    case 'set_filter':
      return action.filter
        ? t('assistant.uiAction.setFilter', { screen })
        : t('assistant.uiAction.clearFilter', { screen })
    case 'select':
      return t('assistant.uiAction.select', {
        screen,
        ...counted(action.selection?.ids.length ?? 0),
      })
    case 'open_saved_view':
      return t('assistant.uiAction.openSavedView', { screen })
  }
}
