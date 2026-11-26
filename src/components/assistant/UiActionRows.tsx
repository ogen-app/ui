import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { kindCount, screenName } from '@/lib/assistantView'
import { postStatusLabel } from '@/lib/postStatusLabel'
import type { PostStatus } from '@/types/posts'
import { counted } from '@/lib/intl'
import { useAssistantStore } from '@/stores/assistantStore'
import { usePlatformCatalog, usePlatformViews } from '@/hooks/usePlatforms'
import { focusedAccount } from '@/lib/platformFocus'
import {
  filterLandsOnList,
  sameDestination,
  windowCampaign,
  type UIAction,
} from '@/lib/assistantUiActions'
import { offeredPeriod } from '@/lib/analyticsWindow'
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
  const words = useWindowWords({ counted: true })
  const { resolve } = usePlatformCatalog()
  const platformName = (slug: string) => resolve(slug)?.name ?? slug
  const views = usePlatformViews()
  const connectedViews = views.filter((v) => v.connectedPublishers.length > 0)
  // A post type as the platforms word it — the operator's label for a type
  // this build doesn't name — never its slug.
  const postTypeName = (slug: string) =>
    views.flatMap((v) => v.info.postTypes).find((p) => p.slug === slug)
      ?.label ?? slug
  // Whether Settings found the account a reconnect named: when not, it lands
  // on the platform's tile instead, and the row says so (CON-480).
  const found = (connect: NonNullable<UIAction['connect']>) =>
    Boolean(
      focusedAccount(connectedViews, {
        accountId: connect.accountId,
        platform: connect.platform,
      }),
    )
  const inCampaign = threadId.startsWith('campaign:')
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
        // Before → after for every window it set (CON-507). After a navigate,
        // `before` is the window the dashboard opened with — the default
        // period and the campaign in scope — and `changed` what moved from it
        // (CON-497), so a navigate folded into its window shows them too.
        const change =
          folded ?? (action.type === 'set_window' ? applied : undefined)
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
                    // Only what moved from the window it opened on, as a
                    // window set where it stood is worded.
                    window: words.line(
                      windowOf(folded.action),
                      changedControls(folded.action),
                    ),
                  })
                : actionTitle(
                    t,
                    applied,
                    words.line,
                    platformName,
                    postTypeName,
                    found,
                  )
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
            {change && <WindowChange action={change.action} />}
            {action.type === 'open_connect' && action.connect && (
              <p className="pt-2.5 text-[12.5px] text-secondary-foreground">
                {!action.connect.reconnect && inCampaign
                  ? t('assistant.uiAction.connectCampaignNote', {
                      platform: platformName(action.connect.platform),
                    })
                  : t('assistant.uiAction.connectNote', {
                      platform: platformName(action.connect.platform),
                    })}
              </p>
            )}
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
    Boolean(second.before) &&
    // Only a navigate to where the window lands: one into Assets followed by
    // a window on the dashboard is two moves, and so is one into a
    // campaign's tab followed by a window over another campaign's.
    sameDestination(first.action, second.action)
  )
}

/** The window an action left on screen, with the campaign it narrows to. */
function windowOf(action: UIAction): WindowLike {
  return offeredPeriod({
    ...action.window,
    campaignId: windowCampaign(action),
  })
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
  const words = useWindowWords({ counted: true })
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
  applied: AppliedUIAction,
  describe: (w: WindowLike, only?: readonly WindowControl[]) => string,
  platformName: (slug: string) => string,
  postTypeName: (slug: string) => string,
  found: (connect: NonNullable<UIAction['connect']>) => boolean,
): React.ReactNode {
  const { action } = applied
  // A filter set on a calendar may have landed on the posts list
  // (`destinationFor`).
  // Both lists are "Posts".
  const screen = screenName(
    t,
    filterLandsOnList(action) ? 'campaign.list' : action.screen,
  )
  const grey = (
    <span className="text-sm font-normal text-secondary-foreground" />
  )
  switch (action.type) {
    case 'open_connect': {
      // The place it landed, not the act (CON-480): "Settings at Instagram",
      // with what is open there in grey.
      const platform = platformName(action.connect?.platform ?? '')
      if (action.connect?.reconnect && !found(action.connect))
        return (
          <Trans
            t={t}
            i18nKey="assistant.uiAction.openNotFound"
            values={{ platform }}
            components={{ where: grey }}
          />
        )
      return (
        <Trans
          t={t}
          i18nKey={
            action.connect?.reconnect
              ? 'assistant.uiAction.openReconnect'
              : 'assistant.uiAction.openConnect'
          }
          values={{ platform }}
          components={{ where: grey }}
        />
      )
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
    case 'set_filter': {
      if (!action.filter) return t('assistant.uiAction.clearFilter', { screen })
      // What it filtered to, on a posts screen (CON-482): "drafts ·
      // Instagram", in grey after the screen.
      const detail = postFilterDetail(t, action, platformName, postTypeName)
      return detail ? (
        <Trans
          t={t}
          i18nKey="assistant.uiAction.setFilterDetail"
          values={{ screen, detail }}
          components={{ where: grey }}
        />
      ) : (
        t('assistant.uiAction.setFilter', { screen })
      )
    }
    case 'select':
      // Named by what was ticked — "Selected 2 voices" (CON-486) — and
      // counted as the list ticked it, when it said: ids it doesn't hold are
      // dropped (CON-482).
      return action.selection
        ? t('assistant.uiAction.selectKind', {
            what: kindCount(
              t,
              action.selection.kind,
              applied.ticked ?? action.selection.ids.length,
            ),
          })
        : t('assistant.uiAction.select', {
            screen,
            ...counted(applied.ticked ?? 0),
          })
    case 'open_saved_view':
      // The group by name, and where it opened in grey (CON-476).
      return action.savedViewName ? (
        <Trans
          t={t}
          i18nKey="assistant.uiAction.openSavedViewNamed"
          values={{ name: action.savedViewName, screen }}
          components={{ where: grey }}
        />
      ) : (
        t('assistant.uiAction.openSavedView', { screen })
      )
  }
}

/** The posts screens, whose filter the row can word. */
const POST_SCREENS: readonly string[] = [
  'campaign.list',
  'campaign.calendar',
  'calendar',
]

/**
 * A posts filter as a few words — statuses, platforms, post types, the
 * search in quotes — or undefined for another screen's filter or one it
 * can't word.
 */
function postFilterDetail(
  t: TFunction,
  action: UIAction,
  platformName: (slug: string) => string,
  postTypeName: (slug: string) => string,
): string | undefined {
  if (!POST_SCREENS.includes(action.screen) || !action.filter) return undefined
  const q = new URLSearchParams(action.filter)
  const list = (key: string) => (q.get(key) ?? '').split(',').filter(Boolean)
  const parts = [
    ...list('status').map((s) =>
      postStatusLabel(t, s as PostStatus).toLowerCase(),
    ),
    ...list('platform').map(platformName),
    ...list('post_type').map(postTypeName),
    ...(q.get('text')?.trim()
      ? [t('assistant.uiAction.searchDetail', { text: q.get('text')!.trim() })]
      : []),
  ]
  return parts.length > 0 ? parts.join(' · ') : undefined
}
