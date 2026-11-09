import type { TFunction } from 'i18next'
import { MAX_SELECTION_IDS } from '@/lib/viewContext'
import type {
  ViewContext,
  ViewLocation,
  ViewPage,
  ViewScreen,
} from '@/lib/viewContext'
import type { AssistantTurn, ThreadSubject } from '@/types/assistant'

/**
 * Words for the view context: the screen's name, the composer chip, and the
 * markers the thread draws where the screen changed. All worded at render time
 * from the stored references, so a replayed thread reads in today's language.
 */

export function screenName(t: TFunction, screen: ViewScreen): string {
  return t(
    `assistant.screen.${screen.replace('.', '_')}` as 'assistant.screen.home',
  )
}

/** How many a selection holds, and whether it is a whole match. */
function selectionOf(
  selection: ViewContext['selection'],
): { count: number; matching: boolean } | null {
  if (!selection) return null
  if ('allMatching' in selection) {
    return { count: selection.count ?? 0, matching: true }
  }
  const count = selection.count ?? selection.ids.length
  return count > 0 ? { count, matching: false } : null
}

const FOCUS_CHIP = {
  asset: 'assistant.chip.focusAsset',
  voice: 'assistant.chip.focusVoice',
  audience: 'assistant.chip.focusAudience',
  series: 'assistant.chip.focusSeries',
  post: 'assistant.chip.focusPost',
} as const

/**
 * What the composer's chip says goes with the next message, or null when
 * there is nothing to say: no selection, and no detail screen open other than
 * the thread's own subject — a post's thread on its own post knows that much.
 */
export function chipText(
  t: TFunction,
  subject: ThreadSubject,
  location: ViewLocation,
  page: ViewPage | null,
): string | null {
  const selection = selectionOf(page?.selection)
  if (selection && location.screen) {
    const screen = screenName(t, location.screen)
    if (selection.matching)
      return t('assistant.chip.matching', { count: selection.count, screen })
    // More ticked than a turn can carry: only the first go, so say so here
    // rather than let the chip claim the whole selection travels.
    if (selection.count > MAX_SELECTION_IDS)
      return t('assistant.chip.selectedCapped', {
        limit: MAX_SELECTION_IDS,
        total: selection.count,
        screen,
      })
    return t('assistant.chip.selected', { count: selection.count, screen })
  }
  const focus = location.focus
  if (!focus) return null
  if (
    subject.kind === 'post' &&
    focus.kind === 'post' &&
    focus.id === subject.postId
  )
    return null
  const key = FOCUS_CHIP[focus.kind as keyof typeof FOCUS_CHIP]
  return key ? t(key) : null
}

/** What makes two turns' screens the same place, for the marker. */
function signature(view: ViewContext): string {
  const selection = selectionOf(view.selection)
  return [
    view.screen,
    view.focus?.id ?? '',
    selection ? `${selection.matching ? 'all' : ''}${selection.count}` : '',
  ].join('|')
}

/**
 * The marker before a user turn, or null when the turn was sent from where the
 * previous one was. The first marker in a thread says where it began; the
 * rest say where it moved to.
 */
export function markerText(
  t: TFunction,
  view: ViewContext | undefined,
  previous: ViewContext | undefined,
): string | null {
  if (!view) return null
  if (previous && signature(previous) === signature(view)) return null
  const screen = screenName(t, view.screen)
  const selection = selectionOf(view.selection)
  const moved = previous !== undefined
  if (!selection)
    return t(moved ? 'assistant.marker.now' : 'assistant.marker.on', { screen })
  const count = selection.count
  if (selection.matching) {
    return moved
      ? t('assistant.marker.nowMatching', { screen, count })
      : t('assistant.marker.onMatching', { screen, count })
  }
  return moved
    ? t('assistant.marker.nowSelected', { screen, count })
    : t('assistant.marker.onSelected', { screen, count })
}

/** The marker before each user turn that has one, keyed by turn id. */
export function turnMarkers(
  t: TFunction,
  turns: AssistantTurn[],
): Map<string, string> {
  const markers = new Map<string, string>()
  let previous: ViewContext | undefined
  for (const turn of turns) {
    if (turn.role !== 'user') continue
    const text = markerText(t, turn.view, previous)
    if (text) markers.set(turn.id, text)
    if (turn.view) previous = turn.view
  }
  return markers
}
