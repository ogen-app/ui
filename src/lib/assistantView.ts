import type { TFunction } from 'i18next'
import { counted, formatDateRange, formatNumber } from '@/lib/intl'
import { MAX_SELECTION_IDS } from '@/lib/viewContext'
import type {
  ViewContext,
  ViewEntityKind,
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

/** How many a selection holds, of what, and whether it is a whole match. */
function selectionOf(
  selection: ViewContext['selection'],
): { kind: ViewEntityKind; count: number; matching: boolean } | null {
  if (!selection) return null
  if ('allMatching' in selection) {
    return { kind: selection.kind, count: selection.count ?? 0, matching: true }
  }
  const count = selection.count ?? selection.ids.length
  return count > 0 ? { kind: selection.kind, count, matching: false } : null
}

/** "2 voices", "1 post" — a count of one kind of thing. */
export function kindCount(
  t: TFunction,
  kind: ViewEntityKind,
  count: number,
): string {
  return t(`assistant.kindCount.${kind}`, counted(count))
}

/**
 * The Foundation's libraries, whose selections are named by what they hold
 * ("2 voices") rather than by the screen — the screen's name is the same noun.
 */
const LIBRARY_KINDS: ReadonlySet<ViewEntityKind> = new Set([
  'voice',
  'audience',
  'fact',
  'series',
])

/**
 * Where a turn was sent from, as the marker names it (CON-486): a Foundation
 * library under the Foundation — "Foundation · Voices" — and a calendar with
 * the days it showed — "Calendar · 21–27 Apr".
 */
function placeName(t: TFunction, view: ViewContext): string {
  const screen = screenName(t, view.screen)
  if (view.screen.startsWith('foundation.'))
    return t('assistant.marker.foundationPlace', { screen })
  if (isCalendar(view.screen) && view.window) {
    const from = dayOf(view.window.from)
    const to = dayOf(view.window.to)
    if (from && to)
      return t('assistant.marker.windowPlace', {
        screen,
        window: formatDateRange(from, to, { day: 'numeric', month: 'short' }),
      })
  }
  return screen
}

function isCalendar(screen: ViewScreen): boolean {
  return screen === 'calendar' || screen === 'campaign.calendar'
}

/** A window's `YYYY-MM-DD` as that local day, or null if it isn't one. */
function dayOf(value: string): Date | null {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

const FOCUS_CHIP = {
  idea: 'assistant.chip.focusIdea',
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
  /** The open asset's title, when the screen has loaded it (CON-476). */
  focusTitle?: string,
  /**
   * The dashboard's window in the scope bar's words (CON-479), which is what
   * goes with a message from it when nothing is ticked.
   */
  windowText?: string | null,
): string | null {
  const selection = selectionOf(page?.selection)
  if (selection && location.screen) {
    // The page's own words for its ticks, where it has them (the calendar's
    // day), and a library's count of what it holds (CON-486).
    if (!selection.matching && selection.count <= MAX_SELECTION_IDS) {
      if (page?.selectionLabel) return page.selectionLabel
      if (LIBRARY_KINDS.has(selection.kind))
        return kindCount(t, selection.kind, selection.count)
    }
    const screen = screenName(t, location.screen)
    if (selection.matching)
      return t('assistant.chip.matching', {
        ...counted(selection.count),
        screen,
      })
    // More ticked than a turn can carry: only the first go, so say so here
    // rather than let the chip claim the whole selection travels.
    if (selection.count > MAX_SELECTION_IDS)
      return t('assistant.chip.selectedCapped', {
        limit: formatNumber(MAX_SELECTION_IDS),
        total: formatNumber(selection.count),
        screen,
      })
    // Ticked posts say what they are (CON-479): "2 posts selected".
    return t(
      page?.selection?.kind === 'post'
        ? 'assistant.chip.selectedPosts'
        : 'assistant.chip.selected',
      { ...counted(selection.count), screen },
    )
  }
  // An item open inside a list is the focus over the route's (CON-481).
  const focus = page?.focus ?? location.focus
  if (!focus) return page?.window && windowText ? windowText : null
  if (
    subject.kind === 'post' &&
    focus.kind === 'post' &&
    focus.id === subject.postId
  )
    return null
  if (focus.kind === 'asset' && focusTitle)
    return t('assistant.chip.focusNamed', { title: focusTitle })
  const key = FOCUS_CHIP[focus.kind as keyof typeof FOCUS_CHIP]
  return key ? t(key) : null
}

/**
 * What a marker can say beyond the screen (CON-476): the open asset by its
 * title — on the list it belongs to, "On Assets · Villa Aurora brochure" —
 * or the size of the list. Read from what the app has loaded, so it is null
 * for anything it hasn't, and the marker says the screen alone.
 */
export type MarkerDetail = (
  view: ViewContext,
) => { screen?: ViewScreen; item: string } | null

/** What makes two turns' screens the same place, for the marker. */
function signature(view: ViewContext): string {
  const selection = selectionOf(view.selection)
  const w = view.window
  return [
    view.screen,
    view.focus?.id ?? '',
    selection ? `${selection.matching ? 'all' : ''}${selection.count}` : '',
    // A new period, platform or campaign on the dashboard is somewhere else
    // too (CON-479), though the screen is the same.
    w
      ? [
          w.preset ?? `${w.from}~${w.to}`,
          [...(w.platforms ?? [])].sort().join(','),
          w.campaignId ?? '',
        ].join('/')
      : '',
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
  detail?: MarkerDetail,
): string | null {
  if (!view) return null
  if (previous && signature(previous) === signature(view)) return null
  const screen = placeName(t, view)
  const selection = selectionOf(view.selection)
  const moved = previous !== undefined
  if (!selection) {
    const named = detail?.(view)
    if (named)
      return t(moved ? 'assistant.marker.nowItem' : 'assistant.marker.onItem', {
        screen: screenName(t, named.screen ?? view.screen),
        item: named.item,
      })
    return t(moved ? 'assistant.marker.now' : 'assistant.marker.on', { screen })
  }
  const count = counted(selection.count)
  if (selection.matching) {
    return moved
      ? t('assistant.marker.nowMatching', { screen, ...count })
      : t('assistant.marker.onMatching', { screen, ...count })
  }
  return moved
    ? t('assistant.marker.nowSelected', { screen, ...count })
    : t('assistant.marker.onSelected', { screen, ...count })
}

/** The marker before each user turn that has one, keyed by turn id. */
export function turnMarkers(
  t: TFunction,
  turns: AssistantTurn[],
  detail?: MarkerDetail,
): Map<string, string> {
  const markers = new Map<string, string>()
  let previous: ViewContext | undefined
  for (const turn of turns) {
    if (turn.role !== 'user') continue
    const text = markerText(t, turn.view, previous, detail)
    if (text) markers.set(turn.id, text)
    if (turn.view) previous = turn.view
  }
  return markers
}
