import {
  BookOpenIcon,
  ChatTeardropTextIcon,
  ChatsCircleIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  MegaphoneSimpleIcon,
  NewspaperIcon,
  NotebookIcon,
  type Icon,
} from '@phosphor-icons/react'
import type { TFunction } from 'i18next'

/**
 * The shapes a post can take — how-to, explainer, listicle (CON-264).
 *
 * **A vocabulary, not a library.** This is a fixed table and a picker: no page,
 * no CRUD, no empty state, no Foundation section, nothing to maintain. That is
 * the entire difference between this costing nothing and it being a second
 * Series, and it is worth defending the next time somebody asks for a custom
 * one.
 *
 * A fixed list is enough because **a bare format label already carries a
 * recipe**. The vocabulary is shared with the model, so "how-to" implies an
 * opening, a numbered middle and a takeaway without anyone writing that down.
 * This is the opposite of a theme: "Education" tells a generator nothing, which
 * is why themes need an instruction field and this does not.
 *
 * ## Not the post type
 *
 * `platform_post_type` — carousel, reel, thread, text-post — is the *container*,
 * it is already modelled and already derived (`lib/postTypeAuto`). This is the
 * *rhetorical shape*, and a how-to can be a carousel or a thread or a video. The
 * two never decide the same thing, so neither overrides the other and there is
 * no precedence rule to learn.
 *
 * ## Optional, always
 *
 * A post may have no format and nothing warns about it. Forcing the
 * classification is the failure CON-210 paid for with its three-mode source
 * picker: a required taxonomy gets filled in with whatever is nearest rather
 * than left honestly blank, and then the grouping it exists for is noise.
 *
 * People will argue about the boundaries — explainer vs. how-to vs. guide.
 * **Keep the list short and accept the fuzziness** rather than adding entries to
 * settle it; every entry added to resolve an argument makes the next argument
 * more likely, and a vocabulary of twenty is a library again.
 *
 * This table carries behaviour only. The words are `formats.<id>.*` in the
 * catalogue — a module-level constant holding copy would freeze whichever
 * language loaded first.
 */
export type ContentFormatId =
  | 'how-to'
  | 'explainer'
  | 'listicle'
  | 'story'
  | 'digest'
  | 'opinion'
  | 'question'
  | 'announcement'

export type ContentFormatInfo = {
  id: ContentFormatId
  icon: Icon
}

/**
 * Ordered by how often the shape actually gets used, not alphabetically: the
 * picker is a short list somebody reads top to bottom, and the two or three
 * they want most should not be below the fold of their attention.
 */
export const CONTENT_FORMATS: ContentFormatInfo[] = [
  { id: 'how-to', icon: ListNumbersIcon },
  { id: 'explainer', icon: BookOpenIcon },
  { id: 'listicle', icon: ListBulletsIcon },
  { id: 'story', icon: NotebookIcon },
  { id: 'digest', icon: NewspaperIcon },
  { id: 'opinion', icon: ChatTeardropTextIcon },
  { id: 'question', icon: ChatsCircleIcon },
  { id: 'announcement', icon: MegaphoneSimpleIcon },
]

const BY_ID = new Map(CONTENT_FORMATS.map((format) => [format.id, format]))

/**
 * The entry for an id, or `undefined` for one this build has never heard of.
 *
 * Partial by construction, and that is the point: the id will be a column
 * before long, and a build that predates a format somebody else's build wrote
 * must render the post rather than crash on it. Same rule as an asset `type`
 * the app does not recognise — show what you can, refuse nothing.
 */
export function contentFormat(
  id: string | null | undefined,
): ContentFormatInfo | undefined {
  return id ? BY_ID.get(id as ContentFormatId) : undefined
}

export function isContentFormatId(value: unknown): value is ContentFormatId {
  return typeof value === 'string' && BY_ID.has(value as ContentFormatId)
}

/**
 * A stored value narrowed to something this build can draw, or `null`.
 *
 * Every read goes through here rather than casting, so an id from an older
 * sidecar, a hand-edited `localStorage` entry or a future column lands as *no
 * format* — which is a state every screen already draws — instead of as a
 * picker with a value none of its options match.
 */
export function normalizeContentFormat(value: unknown): ContentFormatId | null {
  return isContentFormatId(value) ? value : null
}

/**
 * What a format is called and the one line under it in the picker.
 *
 * Two strings rather than two call sites: everywhere that wants the label also
 * wants the hint, and splitting them is two chances to read one format's name
 * over another's description.
 *
 * - `label` — sentence case, the trade's own word for the shape.
 * - `hint` — what the shape *does*, in one line. "Steps somebody can follow" is
 *   what tells a person which of how-to and explainer they meant; "a how-to
 *   format" is not a sentence.
 */
export function contentFormatCopy(
  t: TFunction,
  id: ContentFormatId,
): { label: string; hint: string } {
  return {
    label: t(`formats.${id}.label` as const),
    hint: t(`formats.${id}.hint` as const),
  }
}

/**
 * The label alone, for a value that may be unknown or absent.
 *
 * Callers showing a format inside a sentence or a table cell want one string
 * and have nowhere to put a missing one, so the fallback is here rather than
 * repeated at each of them. An unrecognised id reads as unset, deliberately:
 * printing the raw slug would leak a database value into the interface.
 */
export function contentFormatLabel(
  t: TFunction,
  id: string | null | undefined,
): string {
  const format = contentFormat(id)
  return format ? contentFormatCopy(t, format.id).label : t('formats.none')
}
