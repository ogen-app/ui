import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { screenName } from '@/lib/assistantView'
import { counted } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import { usePlatformCatalog } from '@/hooks/usePlatforms'
import { windowCampaign, type UIAction } from '@/lib/assistantUiActions'
import {
  windowControls,
  type WindowControl,
} from '@/stores/analyticsHighlightStore'
import { ResolvedLine, ResultBlock, ResultRow, TextAction } from './blocks'
import { useWindowWords, type WindowLike } from './useWindowWords'
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
  const words = useWindowWords()
  const { resolve } = usePlatformCatalog()
  const platformName = (slug: string) => resolve(slug)?.name ?? slug
  return (
    <div className="flex flex-col gap-4">
      {actions.map((applied, index) => {
        const previous = actions[index - 1]
        // A navigate straight into the window it sets is one move (CON-479):
        // "Opened Analytics · Last 90 days · Spring reopening", one BACK.
        if (folds(previous, applied)) return null
        const next = actions[index + 1]
        const folded = folds(applied, next) ? next : undefined
        const { action } = applied
        const back =
          action.type === 'navigate' ||
          action.type === 'open_connect' ||
          action.type === 'open_add_source' ||
          action.type === 'set_window'
        // Before → after only for a window changed where it stood: after a
        // navigate, `before` is the window of a screen nobody was looking at
        // (CON-497).
        const showChange =
          action.type === 'set_window' &&
          !folded &&
          previous?.action.type !== 'navigate'
        return (
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
            title={
              folded?.action.window
                ? t('assistant.uiAction.navigateWindow', {
                    screen: screenName(t, action.screen),
                    window: words.line(windowOf(folded.action)),
                  })
                : actionTitle(t, applied, words.line, platformName)
            }
            action={
              applied.before && !applied.undone ? (
                <TextAction
                  onClick={() =>
                    void (async () => {
                      if (folded) await undo(threadId, turnId, index + 1)
                      await undo(threadId, turnId, index)
                    })()
                  }
                >
                  {back
                    ? t('assistant.uiAction.back')
                    : t('assistant.undo.undo')}
                </TextAction>
              ) : undefined
            }
          >
            {showChange && <WindowChange action={action} />}
            {applied.undone && (
              <ResolvedLine>{t('assistant.uiAction.putBack')}</ResolvedLine>
            )}
          </ResultBlock>
        )
      })}
    </div>
  )
}

/** Whether `second` is the window `first` navigated to the dashboard for. */
function folds(
  first: AppliedUIAction | undefined,
  second: AppliedUIAction | undefined,
): boolean {
  return (
    first?.action.type === 'navigate' &&
    second?.action.type === 'set_window' &&
    Boolean(first.before) &&
    Boolean(second.before)
  )
}

/** The window an action left on screen, with the campaign it narrows to. */
function windowOf(action: UIAction): WindowLike {
  return { ...action.window, campaignId: windowCampaign(action) }
}

/** What `changed` names, in the bar's order; nothing named is everything. */
function changedControls(action: UIAction): WindowControl[] {
  const named = windowControls(action.changed)
  return named.length > 0 ? named : ['period', 'platforms', 'campaign']
}

/**
 * What moved, one row a control: "Period  Last 28 days → 1 – 31 Mar". The
 * old value is struck through, so the row reads as a change at a glance.
 */
function WindowChange({ action }: { action: UIAction }) {
  const { t } = useTranslation()
  const words = useWindowWords()
  if (!action.before || !action.window) return null
  const before = words.parts(action.before)
  const after = words.parts(windowOf(action))
  return changedControls(action).map((control) => (
    <ResultRow key={control} className="flex items-baseline gap-3 text-sm">
      <span className="w-20 shrink-0 text-[12.5px] text-secondary-foreground">
        {t(`assistant.uiAction.window.${control}`)}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {before[control] && (
          <>
            <s className="text-tertiary-foreground">{before[control]}</s>
            {' → '}
          </>
        )}
        <span className="text-foreground">{after[control]}</span>
      </span>
    </ResultRow>
  ))
}

function actionTitle(
  t: TFunction,
  { action }: AppliedUIAction,
  describe: (w: WindowLike, only?: readonly WindowControl[]) => string,
  platformName: (slug: string) => string,
): React.ReactNode {
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
      // Only what changed (CON-479): "Analytics set to March · Instagram".
      return t('assistant.uiAction.setWindow', {
        screen: screenName(t, 'analytics'),
        window: describe(windowOf(action), changedControls(action)),
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
      // The group by name, and where it opened in grey (CON-476).
      return action.savedViewName ? (
        <Trans
          t={t}
          i18nKey="assistant.uiAction.openSavedViewNamed"
          values={{ name: action.savedViewName, screen }}
          components={{
            where: (
              <span className="text-sm font-normal text-secondary-foreground" />
            ),
          }}
        />
      ) : (
        t('assistant.uiAction.openSavedView', { screen })
      )
  }
}
