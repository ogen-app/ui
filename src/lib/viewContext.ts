import type { ThreadSubject } from '@/types/assistant'

/**
 * What the user is looking at, sent with every assistant turn (CON-450, D3).
 * References only — ids, a filter string, a window — never content: the server
 * reloads everything from the ids in the caller's tenant and trusts nothing on
 * screen as data. Mirrors `domain/viewcontext` on the server; v1 is the only
 * version it accepts.
 */
export type ViewContext = {
  version: 1
  screen: ViewScreen
  scope: ViewScope
  focus?: { kind: ViewEntityKind; id: string }
  selection?:
    | { kind: ViewEntityKind; ids: string[]; count?: number }
    | { kind: ViewEntityKind; allMatching: true; count?: number }
  /** The list's filter, in the list endpoint's own query-string form. */
  filter?: string
  savedViewId?: string
  sort?: string
  window?: { from: string; to: string; platforms?: string[] }
  visible?: { kind: ViewEntityKind; ids: string[] }
}

export type ViewScope =
  | { kind: 'workspace' }
  | { kind: 'campaign'; id: string }
  | { kind: 'post'; id: string }

export type ViewEntityKind =
  | 'idea'
  | 'asset'
  | 'post'
  | 'campaign'
  | 'voice'
  | 'audience'
  | 'fact'
  | 'series'

/** Every screen the server knows (`viewcontext.Screen`). */
export type ViewScreen =
  | 'home'
  | 'ideas'
  | 'assets'
  | 'asset'
  | 'analytics'
  | 'analytics.post'
  | 'calendar'
  | 'campaigns'
  | 'tasks'
  | 'activity'
  | 'settings'
  | 'profile'
  | 'post'
  | 'foundation'
  | 'foundation.voices'
  | 'foundation.voice'
  | 'foundation.audiences'
  | 'foundation.audience'
  | 'foundation.facts'
  | 'foundation.guardrails'
  | 'foundation.look'
  | 'foundation.questions'
  | 'foundation.series'
  | 'foundation.series_item'
  | 'foundation.templates'
  | 'campaign.overview'
  | 'campaign.strategy'
  | 'campaign.list'
  | 'campaign.ideas'
  | 'campaign.assets'
  | 'campaign.asset'
  | 'campaign.analytics'
  | 'campaign.calendar'
  | 'campaign.activity'
  | 'campaign.settings'

/** The thread a subject's turns belong to, as the view context names it. */
export function scopeOf(subject: ThreadSubject): ViewScope {
  switch (subject.kind) {
    case 'workspace':
      return { kind: 'workspace' }
    case 'campaign':
      return { kind: 'campaign', id: subject.campaignId }
    case 'post':
      return { kind: 'post', id: subject.postId }
  }
}

/** The screen a subject's own page is, when nothing more specific is known. */
function homeScreen(subject: ThreadSubject): ViewScreen {
  switch (subject.kind) {
    case 'workspace':
      return 'home'
    case 'campaign':
      return 'campaign.overview'
    case 'post':
      return 'post'
  }
}

/** The smallest valid view context for a thread: its scope and a screen. */
export function baseViewContext(subject: ThreadSubject): ViewContext {
  return { version: 1, screen: homeScreen(subject), scope: scopeOf(subject) }
}
