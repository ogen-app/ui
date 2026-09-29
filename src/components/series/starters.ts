import {
  CalendarHeartIcon,
  NewspaperClippingIcon,
  UserCircleDashedIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'
import type { ContentFormatId } from '@/lib/contentFormats'
import type { ContentSeries, SeriesRhythm, SeriesSupply } from './types'

/**
 * Three series of ours, offered to an empty library (CON-264).
 *
 * **Forked, never linked** — the rule `BrandOrigin` exists to keep honest.
 * Starting from one copies its words into a series of your own; improving ours
 * later must never silently rewrite somebody's.
 *
 * Why offer any at all, when the argument for this feature is that the library
 * should fill from real use rather than from generic nouns typed at onboarding?
 * Because these are not nouns. Each one is a worked example of the thing that
 * is hard to invent from a blank form — a *recipe* — and between them they
 * cover the distinction that the blank form cannot teach: two supply their own
 * subject and one waits on an idea. Somebody who forks one and rewrites it has
 * learned what a series is; somebody staring at an empty Name field has not.
 *
 * Three, and deliberately not eight. A starter list long enough to browse is a
 * catalogue, and a catalogue is the taxonomy-nobody-maintains failure arriving
 * by another door.
 *
 * This table carries behaviour only — the words are `series.starters.<id>.*`.
 */
/**
 * A union rather than `string`, so `series.starters.<id>.*` resolves to real
 * catalogue keys — the same reason `AudienceStarterId` is one. A starter added
 * here without its copy is a compile error rather than a card reading the key
 * back at the user.
 */
export type SeriesStarterId = 'this-day' | 'weekly-digest' | 'people'

export type SeriesStarter = {
  id: SeriesStarterId
  icon: Icon
  supply: SeriesSupply
  formatId: ContentFormatId
  rhythm: SeriesRhythm | null
}

export const SERIES_STARTERS: SeriesStarter[] = [
  {
    // Runs forever unattended: the calendar is the subject, so an empty idea
    // queue is simply irrelevant to it. The clearest example of `supply: self`.
    id: 'this-day',
    icon: CalendarHeartIcon,
    supply: 'self',
    formatId: 'story',
    rhythm: { times: 1, per: 'week' },
  },
  {
    // The rhythm is in the name, which is the tell that a series and a schedule
    // are the same object seen twice.
    id: 'weekly-digest',
    icon: NewspaperClippingIcon,
    supply: 'self',
    formatId: 'digest',
    rhythm: { times: 1, per: 'week' },
  },
  {
    // The one that cannot run on its own — it needs somebody to say *which*
    // person. Here so the library contains an example of a series that the
    // Ideas queue feeds, which is the half of the model a self-supplying
    // starter can never show.
    id: 'people',
    icon: UserCircleDashedIcon,
    supply: 'idea',
    formatId: 'story',
    rhythm: { times: 2, per: 'month' },
  },
]

/**
 * What a starter card says, and what forking it fills the editor with.
 *
 * One function rather than five, for the reason `brandSectionCopy` is one: the
 * card and the fork are two readings of the same entry, and splitting them is
 * two chances to put one starter's recipe under another's name.
 *
 * - `title` / `body` — the card, as an offer.
 * - `name` / `promise` / `recipe` — what lands in the editor. The name is
 *   deliberately a *placeholder with a blank in it* ("This day in ___ history")
 *   rather than a finished one: a series nobody renamed is the generic-noun
 *   failure, and a visible gap is what makes renaming the obvious first act.
 */
export function seriesStarterCopy(
  t: TFunction,
  starter: SeriesStarter,
): {
  title: string
  body: string
  name: string
  promise: string
  recipe: string
} {
  return {
    title: t(`series.starters.${starter.id}.title` as const),
    body: t(`series.starters.${starter.id}.body` as const),
    name: t(`series.starters.${starter.id}.name` as const),
    promise: t(`series.starters.${starter.id}.promise` as const),
    recipe: t(`series.starters.${starter.id}.recipe` as const),
  }
}

/**
 * A starter as a series that has never been stored — an empty `id`, which is
 * what `saveSeries` reads as *create*.
 *
 * `scope` is the caller's: the same starter forked from the workspace library
 * belongs to the workspace, and forked inside a campaign belongs to that
 * campaign. Passing it in rather than defaulting to workspace is what keeps the
 * campaign's own path from quietly publishing to everybody's library.
 */
export function seriesFromStarter(
  t: TFunction,
  starter: SeriesStarter,
  scope: ContentSeries['scope'],
): ContentSeries {
  const copy = seriesStarterCopy(t, starter)
  return {
    id: '',
    name: copy.name,
    promise: copy.promise,
    recipe: copy.recipe,
    supply: starter.supply,
    formatId: starter.formatId,
    defaultRhythm: starter.rhythm,
    scope,
    usage: { drafts: 0, published: 0 },
    updatedAt: '',
  }
}

/** A series with nothing in it — what the blank form starts from. */
export function blankSeries(scope: ContentSeries['scope']): ContentSeries {
  return {
    id: '',
    name: '',
    promise: '',
    recipe: '',
    // The commoner of the two and the safer default: a series that waits on an
    // idea simply produces nothing until somebody feeds it, whereas one wrongly
    // marked self-supplying claims slots in the plan it cannot fill.
    supply: 'idea',
    formatId: null,
    defaultRhythm: null,
    scope,
    usage: { drafts: 0, published: 0 },
    updatedAt: '',
  }
}
