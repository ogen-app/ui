import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { screenName } from '@/lib/assistantView'
import { useAssistantStore } from '@/stores/assistantStore'
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
          title={actionTitle(t, applied)}
          action={
            applied.before && !applied.undone ? (
              <TextAction onClick={() => void undo(threadId, turnId, index)}>
                {applied.action.type === 'navigate'
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

function actionTitle(t: TFunction, { action }: AppliedUIAction): string {
  const screen = screenName(t, action.screen)
  switch (action.type) {
    case 'navigate':
      return t('assistant.uiAction.navigate', { screen })
    case 'set_filter':
      return action.filter
        ? t('assistant.uiAction.setFilter', { screen })
        : t('assistant.uiAction.clearFilter', { screen })
    case 'select':
      return t('assistant.uiAction.select', {
        screen,
        count: action.selection?.ids.length ?? 0,
      })
    case 'open_saved_view':
      return t('assistant.uiAction.openSavedView', { screen })
  }
}
